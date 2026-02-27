import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { db } from "@/integrations/drizzle/client";
import { printerService } from "@/integrations/orpc/services/printer";
import { getStorageService } from "@/integrations/orpc/services/storage";
import { logger } from "@/utils/logger";

const HEALTHCHECK_TIMEOUT_MS = 1_500;

type CheckResult = {
	status: "healthy" | "unhealthy";
	latencyMs: number;
	error?: string;
	[key: string]: unknown;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return "Unknown error";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	let timeoutId: NodeJS.Timeout | undefined;

	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
	});

	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
}

async function runCheck(check: () => Promise<object>): Promise<CheckResult> {
	const startedAt = performance.now();

	try {
		const data = await withTimeout(check(), HEALTHCHECK_TIMEOUT_MS);
		const latencyMs = Math.round(performance.now() - startedAt);
		const result = data as { status?: string };
		if (result.status === "unhealthy") return { ...(data as object), status: "unhealthy", latencyMs };
		return { ...(data as object), status: "healthy", latencyMs };
	} catch (error) {
		return {
			status: "unhealthy",
			error: getErrorMessage(error),
			latencyMs: Math.round(performance.now() - startedAt),
		};
	}
}

export async function healthHandler() {
	const [database, printer, storage] = await Promise.all([
		runCheck(checkDatabase),
		runCheck(checkPrinter),
		runCheck(checkStorage),
	]);
	const status = [database, printer, storage].some((check) => check.status === "unhealthy") ? "unhealthy" : "healthy";

	const checks = {
		service: "[REDACTED]",
		version: process.env.npm_package_version,
		status,
		timestamp: new Date().toISOString(),
		uptime: `${process.uptime().toFixed(2)}s`,
		database,
		printer,
		storage,
	};

	if (status === "unhealthy") {
		logger.warn("Healthcheck failed", {
			route: "/api/health",
			database,
			printer,
			storage,
		});
	}

	const headers = new Headers();
	const body = JSON.stringify(checks);
	headers.set("Content-Type", "application/json; charset=UTF-8");
	headers.set("Content-Length", Buffer.byteLength(body, "utf-8").toString());

	return new Response(body, {
		headers,
		status: checks.status === "unhealthy" ? 503 : 200,
	});
}

async function checkDatabase() {
	try {
		await db.execute(sql`SELECT 1`);
		return { status: "healthy" };
	} catch (error) {
		return {
			status: "unhealthy",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function checkPrinter() {
	try {
		const result = await printerService.healthcheck();

		return { status: "healthy", ...result };
	} catch (error) {
		return {
			status: "unhealthy",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function checkStorage() {
	try {
		const storageService = getStorageService();
		return await storageService.healthcheck();
	} catch (error) {
		return {
			status: "unhealthy",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: healthHandler,
		},
	},
});
