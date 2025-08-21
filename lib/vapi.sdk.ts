// /pages/api/vapi/call.ts
import Vapi from "@vapi-ai/web";

const vapi = new Vapi(process.env.VAPI_WEB_TOKEN!); // server-only

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { workflowId, variables } = req.body;
    try {
      const call = await vapi.start(workflowId, { variableValues: variables });
      res.status(200).json({ success: true, call });
    } catch (error) {
      res.status(500).json({ success: false, error });
    }
  } else {
    res.status(405).json({ success: false, error: "Method not allowed" });
  }
}
