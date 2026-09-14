import { Templates } from "@/lib/generated/prisma";
import { TemplateFolder, OpenFile } from "@/features/playground/types";
import { IExecutionProvider, ExecutionEvent, ExecutionContext } from "../types";
import { useExecutionStore } from "../hooks/useExecutionStore";
import { createProjectSnapshot } from "../lib/snapshot";
import { CppExecutionProvider } from "./providers/cpp-provider";
import { CExecutionProvider } from "./providers/c-provider";
import { PythonExecutionProvider } from "./providers/python-provider";
import { JavaExecutionProvider } from "./providers/java-provider";
import { WebContainerProvider } from "./providers/webcontainer-provider";

export interface TerminalInterface {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  fit: () => void;
}

export class ExecutionManager {
  private providers: IExecutionProvider[];
  private activeProvider: IExecutionProvider | null = null;

  constructor() {
    this.providers = [
      new WebContainerProvider(),
      new CppExecutionProvider(),
      new CExecutionProvider(),
      new PythonExecutionProvider(),
      new JavaExecutionProvider(),
    ];
  }

  getProvider(template: Templates): IExecutionProvider | undefined {
    return this.providers.find((p) => p.canHandle(template));
  }

  async run(
    template: Templates,
    templateData: TemplateFolder | null,
    openFiles: OpenFile[],
    activeFileId: string | null,
    playgroundId: string,
    terminal: TerminalInterface | null
  ): Promise<void> {
    const store = useExecutionStore.getState();
    if (store.isRunning) {
      console.warn("Execution already in progress.");
      return;
    }

    const provider = this.getProvider(template);
    if (!provider) {
      terminal?.writeln(
        `\x1b[31mNo execution provider found for template: ${template}\x1b[0m`
      );
      store.setStatus("FAILED");
      return;
    }

    this.activeProvider = provider;
    store.startExecution(provider.id);

    // Create execution snapshot
    const snapshot = createProjectSnapshot(templateData, openFiles, activeFileId);
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const context: ExecutionContext = {
      runId,
      playgroundId,
      template,
      files: snapshot.files,
      sourceFiles: snapshot.sourceFiles,
      activeFile: snapshot.activeFilePath,
    };

    terminal?.writeln(
      `\x1b[90m[Snapshot created: ${Object.keys(snapshot.files).length} files, ${
        snapshot.sourceFiles.length
      } source files]\x1b[0m`
    );

    const onEvent = (event: ExecutionEvent) => {
      if (event.data && terminal) {
        terminal.write(event.data);
      }

      if (event.status) {
        store.setStatus(event.status);
      }

      if (event.type === "exit") {
        store.finishExecution(event.status || "EXITED", event.exitCode);
        this.activeProvider = null;
      } else if (event.type === "error") {
        store.finishExecution("FAILED");
        this.activeProvider = null;
      }
    };

    try {
      await provider.run(context, onEvent);
    } catch (err: unknown) {
      console.error("Execution manager run error:", err);
      terminal?.writeln(`\r\n\x1b[31m[Execution Failed: ${err instanceof Error ? err.message : String(err)}]\x1b[0m\r\n`);
      store.finishExecution("FAILED");
      this.activeProvider = null;
    }
  }

  sendInput(data: string): void {
    if (this.activeProvider) {
      this.activeProvider.sendInput(data);
    }
  }

  async executeShellCommand(
    template: Templates,
    command: string,
    terminal: TerminalInterface | null
  ): Promise<void> {
    const store = useExecutionStore.getState();
    const provider = this.getProvider(template);
    if (provider instanceof WebContainerProvider) {
      this.activeProvider = provider;
      store.setStatus("RUNNING");
      try {
        const exitCode = await provider.executeShellCommand(command, (data) => {
          terminal?.write(data);
        });
        store.finishExecution("EXITED", exitCode);
      } catch (e: unknown) {
        terminal?.writeln(`\r\n\x1b[31m[Shell error: ${e instanceof Error ? e.message : String(e)}]\x1b[0m\r\n`);
        store.finishExecution("FAILED");
      } finally {
        this.activeProvider = null;
        terminal?.write("\r\n\x1b[34m~/project\x1b[0m \x1b[90m$\x1b[0m ");
      }
    } else {
      terminal?.writeln(
        `\x1b[90m[Interactive shell is only available in WebContainer templates]\x1b[0m`
      );
    }
  }

  async stop(): Promise<void> {
    if (this.activeProvider) {
      await this.activeProvider.stop();
      this.activeProvider = null;
      useExecutionStore.getState().finishExecution("STOPPED");
    }
  }
}

// Export singleton instance
export const executionManager = new ExecutionManager();
