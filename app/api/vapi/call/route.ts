// app/api/vapi/call/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.json();
    console.log("Incoming /api/vapi/call body:", JSON.stringify(incoming));

    const workflowId = incoming?.workflowId;
    const variables = incoming?.variables ?? {};

    if (!workflowId) {
      return NextResponse.json({ success: false, error: "workflowId is required" }, { status: 400 });
    }

    const serverToken =
      process.env.VAPI_SERVER_TOKEN ||
      (process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN : undefined);

    console.log("VAPI_SERVER_TOKEN present?", !!process.env.VAPI_SERVER_TOKEN);
    if (!serverToken) {
      return NextResponse.json({ success: false, error: "VAPI_SERVER_TOKEN is missing" }, { status: 500 });
    }

    // Build the payload exactly how we'll send it to api.vapi.ai
    const payloadForVapi = {
      workflowId,
      input: { variableValues: variables },
    };

    console.log("Outgoing payload to Vapi:", JSON.stringify(payloadForVapi));

    const apiRes = await fetch("https://api.vapi.ai/call/web", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverToken}`,
      },
      body: JSON.stringify(payloadForVapi),
    });

    const resText = await apiRes.text();
    let parsed;
    try {
      parsed = JSON.parse(resText);
    } catch {
      parsed = resText;
    }

    console.log("Vapi response status:", apiRes.status);
    console.log("Vapi response body:", parsed);

    if (!apiRes.ok) {
      // return the full upstream error so the client can show it
      return NextResponse.json(
        { success: false, upstream: { status: apiRes.status, body: parsed } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, call: parsed }, { status: 200 });
  } catch (err: any) {
    console.error("VAPI route fatal error:", err);
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
