import { NextRequest } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { auth } from "@/auth";
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
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
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

            // Filter C++ source files strictly (excluding .c files)
            let cppFiles = sourceFiles.filter((f) =>
              /\.(cpp|cc|cxx)$/i.test(f)
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

            const MAIN_FUNC_REGEX = /\b(int|void)\s+main\s*\(/;

            // Check if activeFile matches a C++ file in the project
            const normActive = activeFile ? activeFile.replace(/^\/+/, "").toLowerCase() : undefined;
            const activeCpp = normActive
              ? cppFiles.find((f) => {
                  const normF = f.replace(/^\/+/, "").toLowerCase();
                  return normF === normActive || normF.endsWith("/" + normActive) || normActive.endsWith("/" + normF);
                })
              : undefined;

            if (activeCpp) {
              // The user is currently viewing activeCpp: prioritize compiling and running it!
              // Exclude other files that define main() to avoid multiple definition linker errors
              const activeHasMain = MAIN_FUNC_REGEX.test(files[activeCpp] || "");
              if (activeHasMain) {
                cppFiles = cppFiles.filter(
                  (f) => f === activeCpp || !MAIN_FUNC_REGEX.test(files[f] || "")
                );
              } else {
                const mainFile =
                  cppFiles.find((f) => f.toLowerCase().endsWith("main.cpp") && MAIN_FUNC_REGEX.test(files[f] || "")) ||
                  cppFiles.find((f) => MAIN_FUNC_REGEX.test(files[f] || ""));
                cppFiles = cppFiles.filter(
                  (f) => f === activeCpp || f === mainFile || !MAIN_FUNC_REGEX.test(files[f] || "")
                );
              }
            } else {
              // No active C++ file opened: fallback to main.cpp or the first file with main()
              const filesWithMain = cppFiles.filter((f) =>
                MAIN_FUNC_REGEX.test(files[f] || "")
              );
              if (filesWithMain.length > 1) {
                const defaultMain =
                  cppFiles.find((f) => f.toLowerCase().endsWith("main.cpp")) ||
                  filesWithMain[0];
                cppFiles = cppFiles.filter(
                  (f) => f === defaultMain || !MAIN_FUNC_REGEX.test(files[f] || "")
                );
              }
            }

            const exeName = process.platform === "win32" ? "main.exe" : "main";
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

            if (mainClass && !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(mainClass)) {
              return new Response(JSON.stringify({ error: "Invalid class name" }), { status: 400, headers: { "Content-Type": "application/json" } });
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

            // Filter C source files strictly
            let cFiles = sourceFiles.filter((f) => /\.c$/i.test(f));

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

            const MAIN_FUNC_REGEX = /\b(int|void)\s+main\s*\(/;

            // Check if activeFile matches a C file in the project
            const normActive = activeFile ? activeFile.replace(/^\/+/, "").toLowerCase() : undefined;
            const activeC = normActive
              ? cFiles.find((f) => {
                  const normF = f.replace(/^\/+/, "").toLowerCase();
                  return normF === normActive || normF.endsWith("/" + normActive) || normActive.endsWith("/" + normF);
                })
              : undefined;

            if (activeC) {
              // The user is currently viewing activeC: prioritize compiling and running it!
              const activeHasMain = MAIN_FUNC_REGEX.test(files[activeC] || "");
              if (activeHasMain) {
                cFiles = cFiles.filter(
                  (f) => f === activeC || !MAIN_FUNC_REGEX.test(files[f] || "")
                );
              } else {
                const mainFile =
                  cFiles.find((f) => f.toLowerCase().endsWith("main.c") && MAIN_FUNC_REGEX.test(files[f] || "")) ||
                  cFiles.find((f) => MAIN_FUNC_REGEX.test(files[f] || ""));
                cFiles = cFiles.filter(
                  (f) => f === activeC || f === mainFile || !MAIN_FUNC_REGEX.test(files[f] || "")
                );
              }
            } else {
              // No active C file opened: fallback to main.c or the first file with main()
              const filesWithMain = cFiles.filter((f) =>
                MAIN_FUNC_REGEX.test(files[f] || "")
              );
              if (filesWithMain.length > 1) {
                const defaultMain =
                  cFiles.find((f) => f.toLowerCase().endsWith("main.c")) ||
                  filesWithMain[0];
                cFiles = cFiles.filter(
                  (f) => f === defaultMain || !MAIN_FUNC_REGEX.test(files[f] || "")
                );
              }
            }

            const exeName = process.platform === "win32" ? "main.exe" : "main";
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

            const normActive = activeFile ? activeFile.replace(/^\/+/, "").toLowerCase() : undefined;
            const activePy = normActive
              ? pyFiles.find((f) => {
                  const normF = f.replace(/^\/+/, "").toLowerCase();
                  return normF === normActive || normF.endsWith("/" + normActive) || normActive.endsWith("/" + normF);
                })
              : undefined;

            if (activePy && files[activePy] !== undefined) {
              pyFile = activePy;
            } else if (activeFile && /\.py$/i.test(activeFile) && files[activeFile] !== undefined) {
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
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          sendEvent({
            type: "stderr",
            data: `\r\n\x1b[31m[Internal runner error: ${errorMessage}]\x1b[0m\r\n`,
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
  } catch (error: unknown) {
    console.error("Execution runner error:", error);
    const errorMessage = error instanceof Error ? error.message : "Execution failed";
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
