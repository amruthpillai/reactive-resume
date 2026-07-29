import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import { describe, expect, it, vi } from "vitest";
import { createPublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { resumeDto } from "../../dto/resume";
import { getStyleProjection } from "./public-style-projection";

const source = {
	languageVersion: 1,
	text: "@rr-version 1;\nname { color: #123456; }\n",
};

const buildResume = () => {
	const data = structuredClone(defaultResumeData);
	data.metadata.stylesheet = { mode: "semantic", source, applied: source };
	return {
		id: "resume-1",
		userId: "owner-1",
		name: "Private dashboard title",
		slug: "resume",
		data,
		isPublic: true,
		passwordHash: null,
	};
};

const input = {
	username: "jane",
	slug: "resume",
	requestHeaders: new Headers({ "x-forwarded-for": "203.0.113.7" }),
	trustedClient: "203.0.113.9",
};

describe("getStyleProjection", () => {
	it("authorizes before consuming budget or looking up a cached projection", async () => {
		const consume = vi.fn();
		const createProjection = vi.fn();
		const cache = new Map<string, PublicStyleProjection>([
			["cached", { renderDataHash: "cached" } as PublicStyleProjection],
		]);

		await expect(
			getStyleProjection(input, {
				findResume: vi.fn().mockResolvedValue({ ...buildResume(), isPublic: false }),
				hasPasswordAccess: vi.fn(),
				rateLimiter: { consume },
				createProjection,
				cache,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		expect(consume).not.toHaveBeenCalled();
		expect(createProjection).not.toHaveBeenCalled();
	});

	it("preserves password authorization before consuming the shared render budget", async () => {
		const consume = vi.fn();

		await expect(
			getStyleProjection(input, {
				findResume: vi.fn().mockResolvedValue({ ...buildResume(), passwordHash: "hash" }),
				hasPasswordAccess: vi.fn().mockReturnValue(false),
				rateLimiter: { consume },
				createProjection: vi.fn(),
				cache: new Map(),
			}),
		).rejects.toMatchObject({ code: "NEED_PASSWORD", status: 401 });

		expect(consume).not.toHaveBeenCalled();
	});

	it("returns a source-free resolved projection and consumes one render token", async () => {
		const consume = vi.fn();
		const result = await getStyleProjection(input, {
			findResume: vi.fn().mockResolvedValue(buildResume()),
			hasPasswordAccess: vi.fn(),
			rateLimiter: { consume },
			createProjection: createPublicStyleProjection,
			cache: new Map(),
		});

		expect(result).toEqual(expect.objectContaining({ formatVersion: 1, nodes: expect.any(Object) }));
		expect(JSON.stringify(result)).not.toContain("@rr-version");
		expect(consume).toHaveBeenCalledOnce();
		expect(consume).toHaveBeenCalledWith({ trustedClient: "203.0.113.9", resumeId: "resume-1" });
	});

	it("normalizes stored data before public projection", async () => {
		const resume = buildResume();
		resume.data.customSections = [
			{
				id: "custom-experience",
				type: "experience",
				title: "Experience",
				icon: "",
				columns: 1,
				hidden: false,
				keepTogether: false,
				startOnNewPage: false,
				items: [
					{
						id: "experience-item",
						hidden: false,
						company: "Analytical Engines",
						position: "Programmer",
						location: "London",
						period: "1842–1843",
						description: "<p>Wrote the first algorithm.</p>",
						content: "<p>Compatible overlap</p>",
					},
				],
			} as never,
		];
		const projection = {
			formatVersion: 1,
			languageVersion: 1,
			semanticTreeVersion: 1,
			registryFingerprint: "registry",
			adapterFingerprint: "adapter",
			renderDataHash: "render-hash",
			nodes: {},
		} satisfies PublicStyleProjection;
		const createProjection = vi.fn().mockResolvedValue(projection);

		await getStyleProjection(input, {
			findResume: vi.fn().mockResolvedValue(resume),
			hasPasswordAccess: vi.fn(),
			rateLimiter: { consume: vi.fn() },
			createProjection,
			cache: new Map(),
		});

		expect(createProjection.mock.calls[0]?.[0].data.customSections[0]?.items[0]).toMatchObject({
			content: "<p>Compatible overlap</p>",
			roles: [],
			website: { url: "", label: "", inlineLink: false },
		});
	});

	it("caches only authorized projections by renderDataHash", async () => {
		const projection = {
			formatVersion: 1,
			languageVersion: 1,
			semanticTreeVersion: 1,
			registryFingerprint: "registry",
			adapterFingerprint: "adapter",
			renderDataHash: "render-hash",
			nodes: {},
		} satisfies PublicStyleProjection;
		const createProjection = vi
			.fn()
			.mockResolvedValueOnce(projection)
			.mockResolvedValueOnce({ ...projection });
		const cache = new Map<string, PublicStyleProjection>();
		const dependencies = {
			findResume: vi.fn().mockResolvedValue(buildResume()),
			hasPasswordAccess: vi.fn(),
			rateLimiter: { consume: vi.fn() },
			createProjection,
			cache,
		};

		const first = await getStyleProjection(input, dependencies);
		const second = await getStyleProjection(input, dependencies);

		expect(cache.get("render-hash")).toBe(first);
		expect(second).toBe(first);
	});

	it("uses a strict source-free public projection DTO", async () => {
		const projection = await createPublicStyleProjection({ data: buildResume().data });

		expect(resumeDto.getStyleProjection.output.safeParse(projection).success).toBe(true);
		expect(
			resumeDto.getStyleProjection.output.safeParse({
				...projection,
				source,
			}).success,
		).toBe(false);
		expect(
			resumeDto.getStyleProjection.output.safeParse({
				...projection,
				nodes: {
					...projection.nodes,
					private: { diagnostics: [{ message: "source location" }] },
				},
			}).success,
		).toBe(false);
	});
});
