import { NextRequest } from "next/server";
import { getProcess } from "@/lib/process-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { runId, data } = await req.json();

    if (!runId || typeof data !== "string") {
      return Response.json(
        { error: "runId and data string required" },
        { status: 400 }
      );
    }

    const active = getProcess(runId);
    if (!active || !active.process || active.process.killed) {
      return Response.json(
        { error: "Process is not running" },
        { status: 404 }
      );
    }

    if (active.process.stdin && active.process.stdin.writable) {
      active.process.stdin.write(data);
      return Response.json({ success: true }, { status: 200 });
    } else {
      return Response.json(
        { error: "Process stdin is not writable" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error writing to process stdin:", error);
    return Response.json(
      { error: error?.message || "Failed to write stdin" },
      { status: 500 }
    );
  }
}
