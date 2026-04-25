import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { FastResponse } from "srvx";

globalThis.Response = FastResponse;

function setIfMissing(headers: Headers, key: string, value: string) {
  if (headers.has(key)) return;
  headers.set(key, value);
}

const allowedWebfontOrigins = ["https://cdn.jsdelivr.net", "https://fonts.gstatic.com"] as const;

const fontSrcWithWebfonts = ["'self'", ...allowedWebfontOrigins].join(" ");

export default createServerEntry({
  async fetch(request) {
    const response = await handler.fetch(request);

    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") ?? "";

    if (request.url.includes("/printer/")) {
      headers.set(
        "Content-Security-Policy",
        `default-src 'self'; img-src 'self' data:; font-src ${fontSrcWithWebfonts}; style-src 'self' 'unsafe-inline'; connect-src 'self'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self';`,
      );
    }

    if (contentType.includes("text/html")) {
      setIfMissing(headers, "Cross-Origin-Opener-Policy", "same-origin");
      setIfMissing(headers, "Cross-Origin-Resource-Policy", "same-site");
      setIfMissing(
        headers,
        "Content-Security-Policy",
        `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src ${fontSrcWithWebfonts} data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
});
