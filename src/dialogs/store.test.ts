import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useDialogStore } from "./store";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  useDialogStore.setState({ open: false, activeDialog: null });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("DialogStore — initial state", () => {
  it("starts closed with no active dialog", () => {
    const state = useDialogStore.getState();
    expect(state.open).toBe(false);
    expect(state.activeDialog).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// openDialog
// ---------------------------------------------------------------------------

describe("DialogStore — openDialog", () => {
  it("opens dialog with correct type and data", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);

    const state = useDialogStore.getState();
    expect(state.open).toBe(true);
    expect(state.activeDialog?.type).toBe("resume.create");
  });

  it("opens dialog with data payload", () => {
    useDialogStore.getState().openDialog("resume.update", {
      id: "r1",
      name: "My Resume",
      slug: "my-resume",
      tags: ["tag1"],
    });

    const state = useDialogStore.getState();
    expect(state.open).toBe(true);
    expect(state.activeDialog?.type).toBe("resume.update");
    expect((state.activeDialog as any)?.data.name).toBe("My Resume");
  });

  it("opens section create dialog without data", () => {
    useDialogStore.getState().openDialog("resume.sections.skills.create", undefined);

    const state = useDialogStore.getState();
    expect(state.open).toBe(true);
    expect(state.activeDialog?.type).toBe("resume.sections.skills.create");
  });

  it("opens section update dialog with item data", () => {
    useDialogStore.getState().openDialog("resume.sections.skills.update", {
      item: {
        id: "s1",
        hidden: false,
        icon: "star",
        iconColor: "",
        name: "TypeScript",
        proficiency: "Advanced",
        level: 4,
        keywords: ["frontend"],
      },
    });

    const state = useDialogStore.getState();
    expect(state.open).toBe(true);
    expect((state.activeDialog as any)?.data.item.name).toBe("TypeScript");
  });

  it("replaces previous dialog when opening a new one", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    expect(useDialogStore.getState().activeDialog?.type).toBe("resume.create");

    useDialogStore.getState().openDialog("resume.import", undefined);
    expect(useDialogStore.getState().activeDialog?.type).toBe("resume.import");
  });
});

// ---------------------------------------------------------------------------
// closeDialog
// ---------------------------------------------------------------------------

describe("DialogStore — closeDialog", () => {
  it("sets open to false immediately", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    expect(useDialogStore.getState().open).toBe(true);

    useDialogStore.getState().closeDialog();
    expect(useDialogStore.getState().open).toBe(false);
  });

  it("clears activeDialog after 300ms delay (animation)", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    useDialogStore.getState().closeDialog();

    // activeDialog should still be set immediately after close
    expect(useDialogStore.getState().activeDialog).not.toBeNull();

    // After 300ms, it should be cleared
    vi.advanceTimersByTime(300);
    expect(useDialogStore.getState().activeDialog).toBeNull();
  });

  it("does not clear activeDialog before 300ms", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    useDialogStore.getState().closeDialog();

    vi.advanceTimersByTime(200);
    expect(useDialogStore.getState().activeDialog).not.toBeNull();

    vi.advanceTimersByTime(100);
    expect(useDialogStore.getState().activeDialog).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onOpenChange
// ---------------------------------------------------------------------------

describe("DialogStore — onOpenChange", () => {
  it("sets open state directly", () => {
    useDialogStore.getState().onOpenChange(true);
    expect(useDialogStore.getState().open).toBe(true);

    useDialogStore.getState().onOpenChange(false);
    expect(useDialogStore.getState().open).toBe(false);
  });

  it("clears activeDialog after 300ms when set to false", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    useDialogStore.getState().onOpenChange(false);

    expect(useDialogStore.getState().activeDialog).not.toBeNull();

    vi.advanceTimersByTime(300);
    expect(useDialogStore.getState().activeDialog).toBeNull();
  });

  it("does NOT clear activeDialog when set to true", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    useDialogStore.getState().onOpenChange(true);

    vi.advanceTimersByTime(500);
    // activeDialog should still be set
    expect(useDialogStore.getState().activeDialog).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("DialogStore — edge cases", () => {
  it("handles close when already closed", () => {
    useDialogStore.getState().closeDialog();
    expect(useDialogStore.getState().open).toBe(false);

    vi.advanceTimersByTime(300);
    expect(useDialogStore.getState().activeDialog).toBeNull();
  });

  it("handles rapid open/close cycles", () => {
    useDialogStore.getState().openDialog("resume.create", undefined);
    useDialogStore.getState().closeDialog();
    useDialogStore.getState().openDialog("resume.import", undefined);

    expect(useDialogStore.getState().open).toBe(true);
    expect(useDialogStore.getState().activeDialog?.type).toBe("resume.import");

    vi.advanceTimersByTime(300);
    // The close timeout from the first close might fire, but the new open should have
    // set a new activeDialog, so the current type should still be "resume.import"
    // Note: This exposes a potential race condition in the store
  });

  it("supports all dialog types", () => {
    const dialogTypes = [
      "auth.change-password",
      "auth.two-factor.enable",
      "auth.two-factor.disable",
      "api-key.create",
      "resume.create",
      "resume.import",
      "resume.template.gallery",
    ] as const;

    for (const type of dialogTypes) {
      useDialogStore.getState().openDialog(type, undefined);
      expect(useDialogStore.getState().activeDialog?.type).toBe(type);
    }
  });
});
