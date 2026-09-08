// @vitest-environment happy-dom
import type { Template } from "@reactive-resume/schema/templates";
import { fireEvent, render, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { FeatureExplorer } from "./feature-explorer";
import { TemplateShelf } from "./template-shelf";

i18n.loadAndActivate({ locale: "en", messages: {} });

function Shelf() {
	const [template, setTemplate] = useState<Template>("azurill");
	return (
		<I18nProvider i18n={i18n}>
			<TemplateShelf template={template} onChange={setTemplate} />
		</I18nProvider>
	);
}

it("wraps the template shelf and keeps the PDF link aligned with the selection", () => {
	const { getByRole } = render(<Shelf />);
	fireEvent.click(getByRole("button", { name: "Previous template" }));
	expect(getByRole("link", { name: /Open template PDF/ })).toHaveAttribute("href", "/templates/pdf/scizor.pdf");
	fireEvent.click(getByRole("button", { name: "Next template" }));
	expect(getByRole("link", { name: /Open template PDF/ })).toHaveAttribute("href", "/templates/pdf/azurill.pdf");
	fireEvent.click(within(getByRole("group", { name: "Choose a template" })).getByRole("button", { name: "Rhyhorn" }));
	expect(getByRole("link", { name: /Open template PDF/ })).toHaveAttribute("href", "/templates/pdf/rhyhorn.pdf");
	expect(getByRole("button", { name: "Choose Rhyhorn" })).toHaveAttribute("aria-pressed", "true");
});

it("lets visitors undo edits, change sharing previews, and reset the example application", () => {
	const { getByRole, getByText, queryByText } = render(
		<I18nProvider i18n={i18n}>
			<FeatureExplorer />
		</I18nProvider>,
	);
	fireEvent.click(getByRole("button", { name: "Use this wording" }));
	expect(getByText(/Designed a shared component library/)).toBeVisible();
	fireEvent.click(getByRole("button", { name: "Undo" }));
	expect(queryByText(/Designed a shared component library/)).toBeNull();
	fireEvent.click(getByRole("button", { name: /A link worth sharing/ }));
	fireEvent.click(getByRole("button", { name: "Private" }));
	expect(getByRole("heading", { name: "Resume not found" })).toBeVisible();
	fireEvent.click(getByRole("button", { name: "Password" }));
	expect(getByRole("heading", { name: "Password required" })).toBeVisible();
	fireEvent.click(getByRole("button", { name: /Know where things stand/ }));
	fireEvent.click(getByRole("button", { name: "Move to interview" }));
	fireEvent.click(getByRole("button", { name: "Move to offer" }));
	expect(getByRole("status")).toHaveTextContent("Offer");
	fireEvent.click(getByRole("button", { name: "Reset" }));
	expect(getByRole("status")).toHaveTextContent("Applied");
	fireEvent.click(getByRole("button", { name: /Fits into your workflow/ }));
	fireEvent.click(getByRole("button", { name: "Pause data flow animation" }));
	expect(getByRole("button", { name: "Play data flow animation" })).toBeVisible();
	fireEvent.click(getByRole("button", { name: "Play data flow animation" }));
	expect(getByRole("button", { name: "Pause data flow animation" })).toBeVisible();
});
