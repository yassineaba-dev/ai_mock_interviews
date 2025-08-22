// lib/vapi.sdk.ts
import Vapi from "@vapi-ai/web";

const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

if (!token) {
  throw new Error("❌ NEXT_PUBLIC_VAPI_WEB_TOKEN is missing in environment variables");
}

// نصدّر instance واحد تستعمله في أي مكان
export const vapi = new Vapi(token);
