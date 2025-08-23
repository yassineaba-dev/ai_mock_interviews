// app/api/vapi/call/route.ts
import { NextRequest, NextResponse } from "next/server";

type Candidate = {
  name: string;
  body: Record<string, any>;
};

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.json();
    console.log("Incoming /api/vapi/call body (from client):", JSON.stringify(incoming));

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

    // Candidate payload shapes to try (in order).
    // We removed "input" in some candidates because Vapi told us "property input should not exist".
    const candidates: Candidate[] = [
      { name: "variables", body: { workflowId, variables } },
      { name: "variableValues", body: { workflowId, variableValues: variables } },
      { name: "direct-variables-spread", body: { workflowId, ...variables } },
      { name: "workflow-only", body: { workflowId } }, // minimal; useful if workflow pulls server-side data
      // keep these as last resorts (some endpoints use 'input', but Vapi said not to use it)
      { name: "input.variableValues", body: { workflowId, input: { variableValues: variables } } },
      { name: "input-raw", body: { workflowId, input: variables } },
    ];

    // We'll try each candidate until one returns ok.
    const attempts: Array<{ name: string; status: number; body: any }> = [];

    for (const cand of candidates) {
      try {
        console.log("Attempting payload shape:", cand.name, JSON.stringify(cand.body));
        const apiRes = await fetch("https://api.vapi.ai/call/web", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serverToken}`,
          },
          body: JSON.stringify(cand.body),
        });

        const text = await apiRes.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }

        console.log(`Vapi attempt [${cand.name}] status:`, apiRes.status, "body:", parsed);
        attempts.push({ name: cand.name, status: apiRes.status, body: parsed });

        if (apiRes.ok) {
          // success — return the successful response
          return NextResponse.json({ success: true, call: parsed, usedShape: cand.name }, { status: 200 });
        }

        // If explicit validation says "property input should not exist", record that and continue trying.
        // Otherwise continue to next candidate.
      } catch (e: any) {
        console.warn("Attempt error for candidate", cand.name, e?.message ?? e);
        attempts.push({ name: cand.name, status: 0, body: e?.message ?? String(e) });
      }
    }

    // If we reach here, none of the candidates succeeded. Return aggregated info for debugging.
    return NextResponse.json(
      {
        success: false,
        error: "All payload candidates failed",
        attempts,
        hint: "Vapi message indicated 'property input should not exist' — try sending workflow-level variables (no 'input' wrapper).",
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("VAPI route fatal error:", err);
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
