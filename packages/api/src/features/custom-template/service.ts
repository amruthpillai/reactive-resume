import type { CustomTemplateData } from "@reactive-resume/schema/custom-template";
import { ORPCError } from "@orpc/client";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { customTemplateDataSchema } from "@reactive-resume/schema/custom-template";
import { generateId } from "@reactive-resume/utils/string";

const FALLBACK_PAGE = { paddingHorizontal: 40, paddingVertical: 40 };

// Stored template data can predate the current schema (e.g. an earlier
// layout-preset shape). A single invalid row must not break `list`/`getById`
// output validation, so coerce unparseable rows to a safe, editable default
// while preserving the base template. The row heals on the next save.
const coerceTemplateData = (data: unknown): CustomTemplateData => {
	const parsed = customTemplateDataSchema.safeParse(data);
	if (parsed.success) return parsed.data;

	const base = (data as { baseTemplate?: unknown } | null)?.baseTemplate;
	const repaired = customTemplateDataSchema.safeParse({
		baseTemplate: typeof base === "string" ? base : "onyx",
		nodes: [],
		page: FALLBACK_PAGE,
	});
	return repaired.success ? repaired.data : { baseTemplate: "onyx", nodes: [], page: FALLBACK_PAGE };
};

const normalizeRow = <T extends { data: unknown }>(row: T): T & { data: CustomTemplateData } => ({
	...row,
	data: coerceTemplateData(row.data),
});

export const customTemplateService = {
	list: async (input: { userId: string }) => {
		const rows = await db
			.select({
				id: schema.customTemplate.id,
				name: schema.customTemplate.name,
				data: schema.customTemplate.data,
				createdAt: schema.customTemplate.createdAt,
				updatedAt: schema.customTemplate.updatedAt,
			})
			.from(schema.customTemplate)
			.where(eq(schema.customTemplate.userId, input.userId))
			.orderBy(desc(schema.customTemplate.updatedAt));

		return rows.map(normalizeRow);
	},

	getById: async (input: { id: string; userId: string }) => {
		const [template] = await db
			.select({
				id: schema.customTemplate.id,
				name: schema.customTemplate.name,
				data: schema.customTemplate.data,
				createdAt: schema.customTemplate.createdAt,
				updatedAt: schema.customTemplate.updatedAt,
			})
			.from(schema.customTemplate)
			.where(and(eq(schema.customTemplate.id, input.id), eq(schema.customTemplate.userId, input.userId)));

		if (!template) throw new ORPCError("NOT_FOUND");
		return normalizeRow(template);
	},

	create: async (input: { userId: string; name: string; data: CustomTemplateData }) => {
		const id = generateId();

		await db.insert(schema.customTemplate).values({
			id,
			name: input.name,
			data: input.data,
			userId: input.userId,
		});

		return id;
	},

	update: async (input: { id: string; userId: string; name?: string; data?: CustomTemplateData }) => {
		const updateData: Partial<typeof schema.customTemplate.$inferSelect> = {
			...(input.name !== undefined ? { name: input.name } : {}),
			...(input.data !== undefined ? { data: input.data } : {}),
		};

		const [template] = await db
			.update(schema.customTemplate)
			.set(updateData)
			.where(and(eq(schema.customTemplate.id, input.id), eq(schema.customTemplate.userId, input.userId)))
			.returning({
				id: schema.customTemplate.id,
				name: schema.customTemplate.name,
				data: schema.customTemplate.data,
				createdAt: schema.customTemplate.createdAt,
				updatedAt: schema.customTemplate.updatedAt,
			});

		if (!template) throw new ORPCError("NOT_FOUND");
		return template;
	},

	delete: async (input: { id: string; userId: string }) => {
		const [template] = await db
			.select({ id: schema.customTemplate.id })
			.from(schema.customTemplate)
			.where(and(eq(schema.customTemplate.id, input.id), eq(schema.customTemplate.userId, input.userId)));

		if (!template) throw new ORPCError("NOT_FOUND");

		await db
			.delete(schema.customTemplate)
			.where(and(eq(schema.customTemplate.id, input.id), eq(schema.customTemplate.userId, input.userId)));
	},
};
