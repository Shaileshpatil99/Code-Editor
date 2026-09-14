import {
  IExecutionProvider,
  ExecutionContext,
  ExecutionEvent,
} from "../../types";
import { Templates } from "@/lib/generated/prisma";

export class CppExecutionProvider implements IExecutionProvider {
  readonly id = "cpp";
  readonly name = "C++ Local Engine (MinGW)";
  private currentRunId: string | null = null;
  private abortController: AbortController | null = null;

  canHandle(template: Templates): boolean {
    return template === "CPP";
  }

  async run(
    context: ExecutionContext,
    onEvent: (event: ExecutionEvent) => void
  ): Promise<void> {
    this.currentRunId = context.runId;
    this.abortController = new AbortController();

    try {
      const response = await fetch("/api/execute/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: context.runId,
          template: "CPP",
          files: context.files,
          sourceFiles: context.sourceFiles,
          activeFile: context.activeFile,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        onEvent({
          type: "stderr",
          data: `\r\n\x1b[31mFailed to start execution: ${response.statusText} (${errorText})\x1b[0m\r\n`,
        });
        onEvent({ type: "status", status: "FAILED" });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            try {
              const eventData: ExecutionEvent = JSON.parse(
                trimmed.slice(5).trim()
              );
              onEvent(eventData);
            } catch (err) {
              // Ignore malformed chunks
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        onEvent({
          type: "stdout",
          data: "\r\n\x1b[33m[Execution stopped by user]\x1b[0m\r\n",
        });
        onEvent({ type: "status", status: "STOPPED" });
      } else {
        onEvent({
          type: "stderr",
          data: `\r\n\x1b[31m[Connection error: ${err instanceof Error ? err.message : String(err)}]\x1b[0m\r\n`,
        });
        onEvent({ type: "status", status: "FAILED" });
      }
    } finally {
      this.currentRunId = null;
      this.abortController = null;
    }
  }

  sendInput(data: string): void {
    if (!this.currentRunId) return;

    fetch("/api/execute/stdin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: this.currentRunId,
        data,
      }),
    }).catch((err) => {
      console.error("Failed to send stdin to C++ process:", err);
    });
  }

  async stop(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.currentRunId) {
      const runId = this.currentRunId;
      this.currentRunId = null;
      try {
        await fetch("/api/execute/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId }),
        });
      } catch (err) {
        console.error("Error stopping C++ process:", err);
      }
    }
  }
}
