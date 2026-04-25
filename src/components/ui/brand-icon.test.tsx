import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BrandIcon } from "./brand-icon";

afterEach(cleanup);

describe("BrandIcon", () => {
  it("renders both dark and light logo images by default", () => {
    render(<BrandIcon />);

    const images = screen.getAllByRole("img", { name: "Reactive Resume" });

    expect(images).toHaveLength(2);
    expect(images[0].getAttribute("src")).toBe("/logo/dark.svg");
    expect(images[0].className).toContain("hidden");
    expect(images[0].className).toContain("dark:block");
    expect(images[1].getAttribute("src")).toBe("/logo/light.svg");
    expect(images[1].className).toContain("block");
    expect(images[1].className).toContain("dark:hidden");
  });

  it("uses icon variant and forwards shared img props", () => {
    render(<BrandIcon variant="icon" className="brand-class" loading="lazy" data-testid="brand" />);

    const images = screen.getAllByTestId("brand");

    expect(images).toHaveLength(2);
    expect(images[0].getAttribute("src")).toBe("/icon/dark.svg");
    expect(images[1].getAttribute("src")).toBe("/icon/light.svg");
    expect(images[0].getAttribute("loading")).toBe("lazy");
    expect(images[1].getAttribute("loading")).toBe("lazy");
    expect(images[0].className).toContain("brand-class");
    expect(images[1].className).toContain("brand-class");
  });
});
