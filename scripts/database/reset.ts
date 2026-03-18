import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/utils/env";

export async function resetDatabase() {
  console.log("⌛ Resetting database...");

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`DROP SCHEMA drizzle CASCADE`);
      await tx.execute(sql`CREATE SCHEMA drizzle`);
      await tx.execute(sql`GRANT ALL ON SCHEMA drizzle TO postgres`);

      await tx.execute(sql`DROP SCHEMA public CASCADE`);
      await tx.execute(sql`CREATE SCHEMA public`);
      await tx.execute(sql`GRANT ALL ON SCHEMA public TO postgres`);
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
