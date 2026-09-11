import { describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/server";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { getRootResume } from "./root";

const fixture = () => ({
	config: { rootResumeId: "root-id", appUrl: "https://resume.example/base?ignored=yes" },
	findTarget: vi.fn(async (_id: string) => ({ username: "owner", slug: "current-slug", isPublic: true })),
	getBySlug: vi.fn(async (_input: unknown) => ({
		id: "root-id",
		name: "Resume",
		slug: "current-slug",
		data: defaultResumeData,
		tags: [],
		isPublic: true,
		isLocked: false,
		showDownloadButtons: false,
		hasPassword: false,
	})),
});
const request = { requestHeaders: new Headers({ host: "attacker.example", "x-forwarded-host": "attacker.example" }) };

describe("configured root public resume", () => {
	it.each([undefined, "", "   "])("disables root mode for %s without a lookup", async (rootResumeId) => {
		const deps = fixture();
		const result = await getRootResume(request, { ...deps, config: { ...deps.config, rootResumeId } });
		expect(result).toEqual({ status: "disabled" });
		expect(deps.findTarget).not.toHaveBeenCalled();
		expect(deps.getBySlug).not.toHaveBeenCalled();
	});

	it.each([null, { username: "secret-owner", slug: "secret-slug", isPublic: false }])(
		"does not disclose an unavailable target to its owner",
		async (target) => {
			const deps = fixture();
			const result = await getRootResume(
				{ ...request, currentUserId: "owner-id" },
				{ ...deps, findTarget: async () => target },
			);
			expect(result).toEqual({ status: "unavailable", canonicalUrl: "https://resume.example/" });
			expect(deps.getBySlug).not.toHaveBeenCalled();
		},
	);

	it("resolves only configured ID and delegates once with public-only enforcement", async () => {
		const deps = fixture();
		const result = await getRootResume({ ...request, currentUserId: "owner-id" }, deps);
		expect(result).toMatchObject({
			status: "public",
			username: "owner",
			slug: "current-slug",
			canonicalUrl: "https://resume.example/",
			resume: { showDownloadButtons: false, hasPassword: false },
		});
		expect(deps.findTarget).toHaveBeenCalledExactlyOnceWith("root-id");
		expect(deps.getBySlug).toHaveBeenCalledExactlyOnceWith({
			...request,
			currentUserId: "owner-id",
			username: "owner",
			slug: "current-slug",
			requirePublic: true,
			expectedResumeId: "root-id",
		});
	});

	it("uses the renamed slug on the next request", async () => {
		const deps = fixture();
		deps.findTarget.mockResolvedValue({ username: "renamed-owner", slug: "renamed-slug", isPublic: true });
		expect(await getRootResume(request, deps)).toMatchObject({ username: "renamed-owner", slug: "renamed-slug" });
	});

	it("keeps a privacy change during the final lookup unavailable", async () => {
		const deps = fixture();
		deps.getBySlug.mockRejectedValue(new ORPCError("NOT_FOUND"));
		expect(await getRootResume(request, deps)).toEqual({
			status: "unavailable",
			canonicalUrl: "https://resume.example/",
		});
	});

	it("preserves the existing password challenge identity", async () => {
		const deps = fixture();
		deps.getBySlug.mockRejectedValue(
			new ORPCError("NEED_PASSWORD", { status: 401, data: { username: "owner", slug: "current-slug" } }),
		);
		await expect(getRootResume(request, deps)).rejects.toMatchObject({
			code: "NEED_PASSWORD",
			data: { username: "owner", slug: "current-slug" },
		});
	});

	it("does not hide infrastructure failures as missing resumes", async () => {
		const deps = fixture();
		deps.getBySlug.mockRejectedValue(new Error("database unavailable"));
		await expect(getRootResume(request, deps)).rejects.toThrow("database unavailable");
	});
});
