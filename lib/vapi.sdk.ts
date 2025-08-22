// usage inside a client component
import { useEffect, useRef } from "react";

export function useVapiWeb() {
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        const mod = await import("@vapi-ai/web"); // dynamic import — only runs in browser
        const VapiCtor = mod.default ?? mod.Vapi ?? mod;
        const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
        if (!token) {
          console.error("NEXT_PUBLIC_VAPI_WEB_TOKEN is missing");
          return;
        }
        if (typeof VapiCtor === "function") {
          vapiRef.current = new VapiCtor(token);
        } else {
          console.error("vapi web SDK shape unknown", VapiCtor);
        }
      } catch (err) {
        console.error("Failed to load @vapi-ai/web:", err);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return vapiRef;
}
