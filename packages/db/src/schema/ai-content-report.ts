import * as pg from "drizzle-orm/pg-core";
import { generateId } from "@reactive-resume/utils/string";
import { user } from "./auth";

/** Private, operator-reviewed safety reports; deleted with the reporting account. */
export const aiContentReport = pg.pgTable(
	"ai_content_report",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		source: pg.text("source").notNull(),
		reason: pg.text("reason").notNull(),
		content: pg.text("content").notNull(),
		note: pg.text("note").notNull(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		reviewedAt: pg.timestamp("reviewed_at", { withTimezone: true }),
	},
	(t) => [pg.index().on(t.reviewedAt, t.createdAt)],
);
