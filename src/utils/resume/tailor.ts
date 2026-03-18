import type { z } from "zod";

import type { ResumeData } from "@/schema/resume/data";
import type { NewSkillInfo, TailorOutput } from "@/schema/tailor";
import type { jsonPatchOperationSchema } from "@/utils/resume/patch";

import { generateId } from "@/utils/string";

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;

/**
 * Sanitizes text output from AI to ensure consistent character formatting.
 * Replaces smart quotes, emdashes, endashes, special whitespace, and
 * other Unicode characters with their standard ASCII equivalents.
 */
export function sanitizeText(text: string): string {
  return (
    text
      // Emdashes and endashes → hyphen
      .replace(/[\u2013\u2014]/g, "-")
      // Curly single quotes → straight
      .replace(/[\u2018\u2019\u201A]/g, "'")
      // Curly double quotes → straight
      .replace(/[\u201C\u201D\u201E]/g, '"')
      // Ellipsis character → three dots
      .replace(/\u2026/g, "...")
      // Non-breaking space and other special whitespace → standard space
      .replace(/[\u00A0\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F]/g, " ")
      // Unicode bullet → empty (should use HTML <li> instead)
      .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "")
  );
}

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
): { operations: JsonPatchOperation[]; newSkills: NewSkillInfo[] } {
  const operations: JsonPatchOperation[] = [];

  // 1. Summary
  if (output.summary?.content) {
    operations.push({
      op: "replace",
      path: "/summary/content",
      value: sanitizeText(output.summary.content),
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
        value: sanitizeText(exp.description),
      });
    }

    if (exp.roles) {
      const rolesCount = resumeData.sections.experience.items[exp.index].roles?.length ?? 0;
      for (const role of exp.roles) {
        if (role.index < 0 || role.index >= rolesCount) continue;
        operations.push({
          op: "replace",
          path: `${basePath}/roles/${role.index}/description`,
          value: sanitizeText(role.description),
        });
      }
    }
  }

  // 3. Reference descriptions
  for (const ref of output.references) {
    if (ref.index < 0 || ref.index >= resumeData.sections.references.items.length) continue;

    if (ref.description) {
      operations.push({
        op: "replace",
        path: `/sections/references/items/${ref.index}/description`,
        value: sanitizeText(ref.description),
      });
    }
  }

  // 4. Skills — full replacement approach
  // The AI provides the complete curated skills list.
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
          name: sanitizeText(skill.name),
          proficiency: sanitizeText(skill.proficiency || ""),
          level: 0,
          keywords: skill.keywords.map(sanitizeText),
        },
      });

      // Track newly inferred skills for sync-back to original resume
      if (skill.isNew) {
        newSkills.push({
          name: sanitizeText(skill.name),
          keywords: skill.keywords.map(sanitizeText),
          proficiency: sanitizeText(skill.proficiency || ""),
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
  const referencesCount = resumeData.sections.references.items.length;

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

  for (const ref of output.references) {
    if (ref.index < 0 || ref.index >= referencesCount) {
      errors.push(`Reference index ${ref.index} out of bounds (max: ${referencesCount - 1})`);
    }
  }

  return errors;
}

/**
 * Builds JSON Patch add operations for syncing new skills back to
 * the original (source) resume.
 */
export function buildSkillSyncOperations(skills: NewSkillInfo[]): JsonPatchOperation[] {
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
