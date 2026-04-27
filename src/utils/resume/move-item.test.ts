import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { type ResumeData, defaultResumeData } from "@/schema/resume/data";

import {
  addItemToSection,
  createCustomSectionWithItem,
  createPageWithSection,
  getCompatibleMoveTargets,
  getSourceSectionTitle,
  removeItemFromSource,
} from "./move-item";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock getSectionTitle — it uses @lingui/core/macro `t` which isn't available in tests
vi.mock("./section", () => ({
  getSectionTitle: (type: string) => type.charAt(0).toUpperCase() + type.slice(1),
}));

// Mock generateId to return deterministic values
let idCounter = 0;
vi.mock("@/utils/string", () => ({
  generateId: () => `mock-id-${++idCounter}`,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshResume(): ResumeData {
  return structuredClone(defaultResumeData);
}

function resumeWithSkills(): ResumeData {
  const data = freshResume();
  data.sections.skills.items = [
    {
      id: "s1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "JS",
      proficiency: "Advanced",
      level: 4,
      keywords: ["frontend"],
    },
    {
      id: "s2",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "TS",
      proficiency: "Intermediate",
      level: 3,
      keywords: [],
    },
    {
      id: "s3",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Rust",
      proficiency: "Beginner",
      level: 1,
      keywords: [],
    },
  ];
  return data;
}

function resumeWithCustomSections(): ResumeData {
  const data = freshResume();
  data.customSections = [
    {
      id: "custom-exp-1",
      type: "experience",
      title: "Freelance Work",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "item-1",
          hidden: false,
          company: "Acme",
          position: "Dev",
          location: "",
          period: "",
          website: { url: "", label: "" },
          description: "",
          roles: [],
        },
      ],
    },
    {
      id: "custom-skills-1",
      type: "skills",
      title: "Soft Skills",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "cs1",
          hidden: false,
          icon: "",
          iconColor: "",
          name: "Leadership",
          proficiency: "",
          level: 0,
          keywords: [],
        },
      ],
    },
  ];
  // Add custom sections to the layout
  data.metadata.layout.pages[0].main.push("custom-exp-1");
  data.metadata.layout.pages[0].sidebar.push("custom-skills-1");
  return data;
}

function resumeWithMultiplePages(): ResumeData {
  const data = resumeWithCustomSections();
  data.metadata.layout.pages.push({
    fullWidth: false,
    main: ["experience"],
    sidebar: ["skills"],
  });
  return data;
}

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// getSourceSectionTitle
// ---------------------------------------------------------------------------

describe("getSourceSectionTitle", () => {
  it("returns the default section title for a standard section", () => {
    const data = freshResume();
    const title = getSourceSectionTitle(data, "experience");
    expect(title).toBe("Experience");
  });

  it("returns the custom section title when customSectionId is provided", () => {
    const data = resumeWithCustomSections();
    const title = getSourceSectionTitle(data, "experience", "custom-exp-1");
    expect(title).toBe("Freelance Work");
  });

  it("falls back to default title when customSectionId doesn't match", () => {
    const data = resumeWithCustomSections();
    const title = getSourceSectionTitle(data, "experience", "nonexistent-id");
    expect(title).toBe("Experience");
  });

  it("returns the default title for various section types", () => {
    const data = freshResume();
    expect(getSourceSectionTitle(data, "skills")).toBe("Skills");
    expect(getSourceSectionTitle(data, "education")).toBe("Education");
    expect(getSourceSectionTitle(data, "projects")).toBe("Projects");
  });
});

// ---------------------------------------------------------------------------
// getCompatibleMoveTargets
// ---------------------------------------------------------------------------

