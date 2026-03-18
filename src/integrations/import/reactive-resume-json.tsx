import { flattenError, ZodError } from "zod";

import { type ResumeData, resumeDataSchema, sectionTypeSchema } from "@/schema/resume/data";

const BUILT_IN_LAYOUT_SECTION_IDS = sectionTypeSchema.options.filter((section) => section !== "cover-letter");

function normalizeBuiltInSectionsInLayout(data: ResumeData): ResumeData {
  const pages = data.metadata.layout.pages;

  // Some exported resumes can arrive without any persisted layout pages.
  if (pages.length === 0) {
    return {
      ...data,
      metadata: {
        ...data.metadata,
        layout: {
          ...data.metadata.layout,
          pages: [
            {
              fullWidth: false,
              main: [...BUILT_IN_LAYOUT_SECTION_IDS],
              sidebar: [],
            },
          ],
        },
      },
    };
  }

  const existingSectionIds = new Set<string>();

  // Preserve the imported layout and only compute which built-in IDs are missing entirely.
  for (const page of pages) {
    for (const sectionId of page.main) existingSectionIds.add(sectionId);
    for (const sectionId of page.sidebar) existingSectionIds.add(sectionId);
  }

  const missingSectionIds = BUILT_IN_LAYOUT_SECTION_IDS.filter((sectionId) => !existingSectionIds.has(sectionId));

  if (missingSectionIds.length === 0) return data;

  const [firstPage, ...restPages] = pages;

  return {
    ...data,
    metadata: {
      ...data.metadata,
      layout: {
        ...data.metadata.layout,
        pages: [
          {
            ...firstPage,
            // Recover missing built-in sections without reordering the imported layout.
            main: [...firstPage.main, ...missingSectionIds],
          },
          ...restPages,
        ],
      },
    },
  };
}

export class ReactiveResumeJSONImporter {
  parse(json: string): ResumeData {
    try {
      const parsed = resumeDataSchema.parse(JSON.parse(json));
      return resumeDataSchema.parse(normalizeBuiltInSectionsInLayout(parsed));
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = flattenError(error);
        throw new Error(JSON.stringify(errors));
      }

      throw error;
    }
  }
}
