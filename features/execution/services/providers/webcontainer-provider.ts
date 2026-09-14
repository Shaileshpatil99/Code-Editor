import {
  IExecutionProvider,
  ExecutionContext,
  ExecutionEvent,
} from "../../types";
import { Templates } from "@/lib/generated/prisma";
import { WebContainer, FileSystemTree, WebContainerProcess } from "@webcontainer/api";
import { useExecutionStore } from "../../hooks/useExecutionStore";

let webcontainerSingleton: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerSingleton) {
    return webcontainerSingleton;
  }
  if (bootPromise) {
    return bootPromise;
  }

  // Ensure window is cross-origin isolated before attempting boot
  if (typeof window !== "undefined" && !window.crossOriginIsolated) {
    throw new Error(
      "Browser cross-origin isolation is not active (window.crossOriginIsolated === false). Please reload the page (F5) to enable WebContainer execution."
    );
  }

  bootPromise = WebContainer.boot({ coep: "credentialless" })
    .then((instance) => {
      webcontainerSingleton = instance;
      return instance;
    })
    .catch((err) => {
      bootPromise = null; // Reset so retry is possible
      throw err;
    });

  return bootPromise;
}

// Convert flat dictionary into WebContainer FileSystemTree
function buildFileSystemTree(files: Record<string, string>): FileSystemTree {
  const root: FileSystemTree = {};

  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        current[part] = {
          file: {
            contents: content,
          },
        };
      } else {
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }
        current = (current[part] as { directory: FileSystemTree }).directory;
      }
    }
  }

  return root;
}

export class WebContainerProvider implements IExecutionProvider {
  readonly id = "webcontainer";
  readonly name = "WebContainer (Browser Node/NPM)";
  private activeProcess: WebContainerProcess | null = null;
  private inputWriter: WritableStreamDefaultWriter<string> | null = null;
  private serverReadyTeardown: (() => void) | null = null;

  canHandle(template: Templates): boolean {
    return [
      "REACT",
      "NEXTJS",
      "EXPRESS",
      "VUE",
      "HONO",
      "ANGULAR",
    ].includes(template);
  }