describe("getCompatibleMoveTargets", () => {
  it("returns empty sections for each page when no compatible targets exist", () => {
    const data = freshResume();
    const targets = getCompatibleMoveTargets(data, "skills", undefined);

    // The source section (skills) itself should be excluded
    // All other sections have different types, so no compatible targets
    expect(targets).toHaveLength(1);
    expect(targets[0].sections).toHaveLength(0);
  });

  it("finds custom sections with matching type as move targets", () => {
    const data = resumeWithCustomSections();
    // Source is the standard "skills" section
    const targets = getCompatibleMoveTargets(data, "skills", undefined);

    const allSections = targets.flatMap((p) => p.sections);
    expect(allSections.some((s) => s.sectionId === "custom-skills-1")).toBe(true);
  });

  it("excludes the source section from targets", () => {
    const data = resumeWithCustomSections();
    // Source is the custom skills section
    const targets = getCompatibleMoveTargets(data, "skills", "custom-skills-1");

    const allSections = targets.flatMap((p) => p.sections);
    expect(allSections.some((s) => s.sectionId === "custom-skills-1")).toBe(false);
    // But standard "skills" should be included
    expect(allSections.some((s) => s.sectionId === "skills")).toBe(true);
  });

  it("excludes the standard source section when sourceSectionId is undefined", () => {
    const data = resumeWithCustomSections();
    const targets = getCompatibleMoveTargets(data, "experience", undefined);

    const allSections = targets.flatMap((p) => p.sections);
    // Standard "experience" should be excluded (it's the source)
    expect(allSections.some((s) => s.sectionId === "experience")).toBe(false);
    // Custom experience section should be included
    expect(allSections.some((s) => s.sectionId === "custom-exp-1")).toBe(true);
  });

  it("returns targets across multiple pages", () => {
    const data = resumeWithMultiplePages();
    const targets = getCompatibleMoveTargets(data, "skills", "custom-skills-1");

    expect(targets).toHaveLength(2);
    // Page 0 should have standard skills in sidebar
    const page0Sections = targets[0].sections;
    expect(page0Sections.some((s) => s.sectionId === "skills")).toBe(true);
    // Page 1 should also have skills in sidebar
    const page1Sections = targets[1].sections;
    expect(page1Sections.some((s) => s.sectionId === "skills")).toBe(true);
  });

  it("correctly labels standard vs custom sections", () => {
    const data = resumeWithCustomSections();
    const targets = getCompatibleMoveTargets(data, "skills", "custom-skills-1");

    const allSections = targets.flatMap((p) => p.sections);
    const standardSection = allSections.find((s) => s.sectionId === "skills");
    expect(standardSection?.isStandard).toBe(true);
  });

  it("correctly labels custom sections", () => {
    const data = resumeWithCustomSections();
    const targets = getCompatibleMoveTargets(data, "skills", undefined);

    const allSections = targets.flatMap((p) => p.sections);
    const customSection = allSections.find((s) => s.sectionId === "custom-skills-1");
    expect(customSection?.isStandard).toBe(false);
    expect(customSection?.sectionTitle).toBe("Soft Skills");
  });

  it("includes page index in results", () => {
    const data = resumeWithMultiplePages();
    const targets = getCompatibleMoveTargets(data, "experience", undefined);

    expect(targets[0].pageIndex).toBe(0);
    expect(targets[1].pageIndex).toBe(1);
  });

  it("returns no targets for a section type not present elsewhere", () => {
    const data = freshResume();
    const targets = getCompatibleMoveTargets(data, "awards", undefined);

    // awards only appears once in the layout
    const allSections = targets.flatMap((p) => p.sections);
    expect(allSections).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// removeItemFromSource
// ---------------------------------------------------------------------------

describe("removeItemFromSource", () => {
  it("removes an item from a standard section and returns it", () => {
    const data = resumeWithSkills();
    const result = produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "s2", "skills");
      expect(removed).not.toBeNull();
      expect(removed!.id).toBe("s2");
    });

    expect(result.sections.skills.items).toHaveLength(2);
    expect(result.sections.skills.items.every((i) => i.id !== "s2")).toBe(true);
  });

  it("removes the first item from a standard section", () => {
    const data = resumeWithSkills();
    const result = produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "s1", "skills");
      expect(removed!.id).toBe("s1");
    });

    expect(result.sections.skills.items).toHaveLength(2);
    expect(result.sections.skills.items[0].id).toBe("s2");
  });

  it("removes the last item from a standard section", () => {
    const data = resumeWithSkills();
    const result = produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "s3", "skills");
      expect(removed!.id).toBe("s3");
    });

    expect(result.sections.skills.items).toHaveLength(2);
  });

  it("returns null when item is not found in standard section", () => {
    const data = resumeWithSkills();
    produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "nonexistent", "skills");
      expect(removed).toBeNull();
    });
  });

  it("removes an item from a custom section", () => {
    const data = resumeWithCustomSections();
    const result = produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "item-1", "experience", "custom-exp-1");
      expect(removed).not.toBeNull();
      expect(removed!.id).toBe("item-1");
    });

    const customSection = result.customSections.find((s) => s.id === "custom-exp-1")!;
    expect(customSection.items).toHaveLength(0);
  });

  it("returns null when custom section is not found", () => {
    const data = resumeWithCustomSections();
    produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "item-1", "experience", "nonexistent");
      expect(removed).toBeNull();
    });
  });

  it("returns null when item is not in the custom section", () => {
    const data = resumeWithCustomSections();
    produce(data, (draft) => {
      const removed = removeItemFromSource(draft, "nonexistent", "experience", "custom-exp-1");
      expect(removed).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// addItemToSection
// ---------------------------------------------------------------------------

describe("addItemToSection", () => {
  it("adds an item to a standard section", () => {
    const data = freshResume();
    const newItem = {
      id: "new-1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      addItemToSection(draft, newItem, "skills", "skills");
    });

    expect(result.sections.skills.items).toHaveLength(1);
    expect(result.sections.skills.items[0].id).toBe("new-1");
  });

  it("adds an item to a custom section", () => {
    const data = resumeWithCustomSections();
    const newItem = {
      id: "new-2",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Teamwork",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      addItemToSection(draft, newItem, "custom-skills-1", "skills");
    });

    const customSection = result.customSections.find((s) => s.id === "custom-skills-1")!;
    expect(customSection.items).toHaveLength(2);
  });

  it("does nothing when target custom section doesn't exist", () => {
    const data = freshResume();
    const newItem = {
      id: "new-3",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      addItemToSection(draft, newItem, "nonexistent-section", "skills");
    });

    // Nothing should change
    expect(result.sections.skills.items).toHaveLength(0);
  });

  it("appends to the end of an existing items array", () => {
    const data = resumeWithSkills();
    const newItem = {
      id: "s4",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      addItemToSection(draft, newItem, "skills", "skills");
    });

    expect(result.sections.skills.items).toHaveLength(4);
    expect(result.sections.skills.items[3].id).toBe("s4");
  });
});

