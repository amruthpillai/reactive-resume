import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { env } from "@/utils/env";

export async function migrateDatabase() {
  console.log("⌛ Running database migrations...");

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("🚨 Database migrations failed:", error);
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  await migrateDatabase();
}
