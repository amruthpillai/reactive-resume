import { describe, expect, it } from "vitest";
import { sharingRouter } from "./sharing";

describe("public style projection route", () => {
	it("mounts a concrete public GET route beside the ordinary JSON read", () => {
		expect(sharingRouter.getStyleProjection["~orpc"].route).toMatchObject({
			method: "GET",
			path: "/resumes/{username}/{slug}/style-projection",
			operationId: "getResumeStyleProjection",
		});
		expect(sharingRouter.getBySlug["~orpc"].route.path).toBe("/resumes/{username}/{slug}");
	});
});
