import * as pg from "drizzle-orm/pg-core";
import z from "zod";
import type { IconName } from "@/schema/icons";
import { defaultResumeData, type ResumeData } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

export const user = pg.pgTable(
	"user",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		image: pg.text("image"),
		name: pg.text("name").notNull(),
		email: pg.text("email").notNull().unique(),
		emailVerified: pg.boolean("email_verified").notNull().default(false),
		username: pg.text("username").notNull().unique(),
		displayUsername: pg.text("display_username").notNull().unique(),
		twoFactorEnabled: pg.boolean("two_factor_enabled").notNull().default(false),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.email), pg.index().on(t.username)],
);

export const session = pg.pgTable(
	"session",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		token: pg.text("token").notNull().unique(),
		ipAddress: pg.text("ip_address"),
		userAgent: pg.text("user_agent"),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		expiresAt: pg.timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.token, t.userId), pg.index().on(t.expiresAt)],
);

export const account = pg.pgTable(
	"account",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		accountId: pg.text("account_id").notNull(),
		providerId: pg.text("provider_id").notNull().default("credential"),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		scope: pg.text("scope"),
		idToken: pg.text("id_token"),
		password: pg.text("password"),
		accessToken: pg.text("access_token"),
		refreshToken: pg.text("refresh_token"),
		accessTokenExpiresAt: pg.timestamp("access_token_expires_at", { withTimezone: true }),
		refreshTokenExpiresAt: pg.timestamp("refresh_token_expires_at", { withTimezone: true }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId)],
);

export const verification = pg.pgTable(
	"verification",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		identifier: pg.text("identifier").notNull().unique(),
		value: pg.text("value").notNull(),
		expiresAt: pg.timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.identifier)],
);

export const twoFactor = pg.pgTable(
	"two_factor",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		secret: pg.text("secret"),
		backupCodes: pg.text("backup_codes"),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId), pg.index().on(t.secret)],
);

export const passkey = pg.pgTable(
	"passkey",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name"),
		aaguid: pg.text("aaguid"),
		publicKey: pg.text("public_key").notNull(),
		credentialID: pg.text("credential_id").notNull(),
		counter: pg.integer("counter").notNull(),
		deviceType: pg.text("device_type").notNull(),
		backedUp: pg.boolean("backed_up").notNull().default(false),
		transports: pg.text("transports").notNull(),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId)],
);

export const apikey = pg.pgTable(
	"apikey",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name"),
		start: pg.text("start"),
		prefix: pg.text("prefix"),
		key: pg.text("key").notNull(),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		refillInterval: pg.integer("refill_interval"),
		refillAmount: pg.integer("refill_amount"),
		lastRefillAt: pg.timestamp("last_refill_at", { withTimezone: true }),
		enabled: pg.boolean("enabled").notNull().default(true),
		rateLimitEnabled: pg.boolean("rate_limit_enabled").notNull().default(false),
		rateLimitTimeWindow: pg.integer("rate_limit_time_window"),
		rateLimitMax: pg.integer("rate_limit_max"),
		requestCount: pg.integer("request_count").notNull().default(0),
		remaining: pg.integer("remaining"),
		lastRequest: pg.timestamp("last_request", { withTimezone: true }),
		expiresAt: pg.timestamp("expires_at", { withTimezone: true }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
		permissions: pg.text("permissions"),
		metadata: pg.jsonb("metadata"),
	},
	(t) => [pg.index().on(t.userId), pg.index().on(t.key), pg.index().on(t.enabled, t.userId)],
);

export const resume = pg.pgTable(
	"resume",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name").notNull(),
		slug: pg.text("slug").notNull(),
		tags: pg.text("tags").array().notNull().default([]),
		isPublic: pg.boolean("is_public").notNull().default(false),
		isLocked: pg.boolean("is_locked").notNull().default(false),
		password: pg.text("password"),
		data: pg
			.jsonb("data")
			.notNull()
			.$type<ResumeData>()
			.$defaultFn(() => defaultResumeData),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [
		pg.unique().on(t.slug, t.userId),
		pg.index().on(t.userId),
		pg.index().on(t.userId, t.updatedAt.desc()),
		pg.index().on(t.isPublic, t.slug, t.userId),
	],
);

export const resumeStatistics = pg.pgTable(
	"resume_statistics",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		views: pg.integer("views").notNull().default(0),
		downloads: pg.integer("downloads").notNull().default(0),
		lastViewedAt: pg.timestamp("last_viewed_at", { withTimezone: true }),
		lastDownloadedAt: pg.timestamp("last_downloaded_at", { withTimezone: true }),
		resumeId: pg
			.uuid("resume_id")
			.unique()
			.notNull()
			.references(() => resume.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.resumeId)],
);

