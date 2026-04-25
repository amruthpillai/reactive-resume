import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

afterEach(cleanup);

// Mock @lingui/core/macro
vi.mock("@lingui/core/macro", () => ({
  t: (stringsOrDescriptor: TemplateStringsArray | { message: string }, ...values: unknown[]) => {
    if (
      typeof stringsOrDescriptor === "object" &&
      "message" in stringsOrDescriptor &&
      typeof stringsOrDescriptor.message === "string"
    ) {
      return stringsOrDescriptor.message;
    }

    const strings = stringsOrDescriptor as TemplateStringsArray;
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
      result += String(values[i]) + strings[i + 1];
    }
    return result;
  },
}));

// Mock PageIcon to avoid deep dependency chain
vi.mock("../resume/shared/page-icon", () => ({
  PageIcon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid="page-icon" data-icon={icon} className={className} />
  ),
}));

import { LevelDisplay } from "./display";

describe("LevelDisplay", () => {
  describe("returns null for invalid states", () => {
    it("returns null when level is 0", () => {
      const { container } = render(<LevelDisplay icon="star" type="circle" level={0} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when type is 'hidden'", () => {
      const { container } = render(<LevelDisplay icon="star" type="hidden" level={3} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when icon is empty string", () => {
      const { container } = render(<LevelDisplay icon="" type="circle" level={3} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("renders correct number of elements", () => {
    it("always renders 5 elements for non-zero level", () => {
      const { container } = render(<LevelDisplay icon="star" type="circle" level={3} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children).toHaveLength(5);
    });

    it("renders 5 elements for level 1", () => {
      const { container } = render(<LevelDisplay icon="star" type="square" level={1} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children).toHaveLength(5);
    });

    it("renders 5 elements for level 5", () => {
      const { container } = render(<LevelDisplay icon="star" type="circle" level={5} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children).toHaveLength(5);
    });
  });

  describe("active state for circle/square/rectangle types", () => {
    it("marks correct number of items as active for level 3", () => {
      const { container } = render(<LevelDisplay icon="star" type="circle" level={3} />);
      const items = Array.from((container.firstChild as HTMLElement).children);
      const activeItems = items.filter((el) => el.getAttribute("data-active") === "true");
      expect(activeItems).toHaveLength(3);
    });

    it("marks 1 item active for level 1", () => {
      const { container } = render(<LevelDisplay icon="star" type="square" level={1} />);
      const items = Array.from((container.firstChild as HTMLElement).children);
      const activeItems = items.filter((el) => el.getAttribute("data-active") === "true");
      expect(activeItems).toHaveLength(1);
    });

    it("marks all 5 items active for level 5", () => {
      const { container } = render(<LevelDisplay icon="star" type="circle" level={5} />);
      const items = Array.from((container.firstChild as HTMLElement).children);
      const activeItems = items.filter((el) => el.getAttribute("data-active") === "true");
      expect(activeItems).toHaveLength(5);
    });
  });

  describe("progress-bar type", () => {
    it("renders progress bar elements", () => {
      const { container } = render(<LevelDisplay icon="star" type="progress-bar" level={3} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children).toHaveLength(5);
    });

    it("has correct active count for progress-bar", () => {
      const { container } = render(<LevelDisplay icon="star" type="progress-bar" level={2} />);
      const items = Array.from((container.firstChild as HTMLElement).children);
      const activeItems = items.filter((el) => el.getAttribute("data-active") === "true");
      expect(activeItems).toHaveLength(2);
    });
  });

  describe("icon type", () => {
    it("renders PageIcon components", () => {
      render(<LevelDisplay icon="star" type="icon" level={3} />);
      const icons = screen.getAllByTestId("page-icon");
      expect(icons).toHaveLength(5);
    });

    it("passes the icon name to PageIcon", () => {
      render(<LevelDisplay icon="star" type="icon" level={2} />);
      const icons = screen.getAllByTestId("page-icon");
      expect(icons[0].getAttribute("data-icon")).toBe("star");
    });

    it("applies opacity to inactive icons", () => {
      render(<LevelDisplay icon="star" type="icon" level={2} />);
      const icons = screen.getAllByTestId("page-icon");
      // First 2 should be active (no opacity-40), last 3 inactive (opacity-40)
      expect(icons[0].className).not.toContain("opacity-40");
      expect(icons[1].className).not.toContain("opacity-40");
      expect(icons[2].className).toContain("opacity-40");
      expect(icons[3].className).toContain("opacity-40");
      expect(icons[4].className).toContain("opacity-40");
    });
  });

  describe("aria attributes", () => {
    it("has aria-label showing level out of 5", () => {
      render(<LevelDisplay icon="star" type="circle" level={3} />);
      const el = screen.getByRole("img");
      expect(el.getAttribute("aria-label")).toContain("3");
      expect(el.getAttribute("aria-label")).toContain("5");
    });
  });

  describe("className prop", () => {
    it("applies custom className to the wrapper", () => {
      const { container } = render(<LevelDisplay icon="star" type="circle" level={3} className="custom-level" />);
      expect((container.firstChild as HTMLElement).className).toContain("custom-level");
    });
  });
});
