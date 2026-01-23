import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const productionUrl = process.env.PRODUCTION_DATABASE_URL;
if (!productionUrl) throw new Error("PRODUCTION_DATABASE_URL is not set");
const productionPool = new Pool({ connectionString: productionUrl });
const productionDb = drizzle({ client: productionPool });

const localUrl = process.env.DATABASE_URL;
if (!localUrl) throw new Error("DATABASE_URL is not set");
const localPool = new Pool({ connectionString: localUrl });
const localDb = drizzle({ client: localPool });

try {
	const productionResult = await productionDb.execute(sql`SELECT 1 as connected`);
	console.log("✅ Production database connection successful", JSON.stringify(productionResult));

	const localResult = await localDb.execute(sql`SELECT 1 as connected`);
	console.log("✅ Local database connection successful", JSON.stringify(localResult));
} catch (error) {
	console.error("🚨 Database connection failed:", error);
	process.exit(1);
} finally {
	await productionPool.end();
	await localPool.end();
	process.exit(0);
}
