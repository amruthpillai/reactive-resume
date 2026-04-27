import type { toast } from "sonner";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { defaultResumeData } from "@/schema/resume/data";

import { useResumeStore } from "./resume";

// Mock dependencies before importing the store
vi.mock("@lingui/core/macro", () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn<typeof toast.error>(() => "toast-id"),
    dismiss: vi.fn<typeof toast.dismiss>(),
  },
}));

vi.mock("@/integrations/orpc/client", () => ({
  orpc: {
    resume: {
      update: {
        call: vi.fn<() => Promise<void>>(() => Promise.resolve()),
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResume(overrides?: Record<string, unknown>) {
  return {
    id: "test-resume-id",
    name: "Test Resume",
    slug: "test-resume",
    tags: ["test"],
    isLocked: false,
    data: structuredClone(defaultResumeData),
    ...overrides,
  };
}

afterEach(() => {
  // Reset store between tests
  useResumeStore.getState().initialize(null);
});

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

describe("useResumeStore — initialize", () => {
  it("sets resume and isReady to true", () => {
    const resume = makeResume();
    useResumeStore.getState().initialize(resume);

    const state = useResumeStore.getState();
    expect(state.isReady).toBe(true);
    expect(state.resume.id).toBe("test-resume-id");
    expect(state.resume.name).toBe("Test Resume");
  });

  it("sets isReady to false when initialized with null", () => {
    useResumeStore.getState().initialize(null);

    const state = useResumeStore.getState();
    expect(state.isReady).toBe(false);
  });

  it("replaces previous resume data", () => {
    useResumeStore.getState().initialize(makeResume({ name: "First" }));
    expect(useResumeStore.getState().resume.name).toBe("First");

    useResumeStore.getState().initialize(makeResume({ name: "Second" }));
    expect(useResumeStore.getState().resume.name).toBe("Second");
  });
});

// ---------------------------------------------------------------------------
// updateResumeData
// ---------------------------------------------------------------------------

describe("useResumeStore — updateResumeData", () => {
  it("updates resume data via immer draft", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.name = "Jane Doe";
    });

    expect(useResumeStore.getState().resume.data.basics.name).toBe("Jane Doe");
  });

  it("can update nested fields", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.website.url = "https://example.com";
      draft.basics.email = "jane@example.com";
    });

    expect(useResumeStore.getState().resume.data.basics.website.url).toBe("https://example.com");
    expect(useResumeStore.getState().resume.data.basics.email).toBe("jane@example.com");
  });

  it("can add items to sections", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.sections.skills.items.push({
        id: "s1",
        hidden: false,
        icon: "",
        iconColor: "",
        name: "TypeScript",
        proficiency: "Advanced",
        level: 4,
        keywords: [],
      });
    });

    expect(useResumeStore.getState().resume.data.sections.skills.items).toHaveLength(1);
    expect(useResumeStore.getState().resume.data.sections.skills.items[0].name).toBe("TypeScript");
  });

  it("does not update when resume is not initialized", () => {
    // Store starts with null resume
    useResumeStore.getState().initialize(null);

    expect(() =>
      useResumeStore.getState().updateResumeData((draft) => {
        draft.basics.name = "Should not apply";
      }),
    ).not.toThrow();

    expect(useResumeStore.getState().isReady).toBe(false);
  });

  it("blocks updates when resume is locked", async () => {
    const { toast } = await import("sonner");
    useResumeStore.getState().initialize(makeResume({ isLocked: true }));

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.name = "Should not apply";
    });

    // Name should remain unchanged
    expect(useResumeStore.getState().resume.data.basics.name).toBe("");
    // Should show error toast
    expect(toast.error).toHaveBeenCalled();
  });

  it("does not block updates on unlocked resume", () => {
    useResumeStore.getState().initialize(makeResume({ isLocked: false }));

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.name = "Updated";
    });

    expect(useResumeStore.getState().resume.data.basics.name).toBe("Updated");
  });
});

// ---------------------------------------------------------------------------
// Multiple updates
// ---------------------------------------------------------------------------

describe("useResumeStore — multiple updates", () => {
  it("applies sequential updates correctly", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.name = "First Update";
    });

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.headline = "Developer";
    });

    const data = useResumeStore.getState().resume.data;
    expect(data.basics.name).toBe("First Update");
    expect(data.basics.headline).toBe("Developer");
  });

  it("preserves unmodified sections across updates", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.basics.name = "Jane";
    });

    // Metadata and other sections should be untouched
    expect(useResumeStore.getState().resume.data.metadata.template).toBe("onyx");
    expect(useResumeStore.getState().resume.data.sections.skills.items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Temporal store (undo/redo)
// ---------------------------------------------------------------------------

describe("useResumeStore — temporal", () => {
  it("has a temporal store accessible", () => {
    expect(useResumeStore.temporal).toBeDefined();
    expect(useResumeStore.temporal.getState).toBeDefined();
  });

  it("temporal store has undo/redo actions", () => {
    const temporal = useResumeStore.temporal.getState();
    expect(typeof temporal.undo).toBe("function");
    expect(typeof temporal.redo).toBe("function");
    expect(typeof temporal.clear).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("useResumeStore — edge cases", () => {
  it("can update metadata fields", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.metadata.template = "pikachu";
    });

    expect(useResumeStore.getState().resume.data.metadata.template).toBe("pikachu");
  });

  it("can update picture settings", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.picture.url = "https://example.com/photo.jpg";
      draft.picture.size = 120;
    });

    expect(useResumeStore.getState().resume.data.picture.url).toBe("https://example.com/photo.jpg");
    expect(useResumeStore.getState().resume.data.picture.size).toBe(120);
  });

  it("can remove all items from a section", () => {
    const resume = makeResume();
    resume.data.sections.skills.items = [
      {
        id: "s1",
        hidden: false,
        icon: "",
        iconColor: "",
        name: "JS",
        proficiency: "",
        level: 0,
        keywords: [],
      },
    ];
    useResumeStore.getState().initialize(resume);

    useResumeStore.getState().updateResumeData((draft) => {
      draft.sections.skills.items = [];
    });

    expect(useResumeStore.getState().resume.data.sections.skills.items).toHaveLength(0);
  });

  it("can update custom sections", () => {
    useResumeStore.getState().initialize(makeResume());

    useResumeStore.getState().updateResumeData((draft) => {
      draft.customSections.push({
        id: "custom-1",
        type: "experience",
        title: "Freelance",
        columns: 1,
        hidden: false,
        items: [],
      });
    });

    expect(useResumeStore.getState().resume.data.customSections).toHaveLength(1);
    expect(useResumeStore.getState().resume.data.customSections[0].title).toBe("Freelance");
  });
});
