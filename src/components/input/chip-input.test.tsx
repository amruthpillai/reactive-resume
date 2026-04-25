import type * as DndKitCore from "@dnd-kit/core";
import type * as DndKitSortable from "@dnd-kit/sortable";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ChipInput } from "./chip-input";

afterEach(cleanup);

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn<typeof DndKitCore.closestCenter>(),
  KeyboardSensor: vi.fn<typeof DndKitCore.KeyboardSensor>(),
  PointerSensor: vi.fn<typeof DndKitCore.PointerSensor>(),
  useSensor: vi.fn<typeof DndKitCore.useSensor>(),
  useSensors: vi.fn<typeof DndKitCore.useSensors>(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  horizontalListSortingStrategy: vi.fn<typeof DndKitSortable.horizontalListSortingStrategy>(),
  sortableKeyboardCoordinates: vi.fn<typeof DndKitSortable.sortableKeyboardCoordinates>(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn<(node: HTMLElement | null) => void>(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// Mock framer motion
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock lingui
vi.mock("@lingui/core/macro", () => ({
  t: (stringsOrDescriptor: TemplateStringsArray | { message: string }, ...values: unknown[]) => {
    if (
      typeof stringsOrDescriptor === "object" &&
      "message" in stringsOrDescriptor &&
      typeof stringsOrDescriptor.message === "string"
    ) {
      return stringsOrDescriptor.message;
    }

    const strings = stringsOrDescriptor as TemplateStringsArray;
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
      result += String(values[i]) + strings[i + 1];
    }
    return result;
  },
}));

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  PencilSimpleIcon: ({ className }: any) => <span data-testid="edit-icon" className={className} />,
  XIcon: ({ className }: any) => <span data-testid="remove-icon" className={className} />,
}));

describe("ChipInput", () => {
  describe("rendering", () => {
    it("renders the input field", () => {
      render(<ChipInput />);
      expect(screen.getByRole("textbox")).toBeDefined();
    });

    it("renders existing chips", () => {
      render(<ChipInput value={["React", "TypeScript", "Node"]} />);
      expect(screen.getByText("React")).toBeDefined();
      expect(screen.getByText("TypeScript")).toBeDefined();
      expect(screen.getByText("Node")).toBeDefined();
    });

    it("renders no chips when value is empty", () => {
      render(<ChipInput value={[]} />);

      // Only the input area, no chip badges
      expect(screen.queryByText("React")).toBeNull();
    });

    it("shows description by default", () => {
      render(<ChipInput />);
      expect(screen.getByText(/Enter/)).toBeDefined();
    });

    it("hides description when hideDescription is true", () => {
      render(<ChipInput hideDescription />);
      expect(screen.queryByText(/Enter/)).toBeNull();
    });
  });

  describe("adding chips via Enter key", () => {
    it("adds a chip when Enter is pressed", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={[]} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "React" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith(["React"]);
    });

    it("does not add empty chips", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={[]} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).not.toHaveBeenCalled();
    });

    it("trims whitespace from chips", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={[]} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "  React  " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith(["React"]);
    });

    it("prevents duplicate chips", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={["React"]} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "React" } });
      fireEvent.keyDown(input, { key: "Enter" });

      // Set is used, so duplicates are filtered — onChange should be called with same array
      expect(onChange).toHaveBeenCalledWith(["React"]);
    });
  });

  describe("adding chips via comma", () => {
    it("adds a chip when comma is typed in the input", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={[]} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "React," } });

      expect(onChange).toHaveBeenCalledWith(["React"]);
    });

    it("handles multiple comma-separated values", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={[]} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "React,TypeScript," } });

      // First call adds "React", second call adds "TypeScript"
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("removing chips", () => {
    it("calls onChange without the removed chip when remove button is clicked", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={["React", "Vue", "Angular"]} onChange={onChange} />);

      // Find all remove buttons
      const removeButtons = screen.getAllByLabelText(/Remove/);
      fireEvent.click(removeButtons[1]); // Remove "Vue"

      expect(onChange).toHaveBeenCalledWith(["React", "Angular"]);
    });

    it("removes the first chip correctly", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={["A", "B", "C"]} onChange={onChange} />);

      const removeButtons = screen.getAllByLabelText(/Remove/);
      fireEvent.click(removeButtons[0]);

      expect(onChange).toHaveBeenCalledWith(["B", "C"]);
    });

    it("removes the last chip correctly", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={["A", "B", "C"]} onChange={onChange} />);

      const removeButtons = screen.getAllByLabelText(/Remove/);
      fireEvent.click(removeButtons[2]);

      expect(onChange).toHaveBeenCalledWith(["A", "B"]);
    });
  });

  describe("editing chips", () => {
    it("enters edit mode when edit button is clicked", () => {
      render(<ChipInput value={["React", "Vue"]} />);

      const editButtons = screen.getAllByLabelText(/Edit/);
      fireEvent.click(editButtons[0]);

      const input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("React");
      expect(input.getAttribute("aria-label")).toBe("Edit keyword");
    });

    it("exits edit mode with Escape key", () => {
      render(<ChipInput value={["React"]} />);

      const editButton = screen.getByLabelText("Edit React");
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Escape" });

      expect((input as HTMLInputElement).value).toBe("");
      expect(input.getAttribute("aria-label")).toBe("Add keyword");
    });

    it("saves edit when Enter is pressed", () => {
      const onChange = vi.fn<NonNullable<React.ComponentProps<typeof ChipInput>["onChange"]>>();
      render(<ChipInput value={["React"]} onChange={onChange} />);

      const editButton = screen.getByLabelText("Edit React");
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "React.js" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith(["React.js"]);
    });
  });

  describe("input placeholder", () => {
    it("shows 'Add a keyword...' by default", () => {
      render(<ChipInput />);
      expect(screen.getByPlaceholderText("Add a keyword...")).toBeDefined();
    });

    it("shows 'Editing keyword...' in edit mode", () => {
      render(<ChipInput value={["Test"]} />);

      const editButton = screen.getByLabelText("Edit Test");
      fireEvent.click(editButton);

      expect(screen.getByPlaceholderText("Editing keyword...")).toBeDefined();
    });
  });

  describe("uncontrolled mode", () => {
    it("works with defaultValue", () => {
      render(<ChipInput defaultValue={["Initial"]} />);
      expect(screen.getByText("Initial")).toBeDefined();
    });
  });
});
