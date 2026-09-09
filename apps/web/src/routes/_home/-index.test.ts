import { describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => ({ options }),
	lazyRouteComponent: () => () => null,
	redirect: (options: unknown) => options,
}));
vi.mock("@/libs/orpc/client", () => ({
	orpc: { resume: { getRoot: { queryOptions: () => ({ queryKey: ["root"] }) } } },
}));
// The homepage component is unrelated to the loader/head boundary under test.
vi.mock("@/features/homepage/page", () => ({ Homepage: () => null }));
const { Route } = await import("./index");

describe("home root mode", () => {
	it("uses server canonical root for public metadata", async () => {
		const head = await Route.options.head?.({
			loaderData: {
				root: {
					status: "public",
					canonicalUrl: "https://configured.example/",
					username: "owner",
					slug: "resume",
					resume: { data: defaultResumeData, name: "Root Fixture" },
				},
			},
		} as never);
		expect(head).toMatchObject({ links: [{ rel: "canonical", href: "https://configured.example/" }] });
		expect(head?.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
		expect(head?.scripts).toBeUndefined();
	});
	it("keeps unavailable metadata free from target details and marketing structured data", async () => {
		const head = await Route.options.head?.({
			loaderData: { root: { status: "unavailable", canonicalUrl: "https://configured.example/" } },
		} as never);
		expect(head?.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
		expect(head?.scripts).toBeUndefined();
	});
	it("retains marketing structured data when disabled", async () => {
		const head = await Route.options.head?.({ loaderData: { root: { status: "disabled" } } } as never);
		expect(head?.scripts).toHaveLength(1);
	});
});
