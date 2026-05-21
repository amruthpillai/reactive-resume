import type { ResumeSlot, TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import * as pg from "drizzle-orm/pg-core";
import { generateId } from "@reactive-resume/utils/string";
import { user } from "./auth";

export const template = pg.pgTable(
	"template",
	{
		id: pg
			.text("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name").notNull(),
		description: pg.text("description"),
		author: pg.text("author"),
		tags: pg.text("tags").array().notNull().default([]),
		files: pg
			.jsonb("files")
			.notNull()
			.$type<Record<string, string>>()
			.$defaultFn(() => ({})),
		metadata: pg
			.jsonb("metadata")
			.notNull()
			.$type<TemplateMetadata>()
			.$defaultFn(() => ({
				id: "",
				name: "",
				sidebarPosition: "none",
				tags: [],
				fonts: [],
				typography: [],
			})),
		inputs: pg
			.jsonb("inputs")
			.notNull()
			.$type<ResumeSlot[]>()
			.$defaultFn(() => []),
		userId: pg.text("user_id").references(() => user.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId), pg.index().on(t.createdAt.asc())],
);
