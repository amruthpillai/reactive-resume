import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { FastResponse } from "srvx";

globalThis.Response = FastResponse;

const fontSrc = "'self' https://cdn.jsdelivr.net https://fonts.gstatic.com";
const scriptSrc = "'self' 'unsafe-inline' https://cdn.jsdelivr.net";
const styleSrc = "'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net";

function setIfAbsent(headers: Headers, key: string, value: string) {
  if (!headers.has(key)) headers.set(key, value);
}

export default createServerEntry({
  async fetch(request) {
    const response = await handler.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") ?? "";

    if (request.url.includes("/printer/")) {
      headers.set(
        "Content-Security-Policy-Report-Only",
        `default-src 'self'; img-src 'self' data:; font-src ${fontSrc}; style-src ${styleSrc}; connect-src 'self'; script-src ${scriptSrc}; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self';`,
      );
    }

    if (contentType.includes("text/html")) {
      setIfAbsent(headers, "Cross-Origin-Opener-Policy", "same-origin");
      setIfAbsent(headers, "Cross-Origin-Resource-Policy", "same-site");
      setIfAbsent(
        headers,
        "Content-Security-Policy-Report-Only",
        `default-src 'self'; script-src ${scriptSrc}; worker-src 'self' blob:; style-src ${styleSrc}; img-src 'self' data: blob: https:; font-src ${fontSrc} data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
      );
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
});