// ---------------------------------------------------------------------------
// createCustomSectionWithItem
// ---------------------------------------------------------------------------

describe("createCustomSectionWithItem", () => {
  it("creates a new custom section with the given item", () => {
    const data = freshResume();
    const item = {
      id: "item-1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      const sectionId = createCustomSectionWithItem(draft, item, "skills", "Tech Skills", 0);
      expect(sectionId).toBe("mock-id-1");
    });

    expect(result.customSections).toHaveLength(1);
    expect(result.customSections[0].title).toBe("Tech Skills");
    expect(result.customSections[0].type).toBe("skills");
    expect(result.customSections[0].items).toHaveLength(1);
    expect(result.customSections[0].columns).toBe(1);
    expect(result.customSections[0].hidden).toBe(false);
  });

  it("adds the new section to the target page's main column", () => {
    const data = freshResume();
    const item = {
      id: "item-1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };
    const mainLengthBefore = data.metadata.layout.pages[0].main.length;

    const result = produce(data, (draft) => {
      createCustomSectionWithItem(draft, item, "skills", "Skills 2", 0);
    });

    expect(result.metadata.layout.pages[0].main).toHaveLength(mainLengthBefore + 1);
    expect(result.metadata.layout.pages[0].main).toContain("mock-id-1");
  });

  it("handles targeting a specific page index", () => {
    const data = resumeWithMultiplePages();
    const item = {
      id: "item-2",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Python",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      createCustomSectionWithItem(draft, item, "skills", "More Skills", 1);
    });

    expect(result.metadata.layout.pages[1].main).toContain("mock-id-1");
    // Page 0 should be unchanged
    expect(result.metadata.layout.pages[0].main).not.toContain("mock-id-1");
  });

  it("handles out-of-bounds page index gracefully (no crash)", () => {
    const data = freshResume();
    const item = {
      id: "item-3",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    // Should not throw — the page just doesn't exist so nothing is pushed
    const result = produce(data, (draft) => {
      createCustomSectionWithItem(draft, item, "skills", "Skills", 99);
    });

    // Custom section still gets created
    expect(result.customSections).toHaveLength(1);
    // But no page was modified
    expect(result.metadata.layout.pages[0].main).not.toContain("mock-id-1");
  });
});

// ---------------------------------------------------------------------------
// createPageWithSection
// ---------------------------------------------------------------------------

describe("createPageWithSection", () => {
  it("creates a new page with a custom section", () => {
    const data = freshResume();
    const item = {
      id: "item-1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };
    const pagesBefore = data.metadata.layout.pages.length;

    const result = produce(data, (draft) => {
      createPageWithSection(draft, item, "skills", "New Skills Page");
    });

    expect(result.metadata.layout.pages).toHaveLength(pagesBefore + 1);
    const newPage = result.metadata.layout.pages[result.metadata.layout.pages.length - 1];
    expect(newPage.fullWidth).toBe(false);
    expect(newPage.main).toContain("mock-id-1");
    expect(newPage.sidebar).toHaveLength(0);
  });

  it("creates the custom section with correct properties", () => {
    const data = freshResume();
    const item = {
      id: "item-1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "Go",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      createPageWithSection(draft, item, "skills", "Page 2 Skills");
    });

    expect(result.customSections).toHaveLength(1);
    expect(result.customSections[0].title).toBe("Page 2 Skills");
    expect(result.customSections[0].type).toBe("skills");
    expect(result.customSections[0].items).toHaveLength(1);
  });

  it("can create multiple pages in sequence", () => {
    const data = freshResume();
    const item1 = {
      id: "i1",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "A",
      proficiency: "",
      level: 0,
      keywords: [],
    };
    const item2 = {
      id: "i2",
      hidden: false,
      icon: "",
      iconColor: "",
      name: "B",
      proficiency: "",
      level: 0,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      createPageWithSection(draft, item1, "skills", "Page 2");
      createPageWithSection(draft, item2, "skills", "Page 3");
    });

    expect(result.metadata.layout.pages).toHaveLength(3);
    expect(result.customSections).toHaveLength(2);
  });
});
