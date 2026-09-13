import { create } from "zustand";
import { ExecutionStatus } from "../types";

interface ExecutionState {
  status: ExecutionStatus;
  exitCode: number | null;
  activeProvider: string | null;
  previewUrl: string | null;
  executionStartTime: number | null;
  executionDuration: number | null;

  // Computed / convenience
  isRunning: boolean;

  // Actions
  setStatus: (status: ExecutionStatus) => void;
  setExitCode: (exitCode: number | null) => void;
  setActiveProvider: (provider: string | null) => void;
  setPreviewUrl: (url: string | null) => void;
  startExecution: (provider: string) => void;
  finishExecution: (status: ExecutionStatus, exitCode?: number | null) => void;
  resetExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  status: "IDLE",
  exitCode: null,
  activeProvider: null,
  previewUrl: null,
  executionStartTime: null,
  executionDuration: null,
  isRunning: false,

  setStatus: (status) =>
    set({
      status,
      isRunning:
        status === "PREPARING" ||
        status === "COMPILING" ||
        status === "RUNNING",
    }),

  setExitCode: (exitCode) => set({ exitCode }),
  setActiveProvider: (activeProvider) => set({ activeProvider }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),

  startExecution: (provider) =>
    set({
      status: "PREPARING",
      isRunning: true,
      exitCode: null,
      activeProvider: provider,
      executionStartTime: Date.now(),
      executionDuration: null,
    }),

  finishExecution: (status, exitCode = null) => {
    const startTime = get().executionStartTime;
    const duration = startTime ? Date.now() - startTime : null;
    set({
      status,
      exitCode,
      isRunning: false,
      executionDuration: duration,
    });
  },

  resetExecution: () =>
    set({
      status: "IDLE",
      exitCode: null,
      isRunning: false,
      activeProvider: null,
      executionStartTime: null,
      executionDuration: null,
    }),
}));
