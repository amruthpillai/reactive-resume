import type {
	AiMetadata,
	ApplicationStatus,
	ApplicationTimelineEntry,
	Contact,
} from "@reactive-resume/schema/applications/data";
import * as pg from "drizzle-orm/pg-core";
import { generateId } from "@reactive-resume/utils/string";
import { user } from "./auth";
import { resume } from "./resume";

// A tracked job application. Points at the live Reactive Resume that was sent (resumeId),
// which is the reason this lives inside the product rather than a generic tracker.
export const application = pg.pgTable(
	"application",
	{
		id: pg
			.text("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		company: pg.text("company").notNull(),
		role: pg.text("role").notNull(),
		location: pg.text("location"),
		salary: pg.text("salary"),
		// Fixed pipeline stage enum (see applicationStatusSchema); stored as text per repo convention.
		status: pg.text("status").$type<ApplicationStatus>().notNull().default("saved"),
		archived: pg.boolean("archived").notNull().default(false),
		// Live link to one of the user's resumes. Kept on resume delete (set null) so the
		// application history survives.
		resumeId: pg.text("resume_id").references(() => resume.id, { onDelete: "set null" }),
		source: pg.text("source"),
		tags: pg.text("tags").array().notNull().default([]),
		// --- AI reservations (no working AI this pass; see feature AI roadmap) ---
		sourceUrl: pg.text("source_url"),
		jobDescription: pg.text("job_description"),
		matchScore: pg.integer("match_score"),
		aiMetadata: pg.jsonb("ai_metadata").$type<AiMetadata>(),
		notes: pg.text("notes"),
		// An uploaded resume file (PDF) sent with this application, distinct from the live
		// resumeId link. Stored as the storage URL + original filename for display.
		resumeFileUrl: pg.text("resume_file_url"),
		resumeFileName: pg.text("resume_file_name"),
		// A cover letter sent with this application (PDF/doc uploaded to storage). Stored as the
		// key returned by the storage upload plus the original filename for display.
		coverLetterUrl: pg.text("cover_letter_url"),
		coverLetterName: pg.text("cover_letter_name"),
		followUpAt: pg.timestamp("follow_up_at", { withTimezone: true }),
		followUpNote: pg.text("follow_up_note"),
		contacts: pg.jsonb("contacts").notNull().$type<Contact[]>().default([]),
		activity: pg.jsonb("activity").notNull().$type<ApplicationTimelineEntry[]>().default([]),
		appliedAt: pg.timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId), pg.index().on(t.userId, t.updatedAt.desc())],
);
