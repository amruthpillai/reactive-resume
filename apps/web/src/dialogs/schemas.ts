import type { CoverLetterItem, CustomSection, SectionItem, SummaryItem } from "@reactive-resume/schema/resume/data";

type EmptyDialog<T extends string> = { [K in T]: { type: K; data?: undefined } }[T];

type SectionItems = {
	profiles: SectionItem<"profiles">;
	experience: SectionItem<"experience">;
	education: SectionItem<"education">;
	projects: SectionItem<"projects">;
	skills: SectionItem<"skills">;
	languages: SectionItem<"languages">;
	interests: SectionItem<"interests">;
	awards: SectionItem<"awards">;
	certifications: SectionItem<"certifications">;
	publications: SectionItem<"publications">;
	volunteer: SectionItem<"volunteer">;
	references: SectionItem<"references">;
	summary: SummaryItem;
	"cover-letter": CoverLetterItem;
};

type SectionDialog = {
	[T in keyof SectionItems]:
		| {
				type: `resume.sections.${T}.create`;
				data?: { item?: SectionItems[T]; customSectionId?: string };
		  }
		| {
				type: `resume.sections.${T}.update`;
				data: { item: SectionItems[T]; customSectionId?: string };
		  };
}[keyof SectionItems];

export type DialogSchema =
	| EmptyDialog<
			| "auth.change-password"
			| "auth.two-factor.enable"
			| "auth.two-factor.disable"
			| "api-key.create"
			| "resume.create"
			| "resume.import"
			| "resume.template.gallery"
	  >
	| {
			type: "resume.update";
			data: { id: string; name: string; slug: string; tags: string[] };
	  }
	| {
			type: "resume.duplicate";
			data: { id: string; name: string; slug: string; tags: string[]; shouldRedirect?: boolean };
	  }
	| SectionDialog
	| { type: "resume.sections.custom.create"; data?: CustomSection }
	| { type: "resume.sections.custom.update"; data: CustomSection };

export type DialogType = DialogSchema["type"];

export type DialogData<T extends DialogType> = Extract<DialogSchema, { type: T }>["data"];

type DialogPropsData<T extends DialogType> =
	DialogData<T> extends undefined ? Record<string, never> : { data: DialogData<T> };

export type DialogProps<T extends DialogType> = DialogPropsData<T>;
