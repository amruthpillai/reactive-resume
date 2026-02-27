import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { definePlugin } from "nitro";
import { Pool } from "pg";

async function migrateDatabase() {
	console.log("⌛ Running database migrations...");

	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error("DATABASE_URL is not set");
	}

	const pool = new Pool({ connectionString });
	const db = drizzle({ client: pool });

	try {
		await migrate(db, { migrationsFolder: "./migrations" });
		console.log("✅ Database migrations completed");
	} catch (error) {
		console.error("🚨 Database migrations failed:", error);
		throw error;
	} finally {
		await pool.end();
	}
}

export default definePlugin(async () => {
	await migrateDatabase();
});