export const campaign = pg.pgTable(
	"campaign",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name").notNull(),
		description: pg.text("description"),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		archivedAt: pg.timestamp("archived_at", { withTimezone: true }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId), pg.index().on(t.userId, t.updatedAt.desc())],
);

const applicationStatusTypeValues = [
	"backlog", // jobs that you're interested in, but haven't applied to yet
	"applied", // jobs that you've applied to
	"interviewing", // jobs that you've been interviewed at least once for
	"offered", // jobs that you've been offered a job at
	"accepted", // jobs that you've accepted an offer for
	"rejected", // jobs that you've been rejected from
	"ghosted", // jobs that you've been ghosted by (i.e. no response after applying, or after an interview)
	"withdrawn", // jobs that you've withdrawn from (i.e. you no longer want to apply or continue the process)
] as const;

export type ApplicationStatusType = (typeof applicationStatusTypeValues)[number];

export const applicationStatusType = pg.pgEnum("application_status_type_enum", applicationStatusTypeValues);

export const applicationStatus = pg.pgTable(
	"application_status",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		type: applicationStatusType("type").notNull().default("backlog"),
		name: pg.text("name"), // optional, to override the default name for the status type (e.g. "Backlog" -> "To Apply")
		order: pg.integer("order").notNull(),
		icon: pg.text("icon").notNull().$type<IconName>().default(""),
		color: pg.text("color").notNull().default("currentColor"),
		isHidden: pg.boolean("is_hidden").notNull().default(false),
		campaignId: pg
			.uuid("campaign_id")
			.notNull()
			.references(() => campaign.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [
		pg.index().on(t.campaignId),
		pg.index().on(t.campaignId, t.order.asc()),
		pg.unique().on(t.campaignId, t.order),
	],
);

export const officeTypeValues = ["unknown", "remote", "onsite", "hybrid"] as const;

export type OfficeType = (typeof officeTypeValues)[number];

export const officeType = pg.pgEnum("office_type_enum", officeTypeValues);

export const priorityValues = ["none", "low", "medium", "high"] as const;

export type Priority = (typeof priorityValues)[number];

export const priority = pg.pgEnum("priority_enum", priorityValues);

export const applicationSourceValues = [
	"job_board", // e.g. LinkedIn, Indeed, Glassdoor, etc.
	"company_website", // e.g. company's website, job posting page, etc.
	"referral", // e.g. referred by an employee
	"recruiter_outreach", // e.g. recruiter reached out to you
	"job_fair", // e.g. job fair, career fair, etc.
	"networking", // e.g. networking event, meetup, etc.
	"other", // e.g. other source not listed above
] as const;

export type ApplicationSource = (typeof applicationSourceValues)[number];

export const applicationSource = pg.pgEnum("application_source_enum", applicationSourceValues);

export const application = pg.pgTable(
	"application",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		// Job Title
		jobTitle: pg.text("job_title").notNull(),
		// Company
		companyName: pg.text("company_name").notNull(),
		companyUrl: pg.text("company_url"),
		// Job Description
		jobDescriptionUrl: pg.text("job_description_url"),
		jobDescriptionText: pg.text("job_description_text"), // optional, to store the job description text if the URL is not available
		// Office Location and Type
		officeLocation: pg.text("office_location"),
		officeType: officeType("office_type").notNull().default("unknown"),
		// Source
		source: applicationSource("source").notNull().default("other"),
		sourceDetails: pg.text("source_details"),
		// Priority
		priority: priority("priority").notNull().default("none"),
		// Salary
		salaryMin: pg.integer("salary_min").notNull().default(0),
		salaryMax: pg.integer("salary_max").notNull().default(0),
		salaryCurrency: pg.text("salary_currency").notNull().default("USD"),
		// Resume
		resumeUrl: pg.text("resume_url"),
		resumeId: pg.uuid("resume_id").references(() => resume.id, { onDelete: "set null" }),
		// Cover Letter
		coverLetterUrl: pg.text("cover_letter_url"),
		coverLetterText: pg.text("cover_letter_text"),
		// Status and Order
		statusId: pg
			.uuid("status_id")
			.notNull()
			.references(() => applicationStatus.id, { onDelete: "cascade" }),
		order: pg.integer("order").notNull(),
		// Campaign
		campaignId: pg
			.uuid("campaign_id")
			.notNull()
			.references(() => campaign.id, { onDelete: "cascade" }),
		// Important Dates
		appliedAt: pg.timestamp("applied_at", { withTimezone: true }),
		firstResponseAt: pg.timestamp("first_response_at", { withTimezone: true }),
		offeredAt: pg.timestamp("offered_at", { withTimezone: true }),
		rejectedAt: pg.timestamp("rejected_at", { withTimezone: true }),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [
		pg.index().on(t.campaignId),
		pg.index().on(t.resumeId),
		pg.index().on(t.statusId),
		pg.index().on(t.statusId, t.order.asc()),
		pg.unique().on(t.statusId, t.order),
	],
);

export const applicationContactTypeValues = [
	"referral",
	"recruiter",
	"hiring_manager",
	"interviewer",
	"other",
] as const;

export type ApplicationContactType = (typeof applicationContactTypeValues)[number];

export const applicationContactType = pg.pgEnum("application_contact_type_enum", applicationContactTypeValues);

export const applicationContact = pg.pgTable("application_contact", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	type: applicationContactType("type").notNull().default("other"),
	name: pg.text("name"),
	email: pg.text("email"),
	phone: pg.text("phone"),
	url: pg.text("url"),
	note: pg.text("note"),
	applicationId: pg
		.uuid("application_id")
		.notNull()
		.references(() => application.id, { onDelete: "cascade" }),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const applicationDocumentTypeValues = [
	"resume", // your resume (can be skipped, if resumeId is provided instead)
	"cover_letter", // a cover letter you wrote for the application
	"portfolio", // a portfolio of your work (e.g. a portfolio website, a GitHub profile, etc.)
	"work_sample", // a sample of your work (e.g. a coding challenge, a design project, etc.)
	"reference_letter", // a reference or recommendation letter you submitted for the application (e.g. from a previous employer, professor, etc.)
	"transcript", // a transcript of your academic performance
	"other", // other documents (not listed above)
] as const;

export type ApplicationDocumentType = (typeof applicationDocumentTypeValues)[number];

export const applicationDocumentType = pg.pgEnum("application_document_type_enum", applicationDocumentTypeValues);

export const applicationDocument = pg.pgTable(
	"application_document",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		type: applicationDocumentType("type").notNull().default("other"),
		name: pg.text("name"),
		url: pg.text("url"),
		note: pg.text("note"),
		applicationId: pg
			.uuid("application_id")
			.notNull()
			.references(() => application.id, { onDelete: "cascade" }),
	},
	(t) => [pg.index().on(t.applicationId)],
);

export const applicationComment = pg.pgTable(
	"application_comment",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		message: pg.text("message").notNull(),
		applicationId: pg
			.uuid("application_id")
			.notNull()
			.references(() => application.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.applicationId), pg.index().on(t.applicationId, t.createdAt.desc())],
);

