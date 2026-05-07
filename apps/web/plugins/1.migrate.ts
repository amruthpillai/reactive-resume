import { existsSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { definePlugin } from "nitro";
import { Pool } from "pg";
import { env } from "@reactive-resume/env/server";

function resolveMigrationsFolder(): string {
	let dir = import.meta.dirname;

	while (dir !== path.dirname(dir)) {
		const candidate = path.join(dir, "migrations");
		if (existsSync(candidate)) return candidate;
		dir = path.dirname(dir);
	}

	throw new Error(`Could not locate migrations folder relative to ${import.meta.dirname}`);
}

const migrationsFolder = resolveMigrationsFolder();

export default definePlugin(async () => {
	console.info("Running database migrations...");

	const connectionString = env.DATABASE_URL;

	const pool = new Pool({ connectionString });
	const db = drizzle({ client: pool });

	try {
		await migrate(db, { migrationsFolder });
		console.info("Database migrations completed");
	} catch (error) {
		console.error("Database migrations failed", { error });
		throw error;
	} finally {
		await pool.end();
	}
});
