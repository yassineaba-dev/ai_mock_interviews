import { NextRequest, NextResponse } from "next/server";
import { vapi } from "@/lib/vapi.sdk";

export async function POST(req: NextRequest) {
  try {
    const { workflowId, variables } = await req.json();

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "workflowId is required" },
        { status: 400 }
      );
    }

    const call = await vapi.start(workflowId, {
      variableValues: variables || {},
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
