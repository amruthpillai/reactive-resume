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
		if (exp.index < 0 || exp.index >= resumeData.sections.experience.items.length) continue;

		const basePath = `/sections/experience/items/${exp.index}`;

		if (exp.description) {
			operations.push({
				op: "replace",
				path: `${basePath}/description`,
				value: exp.description,
			});
		}

		if (exp.roles) {
			const rolesCount = resumeData.sections.experience.items[exp.index].roles?.length ?? 0;
			for (const role of exp.roles) {
				if (role.index < 0 || role.index >= rolesCount) continue;
				operations.push({
					op: "replace",
					path: `${basePath}/roles/${role.index}/description`,
					value: role.description,
				});
			}
		}
	}

	// 3. Skills — full replacement approach
	// The AI provides the complete curated skills list. We replace the entire items array.
	// First, hide ALL existing skills (they remain in the data but won't show).
	// Then add the curated set as new visible items.
	const newSkills: NewSkillInfo[] = [];

	if (output.skills.length > 0) {
		// Hide all existing skills on the tailored copy
		for (let i = 0; i < resumeData.sections.skills.items.length; i++) {
			if (!resumeData.sections.skills.items[i].hidden) {
				operations.push({
					op: "replace",
					path: `/sections/skills/items/${i}/hidden`,
					value: true,
				});
			}
		}

		// Add the curated skills as new visible items
		for (const skill of output.skills) {
			operations.push({
				op: "add",
				path: "/sections/skills/items/-",
				value: {
					id: generateId(),
					hidden: false,
					icon: skill.icon || "",
					name: skill.name,
					proficiency: skill.proficiency || "",
					level: 0,
					keywords: skill.keywords,
				},
			});

			// Track newly inferred skills for sync-back to original resume
			if (skill.isNew) {
				newSkills.push({
					name: skill.name,
					keywords: skill.keywords,
					proficiency: skill.proficiency || "",
				});
			}
		}
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
