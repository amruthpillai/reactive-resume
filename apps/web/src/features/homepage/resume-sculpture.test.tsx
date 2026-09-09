// @vitest-environment happy-dom

import type { SculptureTemplate } from "./resume-sculpture";
import { fireEvent, render } from "@testing-library/react";
import { expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { ResumeSculpture } from "./resume-sculpture";

i18n.loadAndActivate({ locale: "en", messages: {} });

function ControlledSculpture() {
	const [name, setName] = useState("Alex Morgan");
	const [template, setTemplate] = useState<SculptureTemplate>("ditgar");
	const [accent, setAccent] = useState("#735c9a");
	const [typeface, setTypeface] = useState<"sans" | "serif">("sans");
	return (
		<I18nProvider i18n={i18n}>
			<ResumeSculpture
				template={template}
				onTemplateChange={setTemplate}
				name={name}
				onNameChange={setName}
				accent={accent}
				onAccentChange={setAccent}
				typeface={typeface}
				onTypefaceChange={setTypeface}
			/>
		</I18nProvider>
	);
}

it("applies the controlled name, color, and typeface to the resume", () => {
	const { getByRole, getByLabelText } = render(<ControlledSculpture />);
	fireEvent.change(getByLabelText("Your name"), { target: { value: "Sam Rivera" } });
	const preview = getByRole("article", { name: "Sample resume for Sam Rivera" });
	expect(preview).toHaveTextContent("Sam Rivera");
	fireEvent.click(getByRole("button", { name: "Moss" }));
	expect(preview).toHaveStyle({ "--resume-accent": "#507665" });
	expect(getByRole("button", { name: "Moss" })).toHaveAttribute("aria-pressed", "true");
	expect(getByRole("button", { name: "Plum" })).toHaveAttribute("aria-pressed", "false");
	fireEvent.click(getByRole("button", { name: "Serif" }));
	expect(preview).toHaveAttribute("data-typeface", "serif");
	expect(getByRole("button", { name: "Serif" })).toHaveAttribute("aria-pressed", "true");
	expect(getByRole("button", { name: "Sans" })).toHaveAttribute("aria-pressed", "false");
	const longName = "W".repeat(40);
	fireEvent.change(getByLabelText("Your name"), { target: { value: longName } });
	const longNamePreview = getByRole("article", { name: `Sample resume for ${longName}` });
	expect(longNamePreview).toHaveTextContent(longName);
	expect(longNamePreview).toHaveAttribute("data-long-name", "true");
	fireEvent.change(getByLabelText("Your name"), { target: { value: "Alex Morgan" } });
	expect(getByRole("article", { name: "Sample resume for Alex Morgan" })).toHaveAttribute("data-long-name", "false");
});

it("spreads and restacks the pages through the accessible button", () => {
	const { getByRole, container } = render(<ControlledSculpture />);
	const button = getByRole("button", { name: "Spread pages" });
	fireEvent.click(button);
	expect(getByRole("button", { name: "Stack pages" })).toHaveAttribute("aria-pressed", "true");
	expect(container.querySelector(".sculpture-rig")).toHaveAttribute("data-spread", "true");
	fireEvent.click(button);
	expect(getByRole("button", { name: "Spread pages" })).toHaveAttribute("aria-pressed", "false");
	expect(container.querySelector(".sculpture-rig")).toHaveAttribute("data-spread", "false");
});

it("brings each live template forward and keeps all three papers in sync", () => {
	const { getByRole, getByLabelText, container } = render(<ControlledSculpture />);
	fireEvent.change(getByLabelText("Your name"), { target: { value: "Sam Rivera" } });
	for (const template of ["Azurill", "Bronzor", "Ditgar"]) {
		fireEvent.click(getByRole("button", { name: template }));
		const active = getByRole("article", { name: "Sample resume for Sam Rivera" });
		expect(active).toHaveAttribute("data-template", template.toLowerCase());
		expect(active).toHaveAttribute("data-position", "front");
		expect(getByRole("button", { name: template })).toHaveAttribute("aria-pressed", "true");
	}
	const papers = container.querySelectorAll(".sculpture-paper");
	expect(papers).toHaveLength(3);
	for (const paper of papers) {
		expect(paper).toHaveTextContent("Sam Rivera");
		expect(paper.querySelector(".sculpture-paper-face")).not.toBeNull();
		expect(paper.querySelector(".sculpture-paper-back")).not.toBeNull();
		expect(paper.querySelectorAll(".sculpture-edge")).toHaveLength(4);
	}
});
