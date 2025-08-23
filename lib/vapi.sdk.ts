export async function getVapiClient() {
  if (typeof window === "undefined") return null;
  if (window.__VAPI_CLIENT) return window.__VAPI_CLIENT;

  try {
    const mod = await import("@vapi-ai/web");
    const VapiCtor = (mod.default ?? (mod as any).Vapi ?? mod) as any;

    const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
    if (!token) {
      console.warn("NEXT_PUBLIC_VAPI_WEB_TOKEN is missing");
      return null;
    }

    if (typeof VapiCtor === "function") {
      let client: any = null;
      try {
        client = new VapiCtor(token);
      } catch {
        try {
          client = new VapiCtor({ apiKey: token });
        } catch (e) {
          console.error("Failed to construct VAPI web client:", e);
          return null;
        }
      }

      window.__VAPI_CLIENT = client;
      return client;
    } else {
      console.warn("Unexpected @vapi-ai/web export shape:", VapiCtor);
      return null;
    }
  } catch (err) {
    console.warn("Failed to import @vapi-ai/web:", err);
    return null;
  }
}
