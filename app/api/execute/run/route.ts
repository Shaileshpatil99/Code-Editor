import { NextRequest } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  registerProcess,
  cleanupTempDir,
  activeProcesses,
} from "@/lib/process-registry";

export const dynamic = "force-dynamic";

interface ExecuteRequestBody {
  runId: string;
  template: "CPP" | "JAVA" | "C" | "PYTHON";
  files: Record<string, string>;
  sourceFiles: string[];
  mainClass?: string;
  activeFile?: string;
}

// Sanitize relative path to prevent directory traversal
function isSafePath(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return !normalized.startsWith("..") && !path.isAbsolute(normalized);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExecuteRequestBody;
    const { runId, template, files, sourceFiles, mainClass, activeFile } = body;

    if (!runId || !template || !files || !sourceFiles) {
      return Response.json(
        { error: "Missing required execution parameters" },
        { status: 400 }
      );
    }

    // Create unique temp execution directory
    const tempDir = path.join(os.tmpdir(), "code-editor-runs", runId);
    await fs.mkdir(tempDir, { recursive: true });

    // Write all project files to disk respecting folder hierarchy
    for (const [relativePath, content] of Object.entries(files)) {
      if (!isSafePath(relativePath)) {
        await cleanupTempDir(tempDir);
        return Response.json(
          { error: `Unsafe file path detected: ${relativePath}` },
          { status: 400 }
        );
      }
      const fullPath = path.join(tempDir, relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content || "", "utf8");
    }

    // Prepare Server-Sent Events stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const sendEvent = (data: Record<string, unknown>) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch (e) {
            isClosed = true;
          }
        };

        const closeStream = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch (e) {}
        };

        let outputBytes = 0;
        const MAX_OUTPUT_BYTES = 1024 * 1024; // 1MB limit

        const handleProcessOutput = (data: Buffer, isStderr: boolean) => {
          const text = data.toString();
          outputBytes += data.length;

          if (outputBytes > MAX_OUTPUT_BYTES) {
            sendEvent({
              type: "stderr",
              data: "\r\n\x1b[31;1m[Output limit exceeded (1MB). Process stopped]\x1b[0m\r\n",
            });
            sendEvent({ type: "status", status: "FAILED" });
            const proc = activeProcesses.get(runId);
            if (proc) {
              proc.process.kill();
            }
            return;
          }

          sendEvent({
            type: isStderr ? "stderr" : "stdout",
            data: text,
          });
        };

        try {
          if (template === "CPP") {
            sendEvent({ type: "status", status: "COMPILING" });
            sendEvent({
              type: "stdout",
              data: "\x1b[36m[Compiling C++ project with MinGW g++...]\x1b[0m\r\n",
            });

            // Filter C++ source files
            const cppFiles = sourceFiles.filter((f) =>
              /\.(cpp|cc|cxx|c)$/i.test(f)
            );

            if (cppFiles.length === 0) {
              sendEvent({
                type: "stderr",
                data: "\x1b[31mError: No .cpp source files found to compile.\x1b[0m\r\n",
              });
              sendEvent({ type: "status", status: "COMPILE_ERROR", exitCode: 1 });
              await cleanupTempDir(tempDir);
              closeStream();
              return;
            }

            const exeName = "main.exe";
            const compileArgs = [
              "-std=c++14",
              "-O2",
              "-Wall",
              ...cppFiles,
              "-o",
              exeName,
            ];

            const compileProcess = spawn("g++", compileArgs, {
              cwd: tempDir,
              shell: false,
            });

            let compileErrorOutput = "";

            compileProcess.stderr.on("data", (data) => {
              compileErrorOutput += data.toString();
            });

            compileProcess.stdout.on("data", (data) => {
              compileErrorOutput += data.toString();
            });

            compileProcess.on("close", async (compileCode) => {
              if (compileCode !== 0) {
                sendEvent({
                  type: "stderr",
                  data: `\r\n\x1b[31;1m[Compilation Failed with code ${compileCode}]\x1b[0m\r\n${compileErrorOutput}\r\n`,
                });
                sendEvent({
                  type: "status",
                  status: "COMPILE_ERROR",
                  exitCode: compileCode ?? 1,
                });
                await cleanupTempDir(tempDir);
                closeStream();
                return;
              }

              sendEvent({
                type: "stdout",
                data: "\x1b[32m[Compilation successful. Executing...]\x1b[0m\r\n\r\n",
              });
              sendEvent({ type: "status", status: "RUNNING" });

              const exePath = path.join(tempDir, exeName);
              const runProcess = spawn(exePath, [], {
                cwd: tempDir,
                stdio: ["pipe", "pipe", "pipe"],
              });

              let isTimedOut = false;
              registerProcess(
                runId,
                runProcess,
                tempDir,
                () => {
                  isTimedOut = true;
                  sendEvent({
                    type: "stderr",
                    data: "\r\n\x1b[33;1m[Execution timed out after 15 seconds]\x1b[0m\r\n",
                  });
                  sendEvent({ type: "status", status: "TIMEOUT" });
                  sendEvent({ type: "exit", exitCode: 124, status: "TIMEOUT" });
                  closeStream();
                },
                15000
              );

              runProcess.stdout.on("data", (d) => handleProcessOutput(d, false));
              runProcess.stderr.on("data", (d) => handleProcessOutput(d, true));

              runProcess.on("close", async (exitCode) => {
                if (isTimedOut) return;
                const proc = activeProcesses.get(runId);
                if (proc?.timeoutTimer) {
                  clearTimeout(proc.timeoutTimer);
                }
                activeProcesses.delete(runId);
                await cleanupTempDir(tempDir);

                sendEvent({
                  type: "stdout",
                  data: `\r\n\x1b[90m--------------------------------\x1b[0m\r\n\x1b[32m[Process exited with code ${
                    exitCode ?? 0
                  }]\x1b[0m\r\n`,
                });
                sendEvent({
                  type: "exit",
                  exitCode: exitCode ?? 0,
                  status: "EXITED",
                });
                closeStream();
              });

              runProcess.on("error", async (err) => {
                sendEvent({
                  type: "stderr",
                  data: `\r\n\x1b[31m[Execution error: ${err.message}]\x1b[0m\r\n`,
                });
                sendEvent({ type: "status", status: "RUNTIME_ERROR" });
                activeProcesses.delete(runId);
                await cleanupTempDir(tempDir);
                closeStream();
              });
            });

            compileProcess.on("error", async (err) => {
              sendEvent({
                type: "stderr",
                data: `\x1b[31m[Compiler error: Could not invoke 'g++'. Make sure MinGW/GCC is installed and in PATH. (${err.message})]\x1b[0m\r\n`,
              });
              sendEvent({ type: "status", status: "FAILED" });
              await cleanupTempDir(tempDir);
              closeStream();
            });
          } else if (template === "JAVA") {
            sendEvent({ type: "status", status: "COMPILING" });
            sendEvent({
              type: "stdout",
              data: "\x1b[36m[Compiling Java project with JDK javac...]\x1b[0m\r\n",
            });

            const javaFiles = sourceFiles.filter((f) => f.endsWith(".java"));

            if (javaFiles.length === 0) {
              sendEvent({
                type: "stderr",
                data: "\x1b[31mError: No .java source files found to compile.\x1b[0m\r\n",
              });
              sendEvent({ type: "status", status: "COMPILE_ERROR", exitCode: 1 });
              await cleanupTempDir(tempDir);
              closeStream();
              return;
            }

            if (!mainClass) {
              sendEvent({
                type: "stderr",
                data: "\x1b[31mError: No runnable main class found. Please define 'public static void main(String[] args)' in your Java code.\x1b[0m\r\n",
              });
              sendEvent({ type: "status", status: "COMPILE_ERROR", exitCode: 1 });
              await cleanupTempDir(tempDir);
              closeStream();
              return;
            }

            const binDir = path.join(tempDir, "bin");
            await fs.mkdir(binDir, { recursive: true });

            const compileArgs = ["-d", binDir, ...javaFiles];
            const compileProcess = spawn("javac", compileArgs, {
              cwd: tempDir,
              shell: false,
            });

            let compileErrorOutput = "";

            compileProcess.stderr.on("data", (data) => {
              compileErrorOutput += data.toString();
            });

            compileProcess.stdout.on("data", (data) => {
              compileErrorOutput += data.toString();
            });

            compileProcess.on("close", async (compileCode) => {
              if (compileCode !== 0) {
                sendEvent({
                  type: "stderr",
                  data: `\r\n\x1b[31;1m[Compilation Failed with code ${compileCode}]\x1b[0m\r\n${compileErrorOutput}\r\n`,
                });
                sendEvent({
                  type: "status",
                  status: "COMPILE_ERROR",
                  exitCode: compileCode ?? 1,
                });
                await cleanupTempDir(tempDir);
                closeStream();
                return;
              }

              sendEvent({
                type: "stdout",
                data: `\x1b[32m[Compilation successful. Running class ${mainClass}...]\x1b[0m\r\n\r\n`,
              });
              sendEvent({ type: "status", status: "RUNNING" });

              const runProcess = spawn("java", ["-cp", binDir, mainClass], {
                cwd: tempDir,
                stdio: ["pipe", "pipe", "pipe"],
              });

              let isTimedOut = false;
              registerProcess(
                runId,
                runProcess,
                tempDir,
                () => {
                  isTimedOut = true;
                  sendEvent({
                    type: "stderr",
                    data: "\r\n\x1b[33;1m[Execution timed out after 15 seconds]\x1b[0m\r\n",
                  });
                  sendEvent({ type: "status", status: "TIMEOUT" });
                  sendEvent({ type: "exit", exitCode: 124, status: "TIMEOUT" });
                  closeStream();
                },
                15000
              );

              runProcess.stdout.on("data", (d) => handleProcessOutput(d, false));
              runProcess.stderr.on("data", (d) => handleProcessOutput(d, true));

              runProcess.on("close", async (exitCode) => {
                if (isTimedOut) return;
                const proc = activeProcesses.get(runId);
                if (proc?.timeoutTimer) {
                  clearTimeout(proc.timeoutTimer);
                }
                activeProcesses.delete(runId);
                await cleanupTempDir(tempDir);

                sendEvent({
                  type: "stdout",
                  data: `\r\n\x1b[90m--------------------------------\x1b[0m\r\n\x1b[32m[Process exited with code ${
                    exitCode ?? 0
                  }]\x1b[0m\r\n`,
                });
                sendEvent({
                  type: "exit",
                  exitCode: exitCode ?? 0,
                  status: "EXITED",
                });
                closeStream();
              });

              runProcess.on("error", async (err) => {
                sendEvent({
                  type: "stderr",
                  data: `\r\n\x1b[31m[Execution error: ${err.message}]\x1b[0m\r\n`,
                });
                sendEvent({ type: "status", status: "RUNTIME_ERROR" });
                activeProcesses.delete(runId);
                await cleanupTempDir(tempDir);
                closeStream();
              });
            });

            compileProcess.on("error", async (err) => {
              sendEvent({
                type: "stderr",
                data: `\x1b[31m[Compiler error: Could not invoke 'javac'. Make sure JDK is installed and in PATH. (${err.message})]\x1b[0m\r\n`,
              });
              sendEvent({ type: "status", status: "FAILED" });
              await cleanupTempDir(tempDir);
              closeStream();
            });
          } else if (template === "C") {
            sendEvent({ type: "status", status: "COMPILING" });
            sendEvent({
              type: "stdout",
              data: "\x1b[36m[Compiling C project with MinGW gcc...]\x1b[0m\r\n",
            });

            // Filter C source files
            const cFiles = sourceFiles.filter((f) => /\.(c)$/i.test(f));

            if (cFiles.length === 0) {
              sendEvent({
                type: "stderr",
                data: "\x1b[31mError: No .c source files found to compile.\x1b[0m\r\n",
              });
              sendEvent({ type: "status", status: "COMPILE_ERROR", exitCode: 1 });
              await cleanupTempDir(tempDir);
              closeStream();
              return;
            }

            const exeName = "main.exe";
            const compileArgs = [
              "-std=c11",
              "-O2",
              "-Wall",
              ...cFiles,
              "-o",
              exeName,
            ];

            const compileProcess = spawn("gcc", compileArgs, {
              cwd: tempDir,
              shell: false,
            });

            let compileErrorOutput = "";

            compileProcess.stderr.on("data", (data) => {
              compileErrorOutput += data.toString();
            });

            compileProcess.stdout.on("data", (data) => {
              compileErrorOutput += data.toString();
            });

            compileProcess.on("close", async (compileCode) => {
              if (compileCode !== 0) {
                sendEvent({
                  type: "stderr",
                  data: `\r\n\x1b[31;1m[Compilation Failed with code ${compileCode}]\x1b[0m\r\n${compileErrorOutput}\r\n`,
                });
                sendEvent({
                  type: "status",
                  status: "COMPILE_ERROR",
                  exitCode: compileCode ?? 1,
                });
                await cleanupTempDir(tempDir);
                closeStream();
                return;
              }

              sendEvent({
                type: "stdout",
                data: "\x1b[32m[Compilation successful. Executing...]\x1b[0m\r\n\r\n",
              });
              sendEvent({ type: "status", status: "RUNNING" });

              const exePath = path.join(tempDir, exeName);
              const runProcess = spawn(exePath, [], {
                cwd: tempDir,
                stdio: ["pipe", "pipe", "pipe"],
              });

              let isTimedOut = false;
              registerProcess(
                runId,
                runProcess,
                tempDir,
                () => {
                  isTimedOut = true;
                  sendEvent({
                    type: "stderr",
                    data: "\r\n\x1b[33;1m[Execution timed out after 15 seconds]\x1b[0m\r\n",
                  });
                  sendEvent({ type: "status", status: "TIMEOUT" });
                  sendEvent({ type: "exit", exitCode: 124, status: "TIMEOUT" });
                  closeStream();
                },
                15000
              );

              runProcess.stdout.on("data", (d) => handleProcessOutput(d, false));
              runProcess.stderr.on("data", (d) => handleProcessOutput(d, true));

              runProcess.on("close", async (exitCode) => {
                if (isTimedOut) return;
                const proc = activeProcesses.get(runId);
                if (proc?.timeoutTimer) {
                  clearTimeout(proc.timeoutTimer);
                }
                activeProcesses.delete(runId);
                await cleanupTempDir(tempDir);

                sendEvent({
                  type: "stdout",
                  data: `\r\n\x1b[90m--------------------------------\x1b[0m\r\n\x1b[32m[Process exited with code ${
                    exitCode ?? 0
                  }]\x1b[0m\r\n`,
                });
                sendEvent({
                  type: "exit",
                  exitCode: exitCode ?? 0,
                  status: "EXITED",
                });
                closeStream();
              });

              runProcess.on("error", async (err) => {
                sendEvent({
                  type: "stderr",
                  data: `\r\n\x1b[31m[Execution error: ${err.message}]\x1b[0m\r\n`,
                });
                sendEvent({ type: "status", status: "RUNTIME_ERROR" });
                activeProcesses.delete(runId);
                await cleanupTempDir(tempDir);
                closeStream();
              });
            });

            compileProcess.on("error", async (err) => {
              sendEvent({
                type: "stderr",
                data: `\x1b[31m[Compiler error: Could not invoke 'gcc'. Make sure MinGW/GCC is installed and in PATH. (${err.message})]\x1b[0m\r\n`,
              });
              sendEvent({ type: "status", status: "FAILED" });
              await cleanupTempDir(tempDir);
              closeStream();
            });
          } else if (template === "PYTHON") {
            sendEvent({ type: "status", status: "RUNNING" });
            sendEvent({
              type: "stdout",
              data: "\x1b[36m[Executing Python script...]\x1b[0m\r\n\r\n",
            });

            // Determine entrypoint file
            let pyFile = "main.py";
            const pyFiles = sourceFiles.filter((f) => /\.py$/i.test(f));

            if (activeFile && /\.py$/i.test(activeFile) && files[activeFile] !== undefined) {
              pyFile = activeFile;
            } else if (files["main.py"] !== undefined) {
              pyFile = "main.py";
            } else if (pyFiles.length > 0) {
              pyFile = pyFiles[0];
            } else {
              sendEvent({
                type: "stderr",
                data: "\x1b[31mError: No Python source file (.py) found to execute.\x1b[0m\r\n",
              });
              sendEvent({ type: "status", status: "FAILED", exitCode: 1 });
              await cleanupTempDir(tempDir);
              closeStream();
              return;
            }

            const runProcess = spawn("python", ["-u", pyFile], {
              cwd: tempDir,
              stdio: ["pipe", "pipe", "pipe"],
            });

            let isTimedOut = false;
            registerProcess(
              runId,
              runProcess,
              tempDir,
              () => {
                isTimedOut = true;
                sendEvent({
                  type: "stderr",
                  data: "\r\n\x1b[33;1m[Execution timed out after 15 seconds]\x1b[0m\r\n",
                });
                sendEvent({ type: "status", status: "TIMEOUT" });
                sendEvent({ type: "exit", exitCode: 124, status: "TIMEOUT" });
                closeStream();
              },
              15000
            );

            runProcess.stdout.on("data", (d) => handleProcessOutput(d, false));
            runProcess.stderr.on("data", (d) => handleProcessOutput(d, true));

            runProcess.on("close", async (exitCode) => {
              if (isTimedOut) return;
              const proc = activeProcesses.get(runId);
              if (proc?.timeoutTimer) {
                clearTimeout(proc.timeoutTimer);
              }
              activeProcesses.delete(runId);
              await cleanupTempDir(tempDir);

              sendEvent({
                type: "stdout",
                data: `\r\n\x1b[90m--------------------------------\x1b[0m\r\n\x1b[32m[Process exited with code ${
                  exitCode ?? 0
                }]\x1b[0m\r\n`,
              });
              sendEvent({
                type: "exit",
                exitCode: exitCode ?? 0,
                status: "EXITED",
              });
              closeStream();
            });

            runProcess.on("error", async (err) => {
              sendEvent({
                type: "stderr",
                data: `\r\n\x1b[31m[Interpreter error: Could not invoke 'python'. Make sure Python is installed and in PATH. (${err.message})]\x1b[0m\r\n`,
              });
              sendEvent({ type: "status", status: "FAILED" });
              activeProcesses.delete(runId);
              await cleanupTempDir(tempDir);
              closeStream();
            });
          } else {
            sendEvent({
              type: "stderr",
              data: `\x1b[31mUnsupported template for local native runner: ${template}\x1b[0m\r\n`,
            });
            sendEvent({ type: "status", status: "FAILED" });
            await cleanupTempDir(tempDir);
            closeStream();
          }
        } catch (err: any) {
          sendEvent({
            type: "stderr",
            data: `\r\n\x1b[31m[Internal runner error: ${err?.message}]\x1b[0m\r\n`,
          });
          sendEvent({ type: "status", status: "FAILED" });
          await cleanupTempDir(tempDir);
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Execution runner error:", error);
    return Response.json(
      { error: error?.message || "Execution failed" },
      { status: 500 }
    );
  }
}
