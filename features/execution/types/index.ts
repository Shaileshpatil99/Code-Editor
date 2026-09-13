import { Templates } from "@/lib/generated/prisma";

export type ExecutionStatus =
  | "IDLE"
  | "PREPARING"
  | "COMPILING"
  | "RUNNING"
  | "EXITED"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIMEOUT"
  | "STOPPED"
  | "FAILED";

export interface ExecutionEvent {
  type: "status" | "stdout" | "stderr" | "exit" | "error";
  status?: ExecutionStatus;
  data?: string;
  exitCode?: number;
  error?: string;
  timestamp?: number;
}

export interface ExecutionContext {
  runId: string;
  playgroundId: string;
  template: Templates;
  files: Record<string, string>;
  sourceFiles: string[];
  activeFile?: string;
}

export interface IExecutionProvider {
  readonly id: string;
  readonly name: string;
  canHandle(template: Templates): boolean;
  run(
    context: ExecutionContext,
    onEvent: (event: ExecutionEvent) => void
  ): Promise<void>;
  sendInput(data: string): void;
  stop(): Promise<void>;
}
