import type { Operation } from "fast-json-patch";
import type { ResumeData } from "@/schema/resume/data";
import type { NewSkillInfo, TailorOutput } from "@/schema/tailor";
import { generateId } from "@/utils/string";

/**
 * Converts a TailorOutput from the AI into JSON Patch (RFC 6902) operations
 * that can be applied to a resume's data.
 *
 * Returns both the patch operations and metadata about newly added skills
 * (for the skill sync confirmation dialog).
 */
export function tailorOutputToPatches(
	output: TailorOutput,
	resumeData: ResumeData,
): { operations: Operation[]; newSkills: NewSkillInfo[] } {
	const operations: Operation[] = [];

	// 1. Summary
	if (output.summary?.content) {
		operations.push({
			op: "replace",
			path: "/summary/content",
			value: output.summary.content,
		});
	}

	// 2. Experience descriptions
	for (const exp of output.experiences) {
		const basePath = `/sections/experience/items/${exp.index}`;

		if (exp.description) {
			operations.push({
				op: "replace",
				path: `${basePath}/description`,
				value: exp.description,
			});
		}

		if (exp.roles) {
			for (const role of exp.roles) {
				operations.push({
					op: "replace",
					path: `${basePath}/roles/${role.index}/description`,
					value: role.description,
				});
			}
		}
	}

	// 3. Skills curation — hide irrelevant
	for (const hideIndex of output.skills.hide) {
		if (hideIndex < resumeData.sections.skills.items.length) {
			operations.push({
				op: "replace",
				path: `/sections/skills/items/${hideIndex}/hidden`,
				value: true,
			});
		}
	}

	// 3b. Skills curation — ensure relevant are visible
	for (const keepIndex of output.skills.keep) {
		if (keepIndex < resumeData.sections.skills.items.length && resumeData.sections.skills.items[keepIndex].hidden) {
			operations.push({
				op: "replace",
				path: `/sections/skills/items/${keepIndex}/hidden`,
				value: false,
			});
		}
	}

	// 3c. Add new skills inferred from job + experience
	const newSkills: NewSkillInfo[] = [];

	for (const skill of output.skills.add) {
		const info: NewSkillInfo = {
			name: skill.name,
			keywords: skill.keywords,
			proficiency: skill.proficiency ?? "",
		};
		newSkills.push(info);

		operations.push({
			op: "add",
			path: "/sections/skills/items/-",
			value: {
				id: generateId(),
				hidden: false,
				icon: "",
				name: skill.name,
				proficiency: skill.proficiency ?? "",
				level: 0,
				keywords: skill.keywords,
			},
		});
	}

	return { operations, newSkills };
}

/**
 * Validates that the AI-generated TailorOutput references valid indices
 * within the actual resume data. Returns an array of error messages.
 * An empty array means the output is valid.
 */
export function validateTailorOutput(output: TailorOutput, resumeData: ResumeData): string[] {
	const errors: string[] = [];
	const experienceCount = resumeData.sections.experience.items.length;
	const skillsCount = resumeData.sections.skills.items.length;

	for (const exp of output.experiences) {
		if (exp.index < 0 || exp.index >= experienceCount) {
			errors.push(`Experience index ${exp.index} out of bounds (max: ${experienceCount - 1})`);
			continue;
		}

		if (exp.roles) {
			const rolesCount = resumeData.sections.experience.items[exp.index].roles?.length ?? 0;
			for (const role of exp.roles) {
				if (role.index < 0 || role.index >= rolesCount) {
					errors.push(`Role index ${role.index} in experience ${exp.index} out of bounds (max: ${rolesCount - 1})`);
				}
			}
		}
	}

	for (const idx of output.skills.keep) {
		if (idx < 0 || idx >= skillsCount) {
			errors.push(`Skill keep index ${idx} out of bounds (max: ${skillsCount - 1})`);
		}
	}

	for (const idx of output.skills.hide) {
		if (idx < 0 || idx >= skillsCount) {
			errors.push(`Skill hide index ${idx} out of bounds (max: ${skillsCount - 1})`);
		}
	}

	return errors;
}

/**
 * Builds JSON Patch add operations for syncing new skills back to
 * the original (source) resume.
 */
export function buildSkillSyncOperations(skills: NewSkillInfo[]): Operation[] {
	return skills.map((skill) => ({
		op: "add" as const,
		path: "/sections/skills/items/-",
		value: {
			id: generateId(),
			hidden: false,
			icon: "",
			name: skill.name,
			proficiency: skill.proficiency,
			level: 0,
			keywords: skill.keywords,
		},
	}));
}
