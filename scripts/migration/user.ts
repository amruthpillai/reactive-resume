import fs from "node:fs/promises";
import { inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type QueryResult } from "pg";
import { schema } from "@/integrations/drizzle";
import { generateId, toUsername } from "@/utils/string";

type Provider = "credential" | "google" | "github" | "custom";

// Types for the production database
type ProductionProvider = "email" | "github" | "google" | "openid";

interface ProductionUser {
	id: string;
	name: string;
	picture: string | null;
	username: string;
	email: string;
	locale: string;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
	provider: ProductionProvider;
}

interface ProductionSecrets {
	id: string;
	password: string | null;
	lastSignedIn: Date;
	userId: string;
}

// Map old provider to new providerId
function mapProviderId(provider: ProductionProvider): Provider {
	switch (provider) {
		case "email":
			return "credential";
		case "google":
			return "google";
		case "github":
			return "github";
		default:
			return "custom";
	}
}

const productionUrl = process.env.PRODUCTION_DATABASE_URL;
const localUrl = process.env.DATABASE_URL;

if (!productionUrl) throw new Error("PRODUCTION_DATABASE_URL is not set");
if (!localUrl) throw new Error("DATABASE_URL is not set");

const productionPool = new Pool({ connectionString: productionUrl });
const localPool = new Pool({ connectionString: localUrl });

const productionDb = drizzle({ client: productionPool });
const localDb = drizzle({ client: localPool, schema });

// == Persistent mapping file path ==
const USER_ID_MAP_FILE = "./scripts/migration/user-id-map.json";

// == Progress checkpoint file path ==
const PROGRESS_FILE = "./scripts/migration/user-progress.json";

// You may tune this for your use case
const BATCH_SIZE = 10_000;

// Chunk size for actual inserts - smaller to avoid PostgreSQL message size limits
const INSERT_CHUNK_SIZE = 1000;

// == Progress checkpoint interface ==
// Uses cursor-based pagination with (createdAt, id) composite key for efficiency
interface MigrationProgress {
	// Cursor for pagination - last seen createdAt timestamp
	lastSeenCreatedAt: string | null;
	// Cursor for pagination - last seen id (for tiebreaker when timestamps are equal)
	lastSeenId: string | null;
	usersCreated: number;
	accountsCreated: number;
	skipped: number;
	totalUsersProcessed: number;
	lastUpdated: string;
}

// Flag to track if shutdown was requested
let shutdownRequested = false;

async function loadProgress(): Promise<MigrationProgress | null> {
	try {
		const text = await fs.readFile(PROGRESS_FILE, { encoding: "utf-8" });
		const progress = JSON.parse(text) as MigrationProgress;
		console.log(`📂 Found existing progress file. Last updated: ${progress.lastUpdated}`);
		console.log(`   Resuming from cursor (createdAt: ${progress.lastSeenCreatedAt}, id: ${progress.lastSeenId})...`);
		return progress;
	} catch (e) {
		console.warn("⚠️  Failed to load progress file, starting from beginning.", e);
	}
	return null;
}

async function saveProgress(progress: MigrationProgress): Promise<void> {
	try {
		progress.lastUpdated = new Date().toISOString();
		await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2), { encoding: "utf-8" });
		console.log(`💾 Progress saved at cursor (createdAt: ${progress.lastSeenCreatedAt}, id: ${progress.lastSeenId})`);
	} catch (e) {
		console.error("🚨 Failed to save progress:", e);
	}
}

async function clearProgress(): Promise<void> {
	try {
		await fs.unlink(PROGRESS_FILE);
		console.log("🗑️  Progress file cleared.");
	} catch {
		// Ignore errors when clearing
	}
}

async function loadUserIdMapFromFile(): Promise<Map<string, string>> {
	try {
		const text = await fs.readFile(USER_ID_MAP_FILE, { encoding: "utf-8" });
		const obj = JSON.parse(text);
		return new Map(Object.entries(obj));
	} catch (e) {
		console.warn("⚠️  Failed to load userIdMap from disk, continuing with empty map.", e);
	}
	return new Map<string, string>();
}

async function saveUserIdMapToFile(userIdMap: Map<string, string>) {
	const obj: Record<string, string> = Object.fromEntries(userIdMap.entries());
	await fs.writeFile(USER_ID_MAP_FILE, JSON.stringify(obj, null, "\t"), { encoding: "utf-8" });
}

