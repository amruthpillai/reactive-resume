import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/utils/env";

export async function resetDatabase() {
	console.log("⌛ Resetting database...");

	const pool = new Pool({ connectionString: env.DATABASE_URL });
	const db = drizzle({ client: pool });

	// Extract the username from a PostgreSQL connection string like: postgresql://postgres:password@localhost:5432/db
	const username = (() => {
		try {
			const match = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):[^@]+@/);
			return match ? match[1] : undefined;
		} catch {
			return undefined;
		}
	})();

	console.log("🔑 Username:", username);

	try {
		await db.transaction(async (tx) => {
			await tx.execute(sql`DROP SCHEMA drizzle CASCADE`);
			await tx.execute(sql`CREATE SCHEMA drizzle`);
			await tx.execute(sql.raw(`GRANT ALL ON SCHEMA drizzle TO ${username}`));

			await tx.execute(sql`DROP SCHEMA public CASCADE`);
			await tx.execute(sql`CREATE SCHEMA public`);
			await tx.execute(sql.raw(`GRANT ALL ON SCHEMA public TO ${username}`));
		});

		console.log("✅ Database reset completed");
	} catch (error) {
		console.error("🚨 Database reset failed:", error);
	} finally {
		await pool.end();
	}
}

if (import.meta.main) {
	await resetDatabase();
}
