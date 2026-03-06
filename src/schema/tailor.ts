import z from "zod";

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
					.optional()
					.describe("Only include if the experience has role progression (multiple roles at one company)."),
			}),
		)
		.describe("Only include experiences that should be modified. Omit unchanged experiences."),

	skills: z.object({
		keep: z
			.array(z.number())
			.describe("Zero-based indices of existing skills that are relevant to the target job and should remain visible."),
		hide: z
			.array(z.number())
			.describe(
				"Zero-based indices of existing skills that are not relevant to the target job and should be hidden (not deleted).",
			),
		add: z
			.array(
				z.object({
					name: z.string().min(1).describe("Skill category name, e.g. 'Cloud Infrastructure'."),
					keywords: z
						.array(z.string())
						.describe("Related keywords or technologies displayed as tags below the skill name."),
					proficiency: z
						.string()
						.optional()
						.describe("Proficiency level if inferable from experience, e.g. 'Advanced', 'Intermediate'."),
				}),
			)
			.describe(
				"New skills inferred from the intersection of job requirements and the candidate's experience descriptions. Only add skills that are evidenced by existing experience.",
			),
	}),
});

export type TailorOutput = z.infer<typeof tailorOutputSchema>;

export type NewSkillInfo = {
	name: string;
	keywords: string[];
	proficiency: string;
};
