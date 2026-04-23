import { afterEach, describe, expect, it } from "vite-plus/test";

import { useSectionStore } from "./section";

afterEach(() => {
  useSectionStore.setState({ sections: {} });
});

describe("useSectionStore", () => {
  it("tracks collapsed and hidden state independently", () => {
    useSectionStore.getState().setCollapsed("education", true);
    useSectionStore.getState().setHidden("education", true);

    const section = useSectionStore.getState().sections.education;

    expect(section?.collapsed).toBe(true);
    expect(section?.hidden).toBe(true);
  });

  it("preserves hidden state when toggling collapsed state", () => {
    useSectionStore.getState().setHidden("education", true);
    useSectionStore.getState().toggleCollapsed("education");

    const section = useSectionStore.getState().sections.education;

    expect(section?.collapsed).toBe(true);
    expect(section?.hidden).toBe(true);
  });

  it("preserves hidden state when toggling all sections", () => {
    useSectionStore.getState().setHidden("education", true);
    useSectionStore.getState().toggleAll();

    const section = useSectionStore.getState().sections.education;

    expect(section?.hidden).toBe(true);
  });
});
