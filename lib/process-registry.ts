import { ChildProcess, exec } from "child_process";
import fs from "fs/promises";

export interface ActiveProcess {
  runId: string;
  process: ChildProcess;
  tempDir: string;
  timeoutTimer?: NodeJS.Timeout;
}

const globalForRegistry = globalThis as unknown as {
  processRegistry: Map<string, ActiveProcess> | undefined;
};

export const activeProcesses =
  globalForRegistry.processRegistry ?? new Map<string, ActiveProcess>();

if (process.env.NODE_ENV !== "production") {
  globalForRegistry.processRegistry = activeProcesses;
}

/**
 * Cleanly kill a process tree on Windows using native taskkill
 */
export function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (!pid) {
      resolve();
      return;
    }
    
    if (process.platform === "win32") {
      // /T terminates specified process and any child processes started by it
      // /F forcefully terminates
      exec(`taskkill /pid ${pid} /T /F`, () => {
        resolve();
      });
    } else {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
      resolve();
    }
  });
}

/**
 * Register a running process and set a watchdog timeout
 */
export function registerProcess(
  runId: string,
  process: ChildProcess,
  tempDir: string,
  onTimeout?: () => void,
  timeoutMs: number = 15000
): void {
  const timeoutTimer = setTimeout(async () => {
    console.log(`[Watchdog] Execution timed out for runId: ${runId}`);
    onTimeout?.();
    if (process.pid) {
      await killProcessTree(process.pid);
    }
    await cleanupTempDir(tempDir);
    activeProcesses.delete(runId);
  }, timeoutMs);

  activeProcesses.set(runId, {
    runId,
    process,
    tempDir,
    timeoutTimer,
  });
}

/**
 * Get active process by runId
 */
export function getProcess(runId: string): ActiveProcess | undefined {
  return activeProcesses.get(runId);
}

/**
 * Safely cleans up temporary execution directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error cleaning up temp directory ${tempDir}:`, err);
  }
}

/**
 * Terminate a process and clean up resources
 */
export async function terminateProcess(runId: string): Promise<boolean> {
  const active = activeProcesses.get(runId);
  if (!active) return false;

  if (active.timeoutTimer) {
    clearTimeout(active.timeoutTimer);
  }

  if (active.process.pid) {
    await killProcessTree(active.process.pid);
  }

  await cleanupTempDir(active.tempDir);
  activeProcesses.delete(runId);
  return true;
}
