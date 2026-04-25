import { ORPCError } from "@orpc/client";
import { describe, expect, it } from "vite-plus/test";

import { getOrpcErrorMessage, getReadableErrorMessage, getResumeErrorMessage } from "./error-message";

describe("getReadableErrorMessage", () => {
  it("returns error.message when error is an Error", () => {
    const result = getReadableErrorMessage(new Error("Request failed"), "Fallback");
    expect(result).toBe("Request failed");
  });

  it("returns string errors directly", () => {
    const result = getReadableErrorMessage("String error", "Fallback");
    expect(result).toBe("String error");
  });

  it("returns fallback for unknown values", () => {
    const result = getReadableErrorMessage({ reason: "bad" }, "Fallback");
    expect(result).toBe("Fallback");
  });
});

describe("getOrpcErrorMessage", () => {
  it("returns mapped message for matching oRPC code", () => {
    const result = getOrpcErrorMessage(new ORPCError("BAD_REQUEST"), {
      fallback: "Fallback",
      byCode: { BAD_REQUEST: "Mapped bad request" },
    });
    expect(result).toBe("Mapped bad request");
  });

  it("returns server message when allowed and code is not mapped", () => {
    const result = getOrpcErrorMessage(new ORPCError("INTERNAL_SERVER_ERROR", { message: "Server detail" }), {
      fallback: "Fallback",
      allowServerMessage: true,
    });
    expect(result).toBe("Server detail");
  });

  it("returns fallback when server message is not allowed and code is not mapped", () => {
    const result = getOrpcErrorMessage(new ORPCError("INTERNAL_SERVER_ERROR", { message: "Server detail" }), {
      fallback: "Fallback",
      allowServerMessage: false,
    });
    expect(result).toBe("Fallback");
  });

  it("uses readable message handling for non-oRPC errors", () => {
    const result = getOrpcErrorMessage("Custom string error", { fallback: "Fallback" });
    expect(result).toBe("Custom string error");
  });
});

describe("getResumeErrorMessage", () => {
  it("maps known resume error codes", () => {
    const result = getResumeErrorMessage(new ORPCError("RESUME_SLUG_ALREADY_EXISTS"));
    expect(result).toBe("A resume with this slug already exists.");
  });

  it("falls back for unknown resume error codes", () => {
    const result = getResumeErrorMessage(new ORPCError("FORBIDDEN"));
    expect(result).toBe("Something went wrong. Please try again.");
  });
});
