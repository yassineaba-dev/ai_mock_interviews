// Server-only VAPI SDK instance
import Vapi from "@vapi-ai/web";

if (process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!) {
  throw new Error("VAPI_WEB_TOKEN is missing in environment variables");
}

export const vapi = new Vapi(process.env.VAPI_WEB_TOKEN);
