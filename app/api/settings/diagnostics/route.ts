import { NextResponse } from "next/server";
import { execFile } from "child_process";
import os from "os";

export const dynamic = "force-dynamic";

interface ToolCheckResult {
  name: string;
  command: string;
  available: boolean;
  version: string;
  error?: string;
}

function runDiagnostic(command: string, args: string[]): Promise<{ available: boolean; version: string; error?: string }> {
  return new Promise((resolve) => {
    // Only fixed predefined binary names and flags are permitted
    execFile(
      command,
      args,
      {
        timeout: 3000,
        windowsHide: true,
        shell: process.platform === "win32",
      },
      (error, stdout, stderr) => {
        if (error) {
          // Some tools like 'java -version' output version info to stderr
          const output = (stderr || stdout || "").trim();
          if (output && (output.includes("version") || output.includes("build"))) {
            const firstLine = output.split("\n")[0].trim();
            resolve({ available: true, version: firstLine });
            return;
          }
          resolve({
            available: false,
            version: "Not found",
            error: error.message.includes("ENOENT")
              ? "Executable not found in system PATH"
              : error.message.split("\n")[0],
          });
          return;
        }

        const rawOutput = (stdout || stderr || "").trim();
        const firstLine = rawOutput.split("\n")[0]?.trim() || "Available";
        resolve({ available: true, version: firstLine });
      }
    );
  });
}

export async function GET() {
  try {
    // Run fixed diagnostic tool checks in parallel
    const [gccRes, gppRes, pythonRes, javaRes, javacRes] = await Promise.all([
      runDiagnostic("gcc", ["--version"]),
      runDiagnostic("g++", ["--version"]),
      runDiagnostic("python", ["--version"]),
      runDiagnostic("java", ["-version"]),
      runDiagnostic("javac", ["-version"]),
    ]);

    const tools: Record<string, ToolCheckResult> = {
      gcc: {
        name: "C Compiler (MinGW GCC)",
        command: "gcc --version",
        ...gccRes,
      },
      gpp: {
        name: "C++ Compiler (MinGW G++)",
        command: "g++ --version",
        ...gppRes,
      },
      python: {
        name: "Python 3 Interpreter",
        command: "python --version",
        ...pythonRes,
      },
      java: {
        name: "Java Runtime Environment",
        command: "java -version",
        ...javaRes,
      },
      javac: {
        name: "Java Compiler (javac)",
        command: "javac -version",
        ...javacRes,
      },
    };

    return NextResponse.json({
      success: true,
      environment: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        nodeVersion: process.version,
      },
      tools,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Diagnostic check failed" },
      { status: 500 }
    );
  }
}
