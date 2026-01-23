import fs from "node:fs/promises";
import { and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type QueryResult } from "pg";
import { schema } from "@/integrations/drizzle";
import { ReactiveResumeV4JSONImporter } from "@/integrations/import/reactive-resume-v4-json";
import { defaultResumeData } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

// Types for the production database
type Visibility = "public" | "private";

interface ProductionResume {
	id: string;
	title: string;
	slug: string;
	data: unknown; // JSON data
	visibility: Visibility;
	locked: boolean;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

interface ProductionStatistics {
	id: string;
	views: number;
	downloads: number;
	resumeId: string;
	createdAt: Date;
	updatedAt: Date;
}

const productionUrl = process.env.PRODUCTION_DATABASE_URL;
const localUrl = process.env.DATABASE_URL;

if (!productionUrl) throw new Error("PRODUCTION_DATABASE_URL is not set");
if (!localUrl) throw new Error("DATABASE_URL is not set");

const productionPool = new Pool({ connectionString: productionUrl });
const localPool = new Pool({ connectionString: localUrl });

const productionDb = drizzle({ client: productionPool });
const localDb = drizzle({ client: localPool, schema });

// == Persistent mapping file paths ==
const USER_ID_MAP_FILE = "./scripts/migration/user-id-map.json";
const RESUME_ID_MAP_FILE = "./scripts/migration/resume-id-map.json";

// == Progress checkpoint file path ==
const PROGRESS_FILE = "./scripts/migration/resume-progress.json";

// You may tune this for your use case
// Reduced from 10000 to avoid PostgreSQL message format errors
const BATCH_SIZE = 10_000;

// Chunk size for actual inserts - smaller to avoid PostgreSQL message size limits
// Especially important for resumes as they contain large JSONB data
const INSERT_CHUNK_SIZE = 1000;

// == Progress checkpoint interface ==
// Uses cursor-based pagination with (createdAt, id) composite key for efficiency
interface MigrationProgress {
	// Cursor for pagination - last seen createdAt timestamp
	lastSeenCreatedAt: string | null;
	// Cursor for pagination - last seen id (for tiebreaker when timestamps are equal)
	lastSeenId: string | null;
	resumesCreated: number;
	statisticsCreated: number;
	skipped: number;
	totalResumesProcessed: number;
	errors: number;
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

async function loadResumeIdMapFromFile(): Promise<Map<string, string>> {
	try {
		const text = await fs.readFile(RESUME_ID_MAP_FILE, { encoding: "utf-8" });
		const obj = JSON.parse(text);
		return new Map(Object.entries(obj));
	} catch (e) {
		console.warn("⚠️  Failed to load resumeIdMap from disk, continuing with empty map.", e);
	}
	return new Map<string, string>();
}

async function saveResumeIdMapToFile(resumeIdMap: Map<string, string>) {
	const obj: Record<string, string> = Object.fromEntries(resumeIdMap.entries());
	await fs.writeFile(RESUME_ID_MAP_FILE, JSON.stringify(obj, null, "\t"), { encoding: "utf-8" });
}

export async function migrateResumes() {
	const migrationStart = performance.now();
	console.log("⌛ Starting resume migration...");

	let hasMore = true;

	// Cursor-based pagination state
	let lastSeenCreatedAt: string | null = null;
	let lastSeenId: string | null = null;

	// Load persistent ID maps from file
	const userIdMap = await loadUserIdMapFromFile();
	const resumeIdMap = await loadResumeIdMapFromFile();

	// Track migration stats
	let resumesCreated = 0;
	let statisticsCreated = 0;
	let skipped = 0;
	let totalResumesProcessed = 0;
	let errors = 0;

	// Load saved progress if exists
	const savedProgress = await loadProgress();
	if (savedProgress) {
		lastSeenCreatedAt = savedProgress.lastSeenCreatedAt;
		lastSeenId = savedProgress.lastSeenId;
		resumesCreated = savedProgress.resumesCreated;
		statisticsCreated = savedProgress.statisticsCreated;
		skipped = savedProgress.skipped;
		totalResumesProcessed = savedProgress.totalResumesProcessed;
		errors = savedProgress.errors;
	}

	// Helper to get current progress object
	const getCurrentProgress = (): MigrationProgress => ({
		lastSeenCreatedAt,
		lastSeenId,
		resumesCreated,
		statisticsCreated,
		skipped,
		totalResumesProcessed,
		errors,
		lastUpdated: new Date().toISOString(),
	});

	// Setup graceful shutdown handler
	const handleShutdown = async () => {
		if (shutdownRequested) return;
		shutdownRequested = true;
		console.log("\n⚠️  Shutdown requested. Saving progress...");
		await saveProgress(getCurrentProgress());
		await saveResumeIdMapToFile(resumeIdMap);
		console.log("👋 Exiting. Run the script again to resume from where you left off.");
		process.exit(0);
	};

	process.on("SIGINT", handleShutdown);
	process.on("SIGTERM", handleShutdown);

	// Initialize the importer
	const importer = new ReactiveResumeV4JSONImporter();

	while (hasMore) {
		// Check if shutdown was requested
		if (shutdownRequested) break;

		console.log(
			`📥 Fetching resumes batch from production database (cursor: createdAt=${lastSeenCreatedAt}, id=${lastSeenId})...`,
		);

		// Use cursor-based pagination for better performance
		// Tuple comparison syntax allows Postgres to use composite index efficiently
		let resumes: ProductionResume[];

		if (lastSeenCreatedAt && lastSeenId) {
			const result = (await productionDb.execute(sql`
				SELECT id, title, slug, data, visibility, locked, "userId", "createdAt", "updatedAt"
				FROM "Resume"
				WHERE ("createdAt", id) < (${lastSeenCreatedAt}::timestamp, ${lastSeenId})
				ORDER BY "createdAt" DESC, id DESC
				LIMIT ${BATCH_SIZE}
			`)) as unknown as QueryResult<ProductionResume>;
			resumes = result.rows;
		} else {
			const result = (await productionDb.execute(sql`
				SELECT id, title, slug, data, visibility, locked, "userId", "createdAt", "updatedAt"
				FROM "Resume"
				ORDER BY "createdAt" DESC, id DESC
				LIMIT ${BATCH_SIZE}
			`)) as unknown as QueryResult<ProductionResume>;
			resumes = result.rows;
		}

		console.log(`📋 Found ${resumes.length} resumes in this batch.`);

		if (resumes.length === 0) {
			hasMore = false;
			break;
		}

		// Fetch statistics only for these resumes in this batch
		const resumeIds = resumes.map((r) => r.id);

		// Drizzle does not interpolate arrays, so we join and use a custom SQL string
		// Escape single quotes in IDs (though UUIDs shouldn't contain them, this is safer)
		const resumeIdsForSql = resumeIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(", ");

		const { rows: statistics } = (await productionDb.execute(sql`
			SELECT id, views, downloads, "resumeId", "createdAt", "updatedAt"
			FROM "Statistics"
			WHERE "resumeId" IN (${sql.raw(resumeIdsForSql)})
		`)) as unknown as QueryResult<ProductionStatistics>;

		// Create a map of resumeId -> statistics for quick lookup
		const statisticsMap = new Map<string, ProductionStatistics>();
		for (const stat of statistics) {
			statisticsMap.set(stat.resumeId, stat);
		}

		// Filter out resumes where userId is not in userIdMap
		const resumesToProcess = resumes
			.map((resume) => {
				const newUserId = userIdMap.get(resume.userId);
				if (!newUserId) {
					skipped++;
					return null;
				}
				return { resume, newUserId };
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);

		if (resumesToProcess.length === 0) {
			console.log(`⏭️  All resumes in this batch have userIds not found in userIdMap.`);
			// Update cursor to the last resume in this batch
			const lastResume = resumes[resumes.length - 1];
			if (lastResume) {
				lastSeenCreatedAt =
					lastResume.createdAt instanceof Date ? lastResume.createdAt.toISOString() : String(lastResume.createdAt);
				lastSeenId = lastResume.id;
			}
			totalResumesProcessed += resumes.length;
			await saveProgress(getCurrentProgress());
			continue;
		}

		// Get unique userIds and bulk check if they exist in local database
		const uniqueUserIds = [...new Set(resumesToProcess.map((r) => r.newUserId))];
		const existingUsers = await localDb.select().from(schema.user).where(inArray(schema.user.id, uniqueUserIds));

		const existingUserIds = new Set(existingUsers.map((u) => u.id));

		// Filter out resumes where user doesn't exist
		const resumesWithValidUsers = resumesToProcess.filter(({ newUserId }) => {
			if (!existingUserIds.has(newUserId)) {
				skipped++;
				return false;
			}
			return true;
		});

		if (resumesWithValidUsers.length === 0) {
			console.log(`⏭️  All resumes in this batch have userIds not found in local database.`);
			// Update cursor to the last resume in this batch
			const lastResume = resumes[resumes.length - 1];
			if (lastResume) {
				lastSeenCreatedAt =
					lastResume.createdAt instanceof Date ? lastResume.createdAt.toISOString() : String(lastResume.createdAt);
				lastSeenId = lastResume.id;
			}
			totalResumesProcessed += resumes.length;
			await saveProgress(getCurrentProgress());
			continue;
		}

		// Bulk check for existing resumes (by slug + userId)
		// We need to check each unique combination
		const slugUserIdPairs = resumesWithValidUsers.map(({ resume, newUserId }) => ({
			slug: resume.slug,
			userId: newUserId,
		}));

		// Get all unique slugs and userIds
		const uniqueSlugs = [...new Set(slugUserIdPairs.map((p) => p.slug))];
		const userIdsForSlugCheck = [...new Set(slugUserIdPairs.map((p) => p.userId))];

		// Fetch all existing resumes that match any of our slugs and userIds
		const existingResumes = await localDb
			.select()
			.from(schema.resume)
			.where(and(inArray(schema.resume.slug, uniqueSlugs), inArray(schema.resume.userId, userIdsForSlugCheck)));

		// Create a set of existing slug+userId combinations
		const existingResumeKeys = new Set(existingResumes.map((r) => `${r.slug}:${r.userId}`));

		// Filter out resumes that already exist
		const resumesToInsert = resumesWithValidUsers.filter(({ resume, newUserId }) => {
			const key = `${resume.slug}:${newUserId}`;
			if (existingResumeKeys.has(key)) {
				skipped++;
				return false;
			}
			return true;
		});

		if (resumesToInsert.length === 0) {
			console.log(`⏭️  All resumes in this batch already exist in target DB.`);
			// Update cursor to the last resume in this batch
			const lastResume = resumes[resumes.length - 1];
			if (lastResume) {
				lastSeenCreatedAt =
					lastResume.createdAt instanceof Date ? lastResume.createdAt.toISOString() : String(lastResume.createdAt);
				lastSeenId = lastResume.id;
			}
			totalResumesProcessed += resumes.length;
			await saveProgress(getCurrentProgress());
			continue;
		}

		console.log(`📝 Preparing to bulk insert ${resumesToInsert.length} resumes...`);

		// Prepare bulk insert data
		const batchStart = performance.now();
		try {
			const resumesToInsertData = resumesToInsert.map(({ resume, newUserId }) => {
				// Transform the data using the V4 importer
				let transformedData = defaultResumeData;
				try {
					const dataJson = typeof resume.data === "string" ? resume.data : JSON.stringify(resume.data);
					transformedData = importer.parse(dataJson);
				} catch (error) {
					console.error(`⚠️  Failed to parse resume data for resume ${resume.id}, using default data:`, error);
					// Use default data if parsing fails
					transformedData = defaultResumeData;
				}

				// Map visibility to isPublic (visibility === "public" -> isPublic = true)
				const isPublic = resume.visibility === "public";

				const newResumeId = generateId();

				// Track the ID mapping for future reference
				resumeIdMap.set(resume.id, newResumeId);

				return {
					resumeData: {
						id: newResumeId,
						name: resume.title,
						slug: resume.slug,
						tags: [], // Default empty array
						isPublic: isPublic,
						isLocked: resume.locked,
						password: null, // No password in old schema
						data: transformedData,
						userId: newUserId,
						createdAt: resume.createdAt,
						updatedAt: resume.updatedAt,
					},
					originalResumeId: resume.id,
					newResumeId: newResumeId,
				};
			});

			// Bulk insert resumes (chunked to avoid PostgreSQL message size limits)
			// Resumes contain large JSONB data, so we use smaller chunks
			const resumeDataList = resumesToInsertData.map(({ resumeData }) => resumeData);
			for (let i = 0; i < resumeDataList.length; i += INSERT_CHUNK_SIZE) {
				const chunk = resumeDataList.slice(i, i + INSERT_CHUNK_SIZE);
				await localDb.insert(schema.resume).values(chunk);
			}
			resumesCreated += resumesToInsertData.length;

			// Prepare statistics for bulk insert
			const statisticsToInsert = resumesToInsertData
				.map(({ originalResumeId, newResumeId }) => {
					const resumeStatistics = statisticsMap.get(originalResumeId);
					if (!resumeStatistics) return null;

					return {
						id: generateId(),
						views: resumeStatistics.views,
						downloads: resumeStatistics.downloads,
						lastViewedAt: null, // Not available in old schema
						lastDownloadedAt: null, // Not available in old schema
						resumeId: newResumeId,
						createdAt: resumeStatistics.createdAt,
						updatedAt: resumeStatistics.updatedAt,
					};
				})
				.filter((stat): stat is NonNullable<typeof stat> => stat !== null);

			// Bulk insert statistics (chunked)
			if (statisticsToInsert.length > 0) {
				for (let i = 0; i < statisticsToInsert.length; i += INSERT_CHUNK_SIZE) {
					const chunk = statisticsToInsert.slice(i, i + INSERT_CHUNK_SIZE);
					await localDb.insert(schema.resumeStatistics).values(chunk);
				}
				statisticsCreated += statisticsToInsert.length;
			}

			const batchEnd = performance.now();
			const batchTimeMs = batchEnd - batchStart;
			console.log(
				`✅ Bulk inserted ${resumesToInsertData.length} resumes in ${batchTimeMs.toFixed(1)} ms (avg ${(batchTimeMs / resumesToInsertData.length).toFixed(1)} ms/resume)`,
			);

			// Save resume ID map after each successful batch
			await saveResumeIdMapToFile(resumeIdMap);
		} catch (error) {
			console.error(`🚨 Failed to bulk insert resumes batch:`, error);
			errors++;
			// Continue with next batch even if this one fails
		}

		// Update cursor to the last resume in this batch
		const lastResume = resumes[resumes.length - 1];
		if (lastResume) {
			lastSeenCreatedAt =
				lastResume.createdAt instanceof Date ? lastResume.createdAt.toISOString() : String(lastResume.createdAt);
			lastSeenId = lastResume.id;
		}

		totalResumesProcessed += resumes.length;
		console.log(`📦 Processed ${totalResumesProcessed} resumes so far...\n`);

		// Save progress after each batch
		await saveProgress(getCurrentProgress());
	}

	// Remove signal handlers
	process.off("SIGINT", handleShutdown);
	process.off("SIGTERM", handleShutdown);

	const migrationEnd = performance.now();
	const migrationDurationMs = migrationEnd - migrationStart;

	console.log("\n📊 Migration Summary:");
	console.log(`   Resumes created: ${resumesCreated}`);
	console.log(`   Statistics created: ${statisticsCreated}`);
	console.log(`   Skipped (userId not found or already exist): ${skipped}`);
	console.log(`   Errors: ${errors}`);
	console.log(
		`⏱️  Total migration time: ${migrationDurationMs.toFixed(1)} ms (${(migrationDurationMs / 1000).toFixed(2)} seconds)`,
	);

	// Final save of the mapping (ensures up-to-date state)
	await saveResumeIdMapToFile(resumeIdMap);

	// Clear progress file on successful completion (only if not interrupted)
	if (!shutdownRequested) {
		await clearProgress();
		console.log("✅ Resume migration complete!");
	} else {
		console.log("⏸️  Migration paused. Run again to resume.");
	}
}

if (import.meta.main) {
	// Reset shutdown flag for fresh run
	shutdownRequested = false;

	try {
		await migrateResumes();
	} finally {
		await productionPool.end();
		await localPool.end();
	}
}
