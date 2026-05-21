import type { ParsedTemplate, ResumeSlot, TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { template } from "@reactive-resume/db/schema";
import { parseTemplate } from "@reactive-resume/renderer";
import { generateId } from "@reactive-resume/utils/string";

export type TemplateListRow = Omit<StoredTemplate, "files">;

export type TemplateUpsertInput = {
	id: string;
	name: string;
	description?: string;
	author?: string;
	tags?: string[];
	files: Record<string, string>;
	metadata: TemplateMetadata;
	inputs: ResumeSlot[];
	userId?: string;
};

type StoredTemplate = typeof template.$inferSelect;

export class TemplateService {
	async list(): Promise<TemplateListRow[]> {
		return db
			.select()
			.from(template)
			.orderBy(desc(template.createdAt))
			.then((rows) => rows.map(({ files: _, ...rest }) => rest as TemplateListRow));
	}

	async getById(id: string): Promise<StoredTemplate | undefined> {
		return db
			.select()
			.from(template)
			.where(eq(template.id, id))
			.limit(1)
			.then((rows) => rows[0] as StoredTemplate | undefined);
	}

	async getBuiltIns(): Promise<StoredTemplate[]> {
		return db
			.select()
			.from(template)
			.where(isNull(template.userId))
			.orderBy(template.name)
			.then((rows) => rows as StoredTemplate[]);
	}

	async upsert(input: TemplateUpsertInput): Promise<StoredTemplate> {
		const existing = await db.select().from(template).where(eq(template.id, input.id)).limit(1);
		if (existing.length > 0) {
			await db.update(template).set(input).where(eq(template.id, input.id));
		} else {
			await db.insert(template).values(input);
		}
		const [row] = await db.select().from(template).where(eq(template.id, input.id)).limit(1);
		if (!row) throw new Error(`Template "${input.id}" not found after upsert`);
		return row;
	}

	async createFromZip(zipBuffer: Buffer, userId: string): Promise<StoredTemplate> {
		const parsed: ParsedTemplate = await parseTemplate(zipBuffer);
		const id = generateId();
		return this.upsert({
			id,
			name: parsed.metadata.name,
			tags: parsed.metadata.tags,
			files: parsed.files,
			metadata: parsed.metadata,
			inputs: parsed.inputs,
			userId,
			...(parsed.metadata.description !== undefined ? { description: parsed.metadata.description } : {}),
			...(parsed.metadata.author !== undefined ? { author: parsed.metadata.author } : {}),
		});
	}

	async delete(id: string, userId: string): Promise<boolean> {
		const existing = await db
			.select({ id: template.id })
			.from(template)
			.where(and(eq(template.id, id), eq(template.userId, userId)))
			.limit(1);
		if (existing.length === 0) return false;
		await db.delete(template).where(and(eq(template.id, id), eq(template.userId, userId)));
		return true;
	}
}

export const templateService = new TemplateService();
