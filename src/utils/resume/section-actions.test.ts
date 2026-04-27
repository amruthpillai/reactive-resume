import { produce } from "immer";
import { describe, expect, it } from "vite-plus/test";

import type { SectionItem } from "@/schema/resume/data";

import { type ResumeData, defaultResumeData } from "@/schema/resume/data";

import { createSectionItem, updateSectionItem } from "./section-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshResume(): ResumeData {
  return structuredClone(defaultResumeData);
}

function resumeWithExperience(): ResumeData {
  const data = freshResume();
  data.sections.experience.items = [
    {
      id: "exp-1",
      hidden: false,
      company: "Acme Corp",
      position: "Engineer",
      location: "NYC",
      period: "2020-2022",
      website: { url: "", label: "" },
      description: "<p>Built things</p>",
      roles: [],
    },
    {
      id: "exp-2",
      hidden: false,
      company: "Beta Inc",
      position: "Senior Dev",
      location: "SF",
      period: "2022-2024",
      website: { url: "", label: "" },
      description: "<p>Led things</p>",
      roles: [],
    },
  ];
  return data;
}

function resumeWithCustomSection(): ResumeData {
  const data = freshResume();
  data.customSections = [
    {
      id: "custom-1",
      type: "skills",
      title: "Soft Skills",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "cs-1",
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
  return data;
}

// ---------------------------------------------------------------------------
// createSectionItem
// ---------------------------------------------------------------------------

describe("createSectionItem", () => {
  it("adds an item to an empty standard section", () => {
    const data = freshResume();
    const newItem = {
      id: "new-1",
      hidden: false,
      icon: "",
      name: "TypeScript",
      proficiency: "Advanced",
      level: 4,
      keywords: [],
    };

    const result = produce(data, (draft) => {
      createSectionItem(draft, "skills", newItem);
    });

    expect(result.sections.skills.items).toHaveLength(1);
    expect(result.sections.skills.items[0]).toEqual(newItem);
  });

  it("appends an item to a non-empty standard section", () => {
    const data = resumeWithExperience();
    const newExp = {
      id: "exp-3",
      hidden: false,
      company: "Gamma LLC",
      position: "CTO",
      location: "",
      period: "2024-",
      website: { url: "", label: "" },
      description: "",
      roles: [],
    };

    const result = produce(data, (draft) => {
      createSectionItem(draft, "experience", newExp);
    });

    expect(result.sections.experience.items).toHaveLength(3);
    expect(result.sections.experience.items[2].id).toBe("exp-3");
  });

  it("adds an item to a custom section", () => {
    const data = resumeWithCustomSection();
    const newItem = { id: "cs-2", hidden: false, icon: "", name: "Teamwork", proficiency: "", level: 0, keywords: [] };

    const result = produce(data, (draft) => {
      createSectionItem(draft, "skills", newItem, "custom-1");
    });

    const custom = result.customSections.find((s) => s.id === "custom-1")!;
    expect(custom.items).toHaveLength(2);
  });

  it("does nothing when custom section id doesn't exist", () => {
    const data = resumeWithCustomSection();
    const newItem = { id: "cs-3", hidden: false, icon: "", name: "X", proficiency: "", level: 0, keywords: [] };

    const result = produce(data, (draft) => {
      createSectionItem(draft, "skills", newItem, "nonexistent");
    });

    // Nothing should have changed
    expect(result.customSections[0].items).toHaveLength(1);
    expect(result.sections.skills.items).toHaveLength(0);
  });

  it("can add multiple items in sequence", () => {
    const data = freshResume();

    const result = produce(data, (draft) => {
      createSectionItem(draft, "skills", {
        id: "a",
        hidden: false,
        icon: "",
        name: "A",
        proficiency: "",
        level: 0,
        keywords: [],
      });
      createSectionItem(draft, "skills", {
        id: "b",
        hidden: false,
        icon: "",
        name: "B",
        proficiency: "",
        level: 0,
        keywords: [],
      });
      createSectionItem(draft, "skills", {
        id: "c",
        hidden: false,
        icon: "",
        name: "C",
        proficiency: "",
        level: 0,
        keywords: [],
      });
    });

    expect(result.sections.skills.items).toHaveLength(3);
    expect(result.sections.skills.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("adds items to different section types", () => {
    const data = freshResume();

    const result = produce(data, (draft) => {
      createSectionItem(draft, "awards", {
        id: "a1",
        hidden: false,
        title: "Best Dev",
        awarder: "Company",
        date: "2024",
        website: { url: "", label: "" },
        description: "",
      });
      createSectionItem(draft, "education", {
        id: "e1",
        hidden: false,
        school: "MIT",
        degree: "BS",
        area: "CS",
        grade: "",
        location: "",
        period: "2016-2020",
        website: { url: "", label: "" },
        description: "",
      });
    });

    expect(result.sections.awards.items).toHaveLength(1);
    expect(result.sections.education.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateSectionItem
// ---------------------------------------------------------------------------

describe("updateSectionItem", () => {
  it("updates an existing item in a standard section", () => {
    const data = resumeWithExperience();

    const result = produce(data, (draft) => {
      updateSectionItem(draft, "experience", {
        id: "exp-1",
        hidden: false,
        company: "Acme Corp Updated",
        position: "Senior Engineer",
        location: "NYC",
        period: "2020-2023",
        website: { url: "", label: "" },
        description: "<p>Built more things</p>",
        roles: [],
      });
    });

    expect(result.sections.experience.items[0].company).toBe("Acme Corp Updated");
    expect(result.sections.experience.items[0].position).toBe("Senior Engineer");
    // Second item should be unchanged
    expect(result.sections.experience.items[1].company).toBe("Beta Inc");
  });

  it("updates the last item in a section", () => {
    const data = resumeWithExperience();

    const result = produce(data, (draft) => {
      updateSectionItem(draft, "experience", {
        id: "exp-2",
        hidden: true,
        company: "Beta Inc",
        position: "VP",
        location: "Remote",
        period: "2022-2024",
        website: { url: "https://beta.com", label: "Beta" },
        description: "",
        roles: [],
      });
    });

    expect(result.sections.experience.items[1].hidden).toBe(true);
    expect(result.sections.experience.items[1].position).toBe("VP");
  });

  it("does nothing when item id doesn't match any item in standard section", () => {
    const data = resumeWithExperience();

    const result = produce(data, (draft) => {
      updateSectionItem(draft, "experience", {
        id: "nonexistent",
        hidden: false,
        company: "Ghost",
        position: "",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      });
    });

    // Nothing should change
    expect(result.sections.experience.items).toHaveLength(2);
    expect(result.sections.experience.items[0].company).toBe("Acme Corp");
  });

  it("updates an item in a custom section", () => {
    const data = resumeWithCustomSection();

    const result = produce(data, (draft) => {
      updateSectionItem(
        draft,
        "skills",
        {
          id: "cs-1",
          hidden: false,
          icon: "star",
          name: "Communication",
          proficiency: "Expert",
          level: 5,
          keywords: ["soft"],
        },
        "custom-1",
      );
    });

    const section = result.customSections.find((s) => s.id === "custom-1")!;
    const item = section.items[0] as SectionItem<"skills">;

    expect(item.name).toBe("Communication");
  });

  it("does nothing when custom section id doesn't exist", () => {
    const data = resumeWithCustomSection();

    const result = produce(data, (draft) => {
      updateSectionItem(
        draft,
        "skills",
        { id: "cs-1", hidden: false, icon: "", name: "Updated", proficiency: "", level: 0, keywords: [] },
        "nonexistent",
      );
    });

    const section = result.customSections.find((s) => s.id === "custom-1")!;
    const item = section.items[0] as SectionItem<"skills">;

    expect(item.name).toBe("Leadership");
  });

  it("does nothing when item id doesn't match in custom section", () => {
    const data = resumeWithCustomSection();

    const result = produce(data, (draft) => {
      updateSectionItem(
        draft,
        "skills",
        { id: "nonexistent", hidden: false, icon: "", name: "X", proficiency: "", level: 0, keywords: [] },
        "custom-1",
      );
    });

    const section = result.customSections.find((s) => s.id === "custom-1")!;
    const item = section.items[0] as SectionItem<"skills">;

    expect(section.items).toHaveLength(1);
    expect(item.name).toBe("Leadership");
  });

  it("replaces the entire item object (not a merge)", () => {
    const data = resumeWithExperience();

    const result = produce(data, (draft) => {
      updateSectionItem(draft, "experience", {
        id: "exp-1",
        hidden: false,
        company: "New Company",
        position: "",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      });
    });

    // position should be empty now — it's a full replace, not merge
    expect(result.sections.experience.items[0].position).toBe("");
    expect(result.sections.experience.items[0].company).toBe("New Company");
  });
});
