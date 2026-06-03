import type { CustomTemplateData } from "@reactive-resume/schema/custom-template";
import { ORPCError } from "@orpc/client";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { generateId } from "@reactive-resume/utils/string";

export const customTemplateService = {
	list: async (input: { userId: string }) => {
		return db
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
		return template;
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
