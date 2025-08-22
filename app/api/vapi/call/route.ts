import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { workflowId, variables } = await req.json();

    if (!workflowId) {
      return NextResponse.json({ success: false, error: "workflowId is required" }, { status: 400 });
    }

    const serverToken = process.env.VAPI_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json({ success: false, error: "VAPI_SERVER_TOKEN is missing" }, { status: 500 });
    }

    // Try to use the official server SDK via dynamic import to avoid build-time ctor issues
    try {
      const mod = await import("@vapi-ai/server-sdk");
      // SDK might export default or named. handle both.
      const VapiCtor = (mod && (mod.default ?? mod.Vapi ?? mod)) as any;

      // if the import isn't a constructor, fall through to HTTP fallback below
      if (typeof VapiCtor === "function") {
        const vapi = new VapiCtor({ apiKey: serverToken });

        // try common server-sdk call surface - adjust if your SDK docs differ
        // many SDKs expose something like vapi.calls.create(...) or vapi.call.start(...)
        // try a couple of likely method names safely:
        let callResult: any;
        if (vapi.calls && typeof vapi.calls.create === "function") {
          callResult = await vapi.calls.create({
            type: "workflow",
            workflow: { id: workflowId, variableValues: variables || {} },
          });
        } else if (vapi.call && typeof vapi.call.start === "function") {
          callResult = await vapi.call.start({
            type: "workflow",
            workflow: { id: workflowId, variableValues: variables || {} },
          });
        } else {
          // SDK shape not recognized — throw to be handled by fallback
          throw new Error("SDK loaded but call method not found");
        }

        return NextResponse.json({ success: true, call: callResult }, { status: 200 });
      }
      // otherwise fall down to HTTP fallback
    } catch (sdkErr) {
      console.warn("VAPI server-sdk import/call failed — falling back to raw HTTP. Reason:", sdkErr?.message ?? sdkErr);
    }

    // Fallback: call the VAPI HTTP endpoint directly
    const apiRes = await fetch("https://api.vapi.ai/call/web", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverToken}`,
      },
      body: JSON.stringify({
        workflowId,
        input: { variableValues: variables || {} },
      }),
    });

    const text = await apiRes.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (!apiRes.ok) {
      return NextResponse.json({ success: false, error: parsed }, { status: apiRes.status });
    }

    return NextResponse.json({ success: true, call: parsed }, { status: 200 });
  } catch (error: any) {
    console.error("VAPI route error:", error);
    return NextResponse.json({ success: false, error: error?.message ?? String(error) }, { status: 500 });
  }
}
