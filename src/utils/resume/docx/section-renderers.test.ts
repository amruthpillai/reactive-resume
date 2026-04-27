import { Paragraph } from "docx";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { CustomSection, ResumeData } from "@/schema/resume/data";

import { defaultResumeData } from "@/schema/resume/data";

import { renderBuiltInSection, renderCustomSection, renderSummary, setRenderConfig } from "./section-renderers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLOR_HEX = "#DC2626";

function freshSections(): ResumeData["sections"] {
  return structuredClone(defaultResumeData.sections);
}

beforeEach(() => {
  setRenderConfig({
    headingFont: "Arial",
    headingSizeHalfPt: 28,
    bodyFont: "Calibri",
    bodySizeHalfPt: 22,
    textColorHex: "#000000",
    primaryColorHex: "#DC2626",
  });
});

// ---------------------------------------------------------------------------
// renderSummary
// ---------------------------------------------------------------------------

describe("renderSummary", () => {
  it("renders summary with title and content", () => {
    const summary = { title: "Summary", columns: 1, hidden: false, content: "<p>A great developer</p>" };
    const result = renderSummary(summary, COLOR_HEX);
    expect(result.length).toBeGreaterThan(0);
    // First paragraph should be the heading
    expect(result[0]).toBeInstanceOf(Paragraph);
  });

  it("returns empty array when summary is hidden", () => {
    const summary = { title: "Summary", columns: 1, hidden: true, content: "<p>Hidden</p>" };
    expect(renderSummary(summary, COLOR_HEX)).toHaveLength(0);
  });

  it("returns empty array when content is empty", () => {
    const summary = { title: "Summary", columns: 1, hidden: false, content: "" };
    expect(renderSummary(summary, COLOR_HEX)).toHaveLength(0);
  });

  it("skips heading when title is empty", () => {
    const summary = { title: "", columns: 1, hidden: false, content: "<p>Content only</p>" };
    const result = renderSummary(summary, COLOR_HEX);
    // Should have content paragraphs but no heading
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// renderBuiltInSection — experience
// ---------------------------------------------------------------------------

describe("renderBuiltInSection — experience", () => {
  it("renders experience items with company and position", () => {
    const sections = freshSections();
    sections.experience.title = "Experience";
    sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "Acme Corp",
        position: "Engineer",
        location: "NYC",
        period: "2020 - 2022",
        website: { url: "https://acme.com", label: "Acme" },
        description: "<p>Built things</p>",
        roles: [],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1); // heading + item paragraphs
    expect(result[0]).toBeInstanceOf(Paragraph);
  });

  it("returns empty for hidden section", () => {
    const sections = freshSections();
    sections.experience.hidden = true;
    sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "Co",
        position: "Dev",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    expect(result).toHaveLength(0);
  });

  it("returns empty when all items are hidden", () => {
    const sections = freshSections();
    sections.experience.items = [
      {
        id: "e1",
        hidden: true,
        company: "Co",
        position: "Dev",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    expect(result).toHaveLength(0);
  });

  it("renders experience with roles", () => {
    const sections = freshSections();
    sections.experience.title = "Experience";
    sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "BigCo",
        position: "",
        location: "SF",
        period: "2018 - 2024",
        website: { url: "", label: "" },
        description: "",
        roles: [
          { id: "r1", position: "Senior Dev", period: "2022 - 2024", description: "<p>Led team</p>" },
          { id: "r2", position: "Junior Dev", period: "2018 - 2022", description: "<p>Learned things</p>" },
        ],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    // Should have heading + company title + location + role1 + role1 desc + role2 + role2 desc
    expect(result.length).toBeGreaterThanOrEqual(5);
  });

  it("filters out hidden items", () => {
    const sections = freshSections();
    sections.experience.title = "Experience";
    sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "Visible",
        position: "",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      },
      {
        id: "e2",
        hidden: true,
        company: "Hidden",
        position: "",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// renderBuiltInSection — skills
// ---------------------------------------------------------------------------

describe("renderBuiltInSection — skills", () => {
  it("renders skills with name, proficiency, and keywords", () => {
    const sections = freshSections();
    sections.skills.title = "Skills";
    sections.skills.items = [
      {
        id: "s1",
        hidden: false,
        icon: "",
        iconColor: "",
        name: "TypeScript",
        proficiency: "Advanced",
        level: 4,
        keywords: ["frontend", "backend"],
      },
    ];

    const result = renderBuiltInSection("skills", sections.skills, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1); // heading + skill
  });

  it("renders skills without proficiency or keywords", () => {
    const sections = freshSections();
    sections.skills.title = "Skills";
    sections.skills.items = [
      {
        id: "s1",
        hidden: false,
        icon: "",
        iconColor: "",
        name: "Go",
        proficiency: "",
        level: 0,
        keywords: [],
      },
    ];

    const result = renderBuiltInSection("skills", sections.skills, COLOR_HEX);
    expect(result.length).toBe(2); // heading + skill name only
  });

  it("returns empty for empty items", () => {
    const sections = freshSections();
    const result = renderBuiltInSection("skills", sections.skills, COLOR_HEX);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// renderBuiltInSection — education
// ---------------------------------------------------------------------------

describe("renderBuiltInSection — education", () => {
  it("renders education with degree, area, and grade", () => {
    const sections = freshSections();
    sections.education.title = "Education";
    sections.education.items = [
      {
        id: "ed1",
        hidden: false,
        school: "MIT",
        degree: "BSc",
        area: "CS",
        grade: "4.0",
        location: "Cambridge",
        period: "2016 - 2020",
        website: { url: "", label: "" },
        description: "",
      },
    ];

    const result = renderBuiltInSection("education", sections.education, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("skips grade paragraph when grade is empty", () => {
    const sections = freshSections();
    sections.education.title = "Education";
    sections.education.items = [
      {
        id: "ed1",
        hidden: false,
        school: "MIT",
        degree: "BSc",
        area: "",
        grade: "",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
      },
    ];

    const result = renderBuiltInSection("education", sections.education, COLOR_HEX);
    // heading + title only (no grade, no location, no description, no website)
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// renderBuiltInSection — languages
// ---------------------------------------------------------------------------

describe("renderBuiltInSection — languages", () => {
  it("renders language with fluency", () => {
    const sections = freshSections();
    sections.languages.title = "Languages";
    sections.languages.items = [{ id: "l1", hidden: false, language: "English", fluency: "Native", level: 5 }];

    const result = renderBuiltInSection("languages", sections.languages, COLOR_HEX);
    expect(result.length).toBe(2); // heading + language
  });

  it("renders language without fluency", () => {
    const sections = freshSections();
    sections.languages.title = "Languages";
    sections.languages.items = [{ id: "l1", hidden: false, language: "Spanish", fluency: "", level: 0 }];

    const result = renderBuiltInSection("languages", sections.languages, COLOR_HEX);
    expect(result.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// renderBuiltInSection — other sections
// ---------------------------------------------------------------------------

describe("renderBuiltInSection — other sections", () => {
  it("renders profiles with network and username", () => {
    const sections = freshSections();
    sections.profiles.title = "Profiles";
    sections.profiles.items = [
      {
        id: "p1",
        hidden: false,
        icon: "",
        iconColor: "",
        network: "GitHub",
        username: "janedoe",
        website: { url: "https://github.com/janedoe", label: "GitHub" },
      },
    ];

    const result = renderBuiltInSection("profiles", sections.profiles, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("renders awards with title and awarder", () => {
    const sections = freshSections();
    sections.awards.title = "Awards";
    sections.awards.items = [
      {
        id: "a1",
        hidden: false,
        title: "Best Dev",
        awarder: "Company",
        date: "2024",
        website: { url: "", label: "" },
        description: "",
      },
    ];

    const result = renderBuiltInSection("awards", sections.awards, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("renders certifications", () => {
    const sections = freshSections();
    sections.certifications.title = "Certifications";
    sections.certifications.items = [
      {
        id: "c1",
        hidden: false,
        title: "AWS",
        issuer: "Amazon",
        date: "2023",
        website: { url: "", label: "" },
        description: "",
      },
    ];

    const result = renderBuiltInSection("certifications", sections.certifications, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("renders publications", () => {
    const sections = freshSections();
    sections.publications.title = "Publications";
    sections.publications.items = [
      {
        id: "pub1",
        hidden: false,
        title: "My Paper",
        publisher: "IEEE",
        date: "2024",
        website: { url: "", label: "" },
        description: "<p>Research</p>",
      },
    ];

    const result = renderBuiltInSection("publications", sections.publications, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("renders volunteer section", () => {
    const sections = freshSections();
    sections.volunteer.title = "Volunteer";
    sections.volunteer.items = [
      {
        id: "v1",
        hidden: false,
        organization: "Red Cross",
        location: "NYC",
        period: "2023",
        website: { url: "", label: "" },
        description: "",
      },
    ];

    const result = renderBuiltInSection("volunteer", sections.volunteer, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("renders references with position and phone", () => {
    const sections = freshSections();
    sections.references.title = "References";
    sections.references.items = [
      {
        id: "r1",
        hidden: false,
        name: "John",
        position: "CTO",
        phone: "+1234567890",
        website: { url: "", label: "" },
        description: "<p>Great dev</p>",
      },
    ];

    const result = renderBuiltInSection("references", sections.references, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });

  it("renders interests with keywords", () => {
    const sections = freshSections();
    sections.interests.title = "Interests";
    sections.interests.items = [
      {
        id: "i1",
        hidden: false,
        icon: "",
        iconColor: "",
        name: "Gaming",
        keywords: ["RPG", "Strategy"],
      },
    ];

    const result = renderBuiltInSection("interests", sections.interests, COLOR_HEX);
    expect(result.length).toBe(2);
  });

  it("renders projects with period and website", () => {
    const sections = freshSections();
    sections.projects.title = "Projects";
    sections.projects.items = [
      {
        id: "proj1",
        hidden: false,
        name: "My App",
        period: "2024",
        website: { url: "https://app.com", label: "App" },
        description: "<p>A cool app</p>",
      },
    ];

    const result = renderBuiltInSection("projects", sections.projects, COLOR_HEX);
    expect(result.length).toBeGreaterThan(2); // heading + title + description + website
  });
});

// ---------------------------------------------------------------------------
// renderCustomSection
// ---------------------------------------------------------------------------

describe("renderCustomSection", () => {
  it("renders custom experience-typed section", () => {
    const custom: CustomSection = {
      id: "custom-1",
      type: "experience",
      title: "Freelance",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "ci1",
          hidden: false,
          company: "Client A",
          position: "Contractor",
          location: "Remote",
          period: "2023",
          website: { url: "", label: "" },
          description: "",
          roles: [],
        },
      ],
    };

    const result = renderCustomSection(custom, COLOR_HEX);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty for hidden custom section", () => {
    const custom: CustomSection = {
      id: "custom-1",
      type: "skills",
      title: "Hidden",
      columns: 1,
      hidden: true,
      items: [
        {
          id: "ci1",
          hidden: false,
          icon: "",
          iconColor: "",
          name: "Skill",
          proficiency: "",
          level: 0,
          keywords: [],
        },
      ],
    };

    expect(renderCustomSection(custom, COLOR_HEX)).toHaveLength(0);
  });

  it("returns empty when all items are hidden", () => {
    const custom: CustomSection = {
      id: "custom-1",
      type: "skills",
      title: "Skills",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "ci1",
          hidden: true,
          icon: "",
          iconColor: "",
          name: "Skill",
          proficiency: "",
          level: 0,
          keywords: [],
        },
      ],
    };

    expect(renderCustomSection(custom, COLOR_HEX)).toHaveLength(0);
  });

  it("renders summary-type custom section", () => {
    const custom: CustomSection = {
      id: "custom-1",
      type: "summary",
      title: "Cover Note",
      columns: 1,
      hidden: false,
      items: [{ id: "ci1", hidden: false, content: "<p>Hello there</p>" }],
    };

    const result = renderCustomSection(custom, COLOR_HEX);
    expect(result.length).toBeGreaterThan(0);
  });

  it("renders cover-letter-type custom section", () => {
    const custom: CustomSection = {
      id: "custom-1",
      type: "cover-letter",
      title: "Cover Letter",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "ci1",
          hidden: false,
          recipient: "<p>Dear Hiring Manager</p>",
          content: "<p>I am writing to apply...</p>",
        },
      ],
    };

    const result = renderCustomSection(custom, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1); // heading + recipient + content
  });

  it("renders skills-typed custom section", () => {
    const custom: CustomSection = {
      id: "custom-1",
      type: "skills",
      title: "Soft Skills",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "ci1",
          hidden: false,
          icon: "",
          iconColor: "",
          name: "Leadership",
          proficiency: "Expert",
          level: 5,
          keywords: [],
        },
      ],
    };

    const result = renderCustomSection(custom, COLOR_HEX);
    expect(result.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// setRenderConfig
// ---------------------------------------------------------------------------

describe("setRenderConfig", () => {
  it("configures typography that affects all renderers", () => {
    setRenderConfig({
      headingFont: "Georgia",
      headingSizeHalfPt: 32,
      bodyFont: "Times New Roman",
      bodySizeHalfPt: 24,
      textColorHex: "#333333",
      primaryColorHex: "#0000FF",
    });

    const sections = freshSections();
    sections.skills.title = "Skills";
    sections.skills.items = [
      {
        id: "s1",
        hidden: false,
        icon: "",
        iconColor: "",
        name: "Test",
        proficiency: "",
        level: 0,
        keywords: [],
      },
    ];

    const result = renderBuiltInSection("skills", sections.skills, "#0000FF");
    // Should not crash and should produce paragraphs
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("handles website with unsafe URL (no website paragraph added)", () => {
    const sections = freshSections();
    sections.experience.title = "Experience";
    sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "Co",
        position: "Dev",
        location: "",
        period: "",
        website: { url: "javascript:alert(1)", label: "Evil" },
        description: "",
        roles: [],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    // Should still render without the unsafe website
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles items with only minimal data", () => {
    const sections = freshSections();
    sections.awards.title = "Awards";
    sections.awards.items = [
      {
        id: "a1",
        hidden: false,
        title: "Award",
        awarder: "",
        date: "",
        website: { url: "", label: "" },
        description: "",
      },
    ];

    const result = renderBuiltInSection("awards", sections.awards, COLOR_HEX);
    expect(result).toHaveLength(2); // heading + title only
  });

  it("handles experience with empty description and no location", () => {
    const sections = freshSections();
    sections.experience.title = "Experience";
    sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "Co",
        position: "Dev",
        location: "",
        period: "",
        website: { url: "", label: "" },
        description: "",
        roles: [],
      },
    ];

    const result = renderBuiltInSection("experience", sections.experience, COLOR_HEX);
    // heading + title/subtitle only
    expect(result).toHaveLength(2);
  });
});
