import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

afterEach(cleanup);

// Mock lingui macros
vi.mock("@lingui/core/macro", () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}));
vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  TagIcon: () => <span data-testid="tag-icon" />,
}));

import React from "react";

import { URLInput } from "./url-input";

describe("URLInput", () => {
  describe("URL prefix handling", () => {
    it("displays URL without https:// prefix", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "https://example.com", label: "" }} onChange={onChange} />);

      const input = screen.getByDisplayValue("example.com");
      expect(input).toBeDefined();
    });

    it("displays empty string when URL is empty", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "", label: "" }} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      const urlInput = inputs[0];
      expect((urlInput as HTMLInputElement).value).toBe("");
    });

    it("adds https:// prefix when user types", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "", label: "" }} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "example.com" } });

      expect(onChange).toHaveBeenCalledWith({
        url: "https://example.com",
        label: "",
      });
    });

    it("does not double-prefix when user types https://", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "", label: "" }} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "https://example.com" } });

      expect(onChange).toHaveBeenCalledWith({
        url: "https://example.com",
        label: "",
      });
    });

    it("sends empty URL when input is cleared", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "https://example.com", label: "" }} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith({
        url: "",
        label: "",
      });
    });
  });

  describe("label preservation", () => {
    it("preserves label when URL changes", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "https://old.com", label: "My Site" }} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "new.com" } });

      expect(onChange).toHaveBeenCalledWith({
        url: "https://new.com",
        label: "My Site",
      });
    });
  });

  describe("hideLabelButton prop", () => {
    it("hides the label button when hideLabelButton is true", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "", label: "" }} onChange={onChange} hideLabelButton={true} />);

      expect(screen.queryByTestId("tag-icon")).toBeNull();
    });

    it("shows the label button by default", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "", label: "" }} onChange={onChange} />);

      expect(screen.getByTestId("tag-icon")).toBeDefined();
    });
  });

  describe("displays the https:// prefix text", () => {
    it("shows https:// as static text", () => {
      const onChange = vi.fn<React.ComponentProps<typeof URLInput>["onChange"]>();
      render(<URLInput value={{ url: "", label: "" }} onChange={onChange} />);

      expect(screen.getByText("https://")).toBeDefined();
    });
  });
});
