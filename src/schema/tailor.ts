import z from "zod";

const tailoredSkillSchema = z.object({
  name: z.string().min(1).describe("Skill category name, e.g. 'Frontend Development', 'Cloud Infrastructure'."),
  keywords: z
    .array(z.string())
    .describe("Specific technologies or competencies displayed as tags, e.g. ['React', 'TypeScript', 'Next.js']."),
  proficiency: z
    .string()
    .describe("Proficiency label, e.g. 'Advanced', 'Intermediate', 'Developer', 'Languages'. Use consistent style."),
  icon: z
    .string()
    .describe(
      "A Phosphor icon name from @phosphor-icons/web matching the skill category, or empty string if unsure. Examples: 'code', 'database', 'cloud', 'wrench', 'paint-brush', 'globe'.",
    ),
  isNew: z
    .boolean()
    .describe(
      "true if this skill was NOT in the original resume and was inferred from experience + job requirements. false if it existed in the original resume.",
    ),
});

export const tailorOutputSchema = z.object({
  summary: z.object({
    content: z
      .string()
      .describe(
        "Tailored HTML summary content highlighting the candidate's most relevant experience for the target job. Use <p> tags for paragraphs. 2-3 sentences, 50-75 words. No emdashes or endashes.",
      ),
  }),

  experiences: z
    .array(
      z.object({
        index: z
          .number()
          .describe("Zero-based index of the experience item in the resume's sections.experience.items array."),
        description: z
          .string()
          .describe(
            "Tailored HTML description emphasizing achievements and responsibilities relevant to the target job. Use <p>, <ul>, <li> tags. No emdashes or endashes.",
          ),
        roles: z
          .array(
            z.object({
              index: z.number().describe("Zero-based index of the role within this experience's roles array."),
              description: z
                .string()
                .describe(
                  "Tailored HTML description for this specific role. Use <p>, <ul>, <li> tags. No emdashes or endashes.",
                ),
            }),
          )
          .describe(
            "Tailored role-level updates. Use an empty array when the experience does not have role progression.",
          ),
      }),
    )
    .describe(
      "You MUST include ALL experience items that have any relevance to the target job. Rewrite their descriptions to emphasize relevant achievements. Only omit experiences completely unrelated to the job.",
    ),

  references: z
    .array(
      z.object({
        index: z
          .number()
          .describe("Zero-based index of the reference item in the resume's sections.references.items array."),
        description: z
          .string()
          .describe(
            "Rewritten professional reference description tailored to the target job. Should highlight how this reference can speak to relevant skills and experience. Use <p> tags. No emdashes or endashes.",
          ),
      }),
    )
    .describe(
      "Rewrite ALL reference descriptions to be professional and relevant to the target job. Each description should explain how this reference relates to the candidate's qualifications for the position.",
    ),

  skills: z
    .array(tailoredSkillSchema)
    .describe(
      "The complete curated skills list for the tailored resume. Include relevant existing skills (rewritten for consistency) and new inferred skills. Aim for 6-10 skills total to avoid overflowing the page. Each skill must have consistent icon, proficiency label, and keywords style.",
    ),
});

export type TailorOutput = z.infer<typeof tailorOutputSchema>;

export type TailoredSkill = z.infer<typeof tailoredSkillSchema>;

export type NewSkillInfo = {
  name: string;
  keywords: string[];
  proficiency: string;
};
