// @vitest-environment happy-dom

import type { CoverLetter } from "@reactive-resume/schema/cover-letter/data";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render as renderComponent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { ORPCError } from "@orpc/client";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { CoverLetterEditor } from "./editor";

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));
afterEach(cleanup);
type WrapperProps = { children: ReactNode };
function Wrapper({ children }: WrapperProps) {
	return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
const render = (ui: ReactNode) => renderComponent(ui, { wrapper: Wrapper });

vi.mock("@/components/input/rich-input", () => ({
	RichInput: ({
		value,
		onChange,
		"aria-label": label,
		editable,
	}: {
		value: string;
		onChange: (value: string) => void;
		"aria-label": string;
		editable?: boolean;
	}) => (
		<textarea
			aria-label={label}
			value={value}
			disabled={editable === false}
			onChange={(event) => onChange(event.target.value)}
		/>
	),
}));

const { notes: _notes, layout: _layout, ...metadata } = defaultResumeData.metadata;
const letter: CoverLetter = {
	id: "letter-1",
	name: "Engineer application",
	recipient: "Hiring team",
	content: "Original letter",
	style: {
		basics: defaultResumeData.basics,
		picture: defaultResumeData.picture,
		metadata,
		sectionId: "section-1",
		itemId: "item-1",
	},
	sourceResumeId: null,
	sourceApplicationId: null,
	revision: 3,
	createdAt: new Date("2026-09-05T12:00:00Z"),
	updatedAt: new Date("2026-09-05T12:00:00Z"),
};

describe("CoverLetterEditor", () => {
	it("keeps edits after a failed save", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
		render(<CoverLetterEditor letter={letter} onSave={onSave} onClose={() => {}} />);
		fireEvent.change(screen.getByLabelText("Content"), { target: { value: "My unsaved draft" } });
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		await screen.findByRole("alert");
		expect(screen.getByLabelText("Content")).toHaveValue("My unsaved draft");
		expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
	});

	it("saves current content with original revision and uses returned revision for the next edit", async () => {
		const onSave = vi.fn().mockImplementation(async (changes) => ({ ...letter, ...changes, revision: 4 }));
		render(<CoverLetterEditor letter={letter} onSave={onSave} onClose={() => {}} />);
		fireEvent.change(screen.getByLabelText("Content"), { target: { value: "New letter" } });
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled());
		fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated name" } });
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
		expect(onSave.mock.calls[0]?.[0]).toMatchObject({ content: "New letter", expectedRevision: 3 });
		expect(onSave.mock.calls[1]?.[0]).toMatchObject({
			name: "Updated name",
			content: "New letter",
			expectedRevision: 4,
		});
	});

	it("keeps local input and revision when another editor changed the document", async () => {
		const onSave = vi.fn().mockRejectedValue(new ORPCError("CONFLICT"));
		const view = render(<CoverLetterEditor letter={letter} onSave={onSave} onClose={() => {}} />);
		fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Local draft" } });
		view.rerender(
			<CoverLetterEditor
				letter={{ ...letter, content: "Other editor", revision: 4 }}
				onSave={onSave}
				onClose={() => {}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		await screen.findByRole("alert");
		expect(screen.getByLabelText("Content")).toHaveValue("Local draft");
		expect(onSave.mock.calls[0]?.[0]).toMatchObject({ expectedRevision: 3 });
		expect(screen.getByRole("alert")).toHaveTextContent(/changed elsewhere/i);
	});

	it("disables editing and duplicate submission while saving", async () => {
		let resolveSave!: (result: CoverLetter) => void;
		const onSave = vi.fn(
			() =>
				new Promise<CoverLetter>((resolve) => {
					resolveSave = resolve;
				}),
		);
		render(<CoverLetterEditor letter={letter} onSave={onSave} onClose={() => {}} />);
		fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Pending letter" } });
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		expect(screen.getByLabelText("Name")).toBeDisabled();
		expect(screen.getByLabelText("Content")).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		expect(onSave).toHaveBeenCalledTimes(1);
		resolveSave({ ...letter, content: "Pending letter", revision: 4 });
		await waitFor(() => expect(screen.getByLabelText("Name")).not.toBeDisabled());
	});
});
