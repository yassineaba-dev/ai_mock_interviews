// /pages/api/vapi/call.ts
import Vapi from "@vapi-ai/web";

const vapi = new Vapi(process.env.VAPI_WEB_TOKEN!); // server-only

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { workflowId, variables } = req.body;

  if (!workflowId) {
    return res.status(400).json({ success: false, error: "workflowId is required" });
  }

  try {
    const call = await vapi.start(workflowId, { variableValues: variables });
    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("VAPI Call Error:", error);
    res.status(500).json({ success: false, error });
  }
}
