import { describe, expect, it } from "vitest";
import { ORPCError } from "@orpc/client";
import { getOrpcErrorMessage, getReadableErrorMessage, getResumeErrorMessage } from "./error-message";

describe("getReadableErrorMessage", () => {
	it("returns the string error directly", () => {
		expect(getReadableErrorMessage("explicit error", "fallback")).toBe("explicit error");
	});

	it("returns Error.message", () => {
		expect(getReadableErrorMessage(new Error("boom"), "fallback")).toBe("boom");
	});

	it("returns the message of a plain error object (Better Auth client errors)", () => {
		expect(getReadableErrorMessage({ code: "SESSION_NOT_FRESH", message: "Session is not fresh" }, "fallback")).toBe(
			"Session is not fresh",
		);
	});

	it("returns fallback for unknown shapes", () => {
		expect(getReadableErrorMessage({ random: "object" }, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage({ message: "" }, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage(null, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage(undefined, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage(42, "fallback")).toBe("fallback");
	});

	it("returns fallback for empty string error (falsy)", () => {
		expect(getReadableErrorMessage("", "fallback")).toBe("fallback");
	});

	it("returns fallback for Error with empty message", () => {
		expect(getReadableErrorMessage(new Error(""), "fallback")).toBe("fallback");
	});
});

describe("getOrpcErrorMessage", () => {
	it("delegates to getReadableErrorMessage for non-ORPCErrors", () => {
		expect(getOrpcErrorMessage(new Error("boom"), { fallback: "fallback" })).toBe("boom");
		expect(getOrpcErrorMessage("string error", { fallback: "fallback" })).toBe("string error");
	});

	it("uses byCode mapping when present", () => {
		const error = new ORPCError("RESUME_LOCKED");
		expect(
			getOrpcErrorMessage(error, {
				fallback: "fallback",
				byCode: { RESUME_LOCKED: "It is locked." },
			}),
		).toBe("It is locked.");
	});

	it("returns server message when allowServerMessage and message is set", () => {
		const error = new ORPCError("OTHER", { message: "Server-provided message" });
		expect(
			getOrpcErrorMessage(error, {
				fallback: "fallback",
				allowServerMessage: true,
			}),
		).toBe("Server-provided message");
	});

	it("falls back when allowServerMessage is false even if message set", () => {
		const error = new ORPCError("OTHER", { message: "Server-provided message" });
		expect(getOrpcErrorMessage(error, { fallback: "fallback" })).toBe("fallback");
	});

	it("byCode takes precedence over allowServerMessage", () => {
		const error = new ORPCError("RESUME_LOCKED", { message: "Server msg" });
		expect(
			getOrpcErrorMessage(error, {
				fallback: "fallback",
				byCode: { RESUME_LOCKED: "It is locked." },
				allowServerMessage: true,
			}),
		).toBe("It is locked.");
	});

	it("returns fallback when no mapping or server message", () => {
		const error = new ORPCError("UNKNOWN_CODE");
		expect(getOrpcErrorMessage(error, { fallback: "fallback" })).toBe("fallback");
	});
});

describe("getResumeErrorMessage", () => {
	it("returns mapped message for RESUME_SLUG_ALREADY_EXISTS", () => {
		const error = new ORPCError("RESUME_SLUG_ALREADY_EXISTS");
		expect(getResumeErrorMessage(error)).toBe("A resume with this slug already exists.");
	});

	it("returns mapped message for RESUME_LOCKED", () => {
		const error = new ORPCError("RESUME_LOCKED");
		expect(getResumeErrorMessage(error)).toBe("This resume is locked. Unlock it first to make changes.");
	});

	it("returns generic fallback for unknown codes", () => {
		const error = new ORPCError("UNKNOWN");
		expect(getResumeErrorMessage(error)).toBe("Something went wrong. Please try again.");
	});

	it("returns fallback for plain Error (delegates to getOrpcErrorMessage)", () => {
		// Plain Error gets readable message
		expect(getResumeErrorMessage(new Error("boom"))).toBe("boom");
	});

	it("returns fallback for unknown shape", () => {
		expect(getResumeErrorMessage(null)).toBe("Something went wrong. Please try again.");
	});
});
