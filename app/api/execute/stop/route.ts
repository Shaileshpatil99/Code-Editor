import { NextRequest } from "next/server";
import { terminateProcess } from "@/lib/process-registry";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { runId } = await req.json();

    if (!runId) {
      return Response.json({ error: "runId required" }, { status: 400 });
    }

    const stopped = await terminateProcess(runId);
    return Response.json({ success: true, stopped }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error stopping process:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to stop process" },
      { status: 500 }
    );
  }
}