export const applicationInterviewStatusValues = ["scheduled", "completed", "cancelled"] as const;

export type ApplicationInterviewStatus = (typeof applicationInterviewStatusValues)[number];

export const applicationInterviewStatus = pg.pgEnum(
	"application_interview_status_enum",
	applicationInterviewStatusValues,
);

export const applicationInterview = pg.pgTable(
	"application_interview",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		// Schema: [Type of Interview] - [Interviewer Name] (e.g. "System Design Interview - John Doe")
		name: pg.text("name").notNull(),
		status: applicationInterviewStatus("status").notNull().default("scheduled"),
		// Scheduled timestamp, and duration in minutes
		scheduledAt: pg.timestamp("scheduled_at", { withTimezone: true }).notNull(),
		durationMinutes: pg.integer("duration_minutes").notNull().default(60),
		// Physical address OR link to a meeting invite (e.g. Zoom, Google Meet, etc.)
		location: pg.text("location"),
		// Interviewer Information
		interviewerName: pg.text("interviewer_name"),
		interviewerEmail: pg.text("interviewer_email"),
		interviewerPhone: pg.text("interviewer_phone"),
		interviewerUrl: pg.text("interviewer_url"), // link to interviewer's profile on LinkedIn, their website, etc.
		// Pre-Interview Notes
		notes: pg.text("notes"),
		// Post-Interview Feedback
		feedback: pg.text("feedback"),
		applicationId: pg
			.uuid("application_id")
			.notNull()
			.references(() => application.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [
		pg.index().on(t.applicationId),
		pg.index().on(t.applicationId, t.createdAt.desc()),
		pg.index().on(t.scheduledAt.desc()),
	],
);

const applicationActivitySchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("created") }),
	z.object({
		type: z.literal("updated"),
		changes: z.array(z.object({ from: z.unknown(), to: z.unknown() })).optional(),
	}),
	z.object({
		type: z.literal("status_changed"),
		fromStatus: z.object({ id: z.string(), name: z.string() }),
		toStatus: z.object({ id: z.string(), name: z.string() }),
		note: z.string().optional(),
	}),
]);

export const applicationActivity = pg.pgTable(
	"application_activity",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		payload: pg.jsonb("payload").notNull().$type<z.infer<typeof applicationActivitySchema>>(),
		applicationId: pg
			.uuid("application_id")
			.notNull()
			.references(() => application.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.applicationId), pg.index().on(t.applicationId, t.createdAt.desc())],
);
