import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@reactive-resume/env/server";
import { relations } from "./relations";
import * as schema from "./schema";

declare global {
	var __pool: Pool | undefined;
	var __drizzle: NodePgDatabase<typeof schema> | undefined;
}

function getPool() {
	if (!globalThis.__pool) {
		globalThis.__pool = new Pool({ connectionString: env.DATABASE_URL });
	}
	return globalThis.__pool;
}

function makeDrizzleClient() {
	const pool = getPool();
	return drizzle({ client: pool, schema, relations });
}

export function createDatabase() {
	if (!globalThis.__drizzle) {
		globalThis.__drizzle = makeDrizzleClient();
	}
	return globalThis.__drizzle;
}

export const db = createDatabase();