export async function migrateUsers() {
	const migrationStart = performance.now();
	console.log("⌛ Starting user migration...");

	let hasMore = true;

	// Cursor-based pagination state
	let lastSeenCreatedAt: string | null = null;
	let lastSeenId: string | null = null;

	// Load persistent userIdMap from file
	const userIdMap = await loadUserIdMapFromFile();

	// Track migration stats
	let usersCreated = 0;
	let accountsCreated = 0;
	let skipped = 0;
	let totalUsersProcessed = 0;

	// Load saved progress if exists
	const savedProgress = await loadProgress();
	if (savedProgress) {
		lastSeenCreatedAt = savedProgress.lastSeenCreatedAt;
		lastSeenId = savedProgress.lastSeenId;
		usersCreated = savedProgress.usersCreated;
		accountsCreated = savedProgress.accountsCreated;
		skipped = savedProgress.skipped;
		totalUsersProcessed = savedProgress.totalUsersProcessed;
	}

	// Helper to get current progress object
	const getCurrentProgress = (): MigrationProgress => ({
		lastSeenCreatedAt,
		lastSeenId,
		usersCreated,
		accountsCreated,
		skipped,
		totalUsersProcessed,
		lastUpdated: new Date().toISOString(),
	});

	// Setup graceful shutdown handler
	const handleShutdown = async () => {
		if (shutdownRequested) return;
		shutdownRequested = true;
		console.log("\n⚠️  Shutdown requested. Saving progress...");
		await saveProgress(getCurrentProgress());
		await saveUserIdMapToFile(userIdMap);
		console.log("👋 Exiting. Run the script again to resume from where you left off.");
		process.exit(0);
	};

	process.on("SIGINT", handleShutdown);
	process.on("SIGTERM", handleShutdown);

	while (hasMore) {
		// Check if shutdown was requested
		if (shutdownRequested) break;

		console.log(
			`📥 Fetching users batch from production database (cursor: createdAt=${lastSeenCreatedAt}, id=${lastSeenId})...`,
		);

		let users: ProductionUser[];

		if (lastSeenCreatedAt && lastSeenId) {
			const result = (await productionDb.execute(sql`
				SELECT id, name, picture, username, email, locale, "emailVerified", "createdAt", "updatedAt", provider
				FROM "User"
				WHERE ("createdAt", id) < (${lastSeenCreatedAt}::timestamp, ${lastSeenId})
				ORDER BY "createdAt" DESC, id DESC
				LIMIT ${BATCH_SIZE}
			`)) as unknown as QueryResult<ProductionUser>;
			users = result.rows;
		} else {
			const result = (await productionDb.execute(sql`
				SELECT id, name, picture, username, email, locale, "emailVerified", "createdAt", "updatedAt", provider
				FROM "User"
				ORDER BY "createdAt" DESC, id DESC
				LIMIT ${BATCH_SIZE}
			`)) as unknown as QueryResult<ProductionUser>;
			users = result.rows;
		}

		console.log(`📋 Found ${users.length} users in this batch.`);

		if (users.length === 0) {
			hasMore = false;
			break;
		}

		// Fetch secrets only for these users in this batch
		const userIds = users.map((u) => u.id);

		// Drizzle does not interpolate arrays, so we join and use a custom SQL string
		// Escape single quotes in IDs (though UUIDs shouldn't contain them, this is safer)
		const userIdsForSql = userIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(", ");

		const { rows: secrets } = (await productionDb.execute(sql`
			SELECT id, password, "lastSignedIn", "userId"
			FROM "Secrets"
			WHERE "userId" IN (${sql.raw(userIdsForSql)})
		`)) as unknown as QueryResult<ProductionSecrets>;

		// Create a map of userId -> secrets for quick lookup
		const secretsMap = new Map<string, ProductionSecrets>();
		for (const secret of secrets) {
			secretsMap.set(secret.userId, secret);
		}

		// Filter out users already in userIdMap (previously migrated)
		const usersToProcess = users.filter((user) => {
			if (userIdMap.has(user.id)) {
				skipped++;
				return false;
			}
			return true;
		});

		if (usersToProcess.length === 0) {
			console.log(`⏭️  All users in this batch were already migrated.`);
			// Update cursor to the last user in this batch
			const lastUser = users[users.length - 1];
			if (lastUser) {
				lastSeenCreatedAt =
					lastUser.createdAt instanceof Date ? lastUser.createdAt.toISOString() : String(lastUser.createdAt);
				lastSeenId = lastUser.id;
			}
			totalUsersProcessed += users.length;
			await saveProgress(getCurrentProgress());
			continue;
		}

		// Prepare usernames for all users
		const userData = usersToProcess.map((user) => ({
			user,
			username: toUsername(user.username),
			displayUsername: user.username,
		}));

		// Bulk check for existing users (by email or username)
		const emails = userData.map((u) => u.user.email);
		const usernames = userData.map((u) => u.username);
		const displayUsernames = userData.map((u) => u.displayUsername);

		const existingUsers = await localDb
			.select()
			.from(schema.user)
			.where(
				or(
					inArray(schema.user.email, emails),
					inArray(schema.user.username, usernames),
					inArray(schema.user.displayUsername, displayUsernames),
				),
			);

		const existingEmails = new Set(existingUsers.map((u) => u.email));
		const existingUsernames = new Set(existingUsers.map((u) => u.username));
		const existingDisplayUsernames = new Set(existingUsers.map((u) => u.displayUsername));

		// Filter out users that already exist
		const usersToInsert = userData.filter(({ user, username, displayUsername }) => {
			if (
				existingEmails.has(user.email) ||
				existingUsernames.has(username) ||
				existingDisplayUsernames.has(displayUsername)
			) {
				skipped++;
				return false;
			}
			return true;
		});

		if (usersToInsert.length === 0) {
			console.log(`⏭️  All users in this batch already exist in target DB.`);
			// Update cursor to the last user in this batch
			const lastUser = users[users.length - 1];
			if (lastUser) {
				lastSeenCreatedAt =
					lastUser.createdAt instanceof Date ? lastUser.createdAt.toISOString() : String(lastUser.createdAt);
				lastSeenId = lastUser.id;
			}
			totalUsersProcessed += users.length;
			await saveUserIdMapToFile(userIdMap);
			await saveProgress(getCurrentProgress());
			continue;
		}

		console.log(`📝 Preparing to bulk insert ${usersToInsert.length} users...`);

		// Prepare bulk insert data
		const usersToInsertData = usersToInsert.map(({ user, username, displayUsername }) => {
			const newUserId = generateId();
			userIdMap.set(user.id, newUserId);
			return {
				userData: {
					id: newUserId,
					name: user.name,
					email: user.email,
					image: user.picture,
					username: username,
					displayUsername: displayUsername,
					emailVerified: user.emailVerified,
					twoFactorEnabled: false, // All users start with 2FA disabled in the new system
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
				originalUser: user,
				newUserId: newUserId,
			};
		});

		// Bulk insert users (chunked to avoid PostgreSQL message size limits)
		const batchStart = performance.now();
		try {
			const userDataList = usersToInsertData.map(({ userData }) => userData);
			for (let i = 0; i < userDataList.length; i += INSERT_CHUNK_SIZE) {
				const chunk = userDataList.slice(i, i + INSERT_CHUNK_SIZE);
				await localDb.insert(schema.user).values(chunk);
			}
			usersCreated += usersToInsertData.length;

			// Prepare accounts for bulk insert
			const accountsToInsert = usersToInsertData.map(({ originalUser, newUserId, userData }) => {
				const userSecrets = secretsMap.get(originalUser.id);
				const providerId = mapProviderId(originalUser.provider);
				const accountId = providerId === "credential" ? newUserId : originalUser.id;

				return {
					id: generateId(),
					userId: newUserId,
					accountId: accountId,
					providerId: providerId,
					password: userSecrets?.password ?? null,
					createdAt: userData.createdAt,
					updatedAt: userData.updatedAt,
				};
			});

			// Bulk insert accounts (chunked)
			for (let i = 0; i < accountsToInsert.length; i += INSERT_CHUNK_SIZE) {
				const chunk = accountsToInsert.slice(i, i + INSERT_CHUNK_SIZE);
				await localDb.insert(schema.account).values(chunk);
			}
			accountsCreated += accountsToInsert.length;

			const batchEnd = performance.now();
			const batchTimeMs = batchEnd - batchStart;
			console.log(
				`✅ Bulk inserted ${usersToInsertData.length} users in ${batchTimeMs.toFixed(1)} ms (avg ${(batchTimeMs / usersToInsertData.length).toFixed(1)} ms/user)`,
			);

			// Save progress after each batch
			await saveUserIdMapToFile(userIdMap);
		} catch (error) {
			console.error(`🚨 Failed to bulk insert users batch:`, error);
			// Continue with next batch even if this one fails
		}

		// Update cursor to the last user in this batch
		const lastUser = users[users.length - 1];
		if (lastUser) {
			lastSeenCreatedAt =
				lastUser.createdAt instanceof Date ? lastUser.createdAt.toISOString() : String(lastUser.createdAt);
			lastSeenId = lastUser.id;
		}

		totalUsersProcessed += users.length;
		console.log(`📦 Processed ${totalUsersProcessed} users so far...\n`);

		// Save progress after updating cursor
		await saveProgress(getCurrentProgress());
	}

	// Remove signal handlers
	process.off("SIGINT", handleShutdown);
	process.off("SIGTERM", handleShutdown);

	const migrationEnd = performance.now();
	const migrationDurationMs = migrationEnd - migrationStart;

	console.log("\n📊 Migration Summary:");
	console.log(`   Users created: ${usersCreated}`);
	console.log(`   Accounts created: ${accountsCreated}`);
	console.log(`   Skipped (already exist): ${skipped}`);
	console.log(
		`⏱️  Total migration time: ${migrationDurationMs.toFixed(1)} ms (${(migrationDurationMs / 1000).toFixed(2)} seconds)`,
	);

	// Final save of the mapping (ensures up-to-date state)
	await saveUserIdMapToFile(userIdMap);

	// Clear progress file on successful completion (only if not interrupted)
	if (!shutdownRequested) {
		await clearProgress();
		console.log("✅ User migration complete!");
	} else {
		console.log("⏸️  Migration paused. Run again to resume.");
	}

	// Return the ID mapping for use in other migrations (e.g., resumes)
	return userIdMap;
}

if (import.meta.main) {
	// Reset shutdown flag for fresh run
	shutdownRequested = false;

	try {
		await migrateUsers();
	} finally {
		await productionPool.end();
		await localPool.end();
	}
}
