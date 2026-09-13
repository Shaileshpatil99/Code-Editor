import { NextRequest } from "next/server";
import { terminateProcess } from "@/lib/process-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json();

    if (!runId) {
      return Response.json({ error: "runId required" }, { status: 400 });
    }

    const stopped = await terminateProcess(runId);
    return Response.json({ success: true, stopped }, { status: 200 });
  } catch (error: any) {
    console.error("Error stopping process:", error);
    return Response.json(
      { error: error?.message || "Failed to stop process" },
      { status: 500 }
    );
  }
}
