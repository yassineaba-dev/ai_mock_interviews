import { NextRequest, NextResponse } from "next/server";
import { Vapi } from "@vapi-ai/server-sdk";

// Initialize server-side VAPI client
const vapiServer = new Vapi(process.env.VAPI_SERVER_TOKEN!);

export async function POST(req: NextRequest) {
  try {
    const { workflowId, variables } = await req.json();

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "workflowId is required" },
        { status: 400 }
      );
    }

    // Use the correct API method for server-side calls
    const call = await vapiServer.call.start({
      type: "workflow",
      workflow: {
        id: workflowId,
        variableValues: variables || {},
      },
    });

    return NextResponse.json({ success: true, call }, { status: 200 });
  } catch (error: any) {
    console.error("VAPI call error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
