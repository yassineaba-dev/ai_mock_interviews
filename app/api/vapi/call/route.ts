// app/api/vapi/call/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workflowId = body?.workflowId;
    const variables = body?.variables ?? {};

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "workflowId is required" },
        { status: 400 }
      );
    }

    const serverToken = process.env.VAPI_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { success: false, error: "VAPI_SERVER_TOKEN is missing" },
        { status: 500 }
      );
    }

    // Try to dynamically import the official server SDK (prevents build-time ctor errors)
    try {
      const mod = await import("@vapi-ai/server-sdk").catch(() => null);
      if (mod) {
        // handle default or named export shapes
        const VapiCtor = (mod.default ?? (mod as any).Vapi ?? mod) as any;
        if (typeof VapiCtor === "function") {
          const vapi = new VapiCtor({ apiKey: serverToken });

          // Attempt several common call surfaces (adjust if your SDK docs differ)
          if (vapi.calls && typeof vapi.calls.create === "function") {
            const call = await vapi.calls.create({
              type: "workflow",
              workflow: { id: workflowId, variableValues: variables },
            });
            return NextResponse.json({ success: true, call }, { status: 200 });
          } else if (vapi.call && typeof vapi.call.start === "function") {
            const call = await vapi.call.start({
              type: "workflow",
              workflow: { id: workflowId, variableValues: variables },
            });
            return NextResponse.json({ success: true, call }, { status: 200 });
          } else {
            // SDK loaded but shape not recognized -> fallback to HTTP
            console.warn("VAPI SDK loaded but call surface not recognized, falling back to HTTP.");
          }
        } else {
          console.warn("VAPI SDK import exists but is not a constructor. Falling back to HTTP.");
        }
      }
    } catch (sdkErr) {
      console.warn("Server SDK import/call failed — falling back to raw HTTP. Reason:", sdkErr?.message ?? sdkErr);
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
        input: { variableValues: variables },
      }),
    });

    const text = await apiRes.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!apiRes.ok) {
      return NextResponse.json({ success: false, error: parsed }, { status: apiRes.status });
    }

    return NextResponse.json({ success: true, call: parsed }, { status: 200 });
  } catch (error: any) {
    console.error("VAPI route error:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