  async run(
    context: ExecutionContext,
    onEvent: (event: ExecutionEvent) => void
  ): Promise<void> {
    try {
      onEvent({ type: "status", status: "PREPARING" });

      const instance = await getWebContainer();

      // Listen for local server ready to set iframe preview URL
      if (this.serverReadyTeardown) {
        this.serverReadyTeardown();
      }
      this.serverReadyTeardown = instance.on("server-ready", (port, url) => {
        onEvent({
          type: "stdout",
          data: `\r\n\x1b[32;1m[Web server ready on port ${port}: ${url}]\x1b[0m\r\n`,
        });
        useExecutionStore.getState().setPreviewUrl(url);
      });

      onEvent({
        type: "stdout",
        data: "\x1b[36m[Mounting project files into WebContainer...]\x1b[0m\r\n",
      });

      const fileSystemTree = buildFileSystemTree(context.files);
      await instance.mount(fileSystemTree);

      // Check if package.json exists to run npm install
      if (context.files["package.json"]) {
        let pkg: { scripts?: Record<string, string> } = {};
        try {
          pkg = JSON.parse(context.files["package.json"]);
        } catch {
          // ignore JSON parse error
        }

        onEvent({
          type: "stdout",
          data: "\x1b[36m[Running 'npm install'...]\x1b[0m\r\n",
        });

        const installProcess = await instance.spawn("npm", ["install"]);
        this.activeProcess = installProcess;
        installProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              onEvent({ type: "stdout", data: chunk });
            },
          })
        );

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          onEvent({
            type: "stderr",
            data: `\r\n\x1b[31;1m[npm install failed with exit code ${installExitCode}]\x1b[0m\r\n`,
          });
          onEvent({
            type: "status",
            status: "FAILED",
            exitCode: installExitCode,
          });
          return;
        }

        // Determine run command (dev, start, or custom)
        const scripts = pkg.scripts || {};
        let runCommand = ["run", "dev"];

        if (scripts.dev) {
          runCommand = ["run", "dev"];
        } else if (scripts.start) {
          runCommand = ["run", "start"];
        }

        onEvent({
          type: "stdout",
          data: `\r\n\x1b[32m[Starting development server: npm ${runCommand.join(
            " "
          )}...]\x1b[0m\r\n\r\n`,
        });
        onEvent({ type: "status", status: "RUNNING" });

        this.activeProcess = await instance.spawn("npm", runCommand);
        this.inputWriter = this.activeProcess.input.getWriter();

        this.activeProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              onEvent({ type: "stdout", data: chunk });
            },
          })
        );

        const runExitCode = await this.activeProcess.exit;
        onEvent({
          type: "stdout",
          data: `\r\n\x1b[32m[Web process exited with code ${runExitCode}]\x1b[0m\r\n`,
        });
        onEvent({
          type: "exit",
          exitCode: runExitCode,
          status: "EXITED",
        });
      } else {
        // Fallback: check for index.js
        if (context.files["index.js"] || context.files["main.js"]) {
          const entry = context.files["index.js"] ? "index.js" : "main.js";
          onEvent({
            type: "stdout",
            data: `\x1b[32m[Executing node ${entry}...]\x1b[0m\r\n\r\n`,
          });
          onEvent({ type: "status", status: "RUNNING" });

          this.activeProcess = await instance.spawn("node", [entry]);
          this.inputWriter = this.activeProcess.input.getWriter();

          this.activeProcess.output.pipeTo(
            new WritableStream({
              write(chunk) {
                onEvent({ type: "stdout", data: chunk });
              },
            })
          );

          const exitCode = await this.activeProcess.exit;
          onEvent({
            type: "exit",
            exitCode,
            status: "EXITED",
          });
        } else {
          onEvent({
            type: "stderr",
            data: "\x1b[31mNo package.json or index.js found to execute.\x1b[0m\r\n",
          });
          onEvent({ type: "status", status: "FAILED" });
        }
      }
    } catch (err: unknown) {
      console.error("WebContainer execution error:", err);
      onEvent({
        type: "stderr",
        data: `\r\n\x1b[31m[WebContainer Error: ${err instanceof Error ? err.message : String(err)}]\x1b[0m\r\n`,
      });
      onEvent({ type: "status", status: "FAILED" });
    } finally {
      this.activeProcess = null;
      this.inputWriter = null;
    }
  }

  sendInput(data: string): void {
    if (this.inputWriter) {
      this.inputWriter.write(data).catch((e) => {
        console.error("Failed to write to WebContainer input:", e);
      });
    }
  }

  async executeShellCommand(
    commandLine: string,
    onOutput: (data: string) => void
  ): Promise<number> {
    try {
      const instance = await getWebContainer();
      const parts = commandLine.trim().split(/\s+/);
      if (parts.length === 0 || !parts[0]) return 0;

      const cmd = parts[0];
      const args = parts.slice(1);

      this.activeProcess = await instance.spawn(cmd, args);
      this.inputWriter = this.activeProcess.input.getWriter();

      this.activeProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            onOutput(chunk);
          },
        })
      );

      const exitCode = await this.activeProcess.exit;
      return exitCode;
    } catch (err: unknown) {
      onOutput(`\r\n\x1b[31m[Command error: ${err instanceof Error ? err.message : String(err)}]\x1b[0m\r\n`);
      return 1;
    } finally {
      this.activeProcess = null;
      this.inputWriter = null;
    }
  }

  async stop(): Promise<void> {
    if (this.activeProcess) {
      try {
        this.activeProcess.kill();
      } catch (e) {
        console.error("Error killing WebContainer process:", e);
      }
      this.activeProcess = null;
      this.inputWriter = null;
    }
  }
}
