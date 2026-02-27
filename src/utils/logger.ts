type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown> & {
	error?: unknown;
};

type SerializedError = {
	name: string;
	message: string;
	stack?: string;
};

function serializeError(error: unknown): SerializedError | undefined {
	if (!error) return undefined;
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}
	if (typeof error === "string") {
		return {
			name: "Error",
			message: error,
		};
	}
	if (typeof error === "object") {
		return {
			name: "Error",
			message: JSON.stringify(error),
		};
	}
	return {
		name: "Error",
		message: String(error),
	};
}

function log(level: LogLevel, message: string, context: LogContext = {}) {
	const { error, ...rest } = context;
	const payload = {
		ts: new Date().toISOString(),
		level,
		message,
		...rest,
		error: serializeError(error),
	};
	const json = JSON.stringify(payload);

	if (level === "error") {
		console.error(json);
		return;
	}

	if (level === "warn") {
		console.warn(json);
		return;
	}

	console.log(json);
}

export const logger = {
	debug: (message: string, context?: LogContext) => log("debug", message, context),
	info: (message: string, context?: LogContext) => log("info", message, context),
	warn: (message: string, context?: LogContext) => log("warn", message, context),
	error: (message: string, context?: LogContext) => log("error", message, context),
};
