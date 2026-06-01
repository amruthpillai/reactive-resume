import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
	it("renders children inside a span by default", () => {
		render(<Badge>New</Badge>);
		const badge = screen.getByText("New");
		expect(badge.tagName).toBe("SPAN");
	});

	it("merges custom className", () => {
		render(<Badge className="my-extra">x</Badge>);
		expect(screen.getByText("x")).toHaveClass("my-extra");
	});

	it.each([
		["default"],
		["secondary"],
		["destructive"],
		["outline"],
		["ghost"],
		["link"],
	] as const)("renders variant=%s without throwing", (variant) => {
		render(<Badge variant={variant}>{variant}</Badge>);
		expect(screen.getByText(variant)).toBeInTheDocument();
	});

	it("forwards aria attributes", () => {
		render(<Badge aria-label="status indicator">3</Badge>);
		expect(screen.getByLabelText("status indicator")).toBeInTheDocument();
	});

	it("supports a custom render function", () => {
		render(<Badge render={(props) => <a {...props} href="/x" aria-label="View profile" />}>View profile</Badge>);
		const anchor = screen.getByRole("link", { name: "View profile" });
		expect(anchor).toBeInTheDocument();
	});
});
