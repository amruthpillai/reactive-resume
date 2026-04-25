import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { PageLink } from "./page-link";

afterEach(cleanup);

describe("PageLink", () => {
  it("returns null when url is empty", () => {
    const { container } = render(<PageLink url="" />);

    expect(container.firstChild).toBeNull();
  });

  it("renders link with expected attributes and label", () => {
    render(<PageLink url="https://example.com" label="Visit site" className="custom-link" />);

    const link = screen.getByRole("link", { name: "Visit site" });

    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.className).toContain("inline-block");
    expect(link.className).toContain("custom-link");
  });

  it("falls back to url text when label is missing", () => {
    render(<PageLink url="https://fallback.dev" label="" />);

    const link = screen.getByRole("link", { name: "https://fallback.dev" });

    expect(link.getAttribute("href")).toBe("https://fallback.dev");
  });
});
