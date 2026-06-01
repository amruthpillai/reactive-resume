// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { LevelDisplay } from "./display";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("LevelDisplay", () => {
	it("renders nothing when level is 0", () => {
		const { container } = render(<LevelDisplay type="circle" icon="star" level={0} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when type is hidden", () => {
		const { container } = render(<LevelDisplay type="hidden" icon="star" level={3} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when icon is empty (regardless of type)", () => {
		const { container } = render(<LevelDisplay type="icon" icon="" level={3} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders 5 segments for progress-bar type", () => {
		const { container } = render(<LevelDisplay type="progress-bar" icon="star" level={3} />);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.children).toHaveLength(5);
	});

	it("marks first N segments as active for progress-bar", () => {
		const { container } = render(<LevelDisplay type="progress-bar" icon="star" level={3} />);
		const wrapper = container.firstChild as HTMLElement;
		const activeStates = Array.from(wrapper.children).map((el) => (el as HTMLElement).dataset.active);
		expect(activeStates).toEqual(["true", "true", "true", "false", "false"]);
	});

	it("renders icons for icon type", () => {
		const { container } = render(<LevelDisplay type="icon" icon="star" level={2} />);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.children).toHaveLength(5);
		expect(wrapper.querySelectorAll("i").length).toBe(5);
		expect(wrapper.querySelector("i")?.className).toContain("ph-star");
	});

	it("dims inactive icons for icon type", () => {
		const { container } = render(<LevelDisplay type="icon" icon="star" level={1} />);
		const wrapper = container.firstChild as HTMLElement;
		const icons = wrapper.querySelectorAll("i");
		expect(icons[0]?.className).not.toContain("opacity-40");
		expect(icons[4]?.className).toContain("opacity-40");
	});

	it("renders square segments for circle/rectangle/rectangle-full types", () => {
		for (const type of ["circle", "rectangle", "rectangle-full"] as const) {
			const { container } = render(<LevelDisplay type={type} icon="star" level={2} />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.children).toHaveLength(5);
			const activeStates = Array.from(wrapper.children).map((el) => (el as HTMLElement).dataset.active);
			expect(activeStates).toEqual(["true", "true", "false", "false", "false"]);
		}
	});

	it("includes an aria-label describing the level", () => {
		const { container } = render(<LevelDisplay type="circle" icon="star" level={4} />);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.getAttribute("role")).toBe("img");
		expect(wrapper.getAttribute("aria-label")).toContain("4");
	});

	it("applies custom decoration and icon sizes in pixels", () => {
		const { container } = render(
			<LevelDisplay type="circle" icon="star" level={2} decorationSizePx={18} iconSizePx={20} />,
		);

		const shapes = container.querySelectorAll("div[data-active]");
		expect(shapes[0]).toHaveStyle({ width: "18px", height: "18px" });

		const { container: iconContainer } = render(
			<LevelDisplay type="icon" icon="star" level={2} decorationSizePx={16} />,
		);
		const icon = iconContainer.querySelector("i");
		expect(icon).toHaveStyle({ fontSize: "16px", width: "16px", height: "16px" });
	});

	it("merges extra className into the wrapper", () => {
		const { container } = render(<LevelDisplay type="circle" icon="star" level={1} className="extra" />);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("extra");
	});
});
