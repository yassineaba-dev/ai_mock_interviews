import Vapi from "@vapi-ai/web";

// Use client-side token for web SDK
if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
  throw new Error("NEXT_PUBLIC_VAPI_WEB_TOKEN is missing in environment variables");
}

export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
