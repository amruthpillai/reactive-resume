// @vitest-environment happy-dom
import type { ResumeSlot } from "@reactive-resume/schema/template-metadata";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { TemplateExtensionFields } from "./template-extension-fields";

function renderWithI18n(ui: ReactElement) {
	return render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>);
}

vi.mock("@/components/input/rich-input", () => ({
	RichInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
		<textarea data-testid="rich-input" value={value} onChange={(e) => onChange(e.target.value)} />
	),
}));

const textSlot: ResumeSlot = {
	id: "tagline",
	itemType: "experienceItem",
	type: "text",
	label: "Tagline",
	required: false,
};

const toggleSlot: ResumeSlot = {
	id: "featured",
	itemType: "experienceItem",
	type: "toggle",
	label: "Featured",
	required: false,
};

const urlSlot: ResumeSlot = {
	id: "logoUrl",
	itemType: "experienceItem",
	type: "url",
	label: "Logo URL",
	required: false,
};

describe("TemplateExtensionFields", () => {
	beforeAll(() => {
		i18n.loadAndActivate({ locale: "en", messages: {} });
	});

	it("renders nothing when slots is empty", () => {
		const { container } = renderWithI18n(<TemplateExtensionFields value={{}} onChange={() => undefined} slots={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders a text input for type=text", () => {
		renderWithI18n(<TemplateExtensionFields value={{}} onChange={() => undefined} slots={[textSlot]} />);
		expect(screen.getByLabelText("Tagline")).toBeTruthy();
	});

	it("renders a switch for type=toggle", () => {
		renderWithI18n(<TemplateExtensionFields value={{}} onChange={() => undefined} slots={[toggleSlot]} />);
		expect(screen.getByRole("switch")).toBeTruthy();
		expect(screen.getByText("Featured")).toBeTruthy();
	});

	it("calls onChange with updated extensions when a text field changes", async () => {
		const onChange = vi.fn();
		renderWithI18n(<TemplateExtensionFields value={{}} onChange={onChange} slots={[textSlot]} />);
		const input = screen.getByLabelText("Tagline");
		await userEvent.type(input, "A");
		expect(onChange).toHaveBeenCalledWith({ tagline: "A" });
	});

	it("renders URL input for type=url", () => {
		renderWithI18n(<TemplateExtensionFields value={{}} onChange={() => undefined} slots={[urlSlot]} />);
		expect(screen.getByLabelText("Logo URL")).toBeTruthy();
	});

	it("renders a disabled placeholder for type=image", () => {
		const imageSlot: ResumeSlot = {
			id: "img",
			itemType: "experienceItem",
			type: "image",
			label: "Photo",
			required: false,
		};
		renderWithI18n(<TemplateExtensionFields value={{}} onChange={() => undefined} slots={[imageSlot]} />);
		expect(screen.getByPlaceholderText(/coming in a future release/)).toBeTruthy();
	});
});
