// @vitest-environment happy-dom

import type { Website } from "@reactive-resume/schema/resume/data";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useAppForm } from "./tanstack-form";

vi.mock("@/components/input/url-input", () => ({
	URLInput: ({
		value,
		onChange,
		hideLabelButton,
	}: {
		value: Website;
		onChange: (value: Website) => void;
		hideLabelButton?: boolean;
	}) => (
		<input
			aria-label="Website value"
			data-hide-label-button={hideLabelButton}
			value={value.url}
			onChange={(event) => onChange({ ...value, url: event.target.value })}
		/>
	),
}));

vi.mock("@/components/input/rich-input", () => ({
	RichInput: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
		<textarea aria-label="Description value" value={value} onChange={(event) => onChange(event.target.value)} />
	),
}));

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

function TestForm() {
	const form = useAppForm({
		defaultValues: {
			description: "Initial description",
			website: { url: "https://example.com", label: "Example", inlineLink: false },
		},
	});

	return (
		<I18nProvider i18n={i18n}>
			<form.AppField
				name="website"
				validators={{ onChange: ({ value }) => (value.url ? undefined : "Website is required") }}
			>
				{(field) => <field.WebsiteField label="Website" hideLabelButton formItemClassName="website-field" />}
			</form.AppField>

			<form.AppField
				name="description"
				validators={{ onChange: ({ value }) => (value ? undefined : "Description is required") }}
			>
				{(field) => <field.RichTextField label="Description" formItemClassName="description-field" />}
			</form.AppField>
		</I18nProvider>
	);
}

describe("registered resume fields", () => {
	it("preserves labels, layout classes, attributes, values, and errors", async () => {
		const user = userEvent.setup();
		const { container } = render(<TestForm />);

		expect(screen.getByText("Website")).toBeInTheDocument();
		expect(screen.getByText("Description")).toBeInTheDocument();
		expect(container.querySelector(".website-field")).toBeInTheDocument();
		expect(container.querySelector(".description-field")).toBeInTheDocument();
		expect(screen.getByLabelText("Website value")).toHaveAttribute("data-hide-label-button", "true");

		await user.clear(screen.getByLabelText("Website value"));
		await user.clear(screen.getByLabelText("Description value"));

		expect(screen.getByText("Website is required")).toBeInTheDocument();
		expect(screen.getByText("Description is required")).toBeInTheDocument();
	});
});
