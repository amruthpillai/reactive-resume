import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect } from "react";
import type { Theme } from "@/utils/theme";

const CSS_SELECTORS = [
	".page",
	".page-content",
	".page-header",
	".page-basics",
	".page-name",
	".page-headline",
	".page-main",
	".page-sidebar",
	".page-picture",
	".page-section",
	".section-content",
	".page-section-profiles",
	".page-section-experience",
	".page-section-education",
	".page-section-projects",
	".page-section-skills",
	".page-section-languages",
	".page-section-interests",
	".page-section-awards",
	".page-section-certifications",
	".page-section-publications",
	".page-section-volunteer",
	".page-section-references",
	".page-section-custom",
	".section-item",
	".section-item-header",
	".section-item-title",
	".section-item-name",
	".section-item-description",
	".section-item-metadata",
	".section-item-website",
	".section-item-icon",
	".section-item-level",
	".section-item-keywords",
	".section-item-proficiency",
	".section-item-fluency",
	".section-item-location",
	".section-item-publisher",
	".section-item-issuer",
	".section-item-awarder",
	".profiles-item",
	".profiles-item-header",
	".profiles-item-title",
	".profiles-item-name",
	".profiles-item-description",
	".profiles-item-website",
	".profiles-item-icon",
	".profiles-item-network",
	".experience-item",
	".experience-item-header",
	".experience-item-title",
	".experience-item-name",
	".experience-item-company",
	".experience-item-position",
	".experience-item-location",
	".experience-item-period",
	".experience-item-website",
	".experience-item-description",
	".education-item",
	".education-item-header",
	".education-item-title",
	".education-item-name",
	".education-item-description",
	".education-item-website",
	".projects-item",
	".projects-item-header",
	".projects-item-title",
	".projects-item-name",
	".projects-item-description",
	".projects-item-website",
	".skills-item",
	".skills-item-header",
	".skills-item-title",
	".skills-item-name",
	".skills-item-description",
	".skills-item-icon",
	".skills-item-level",
	".skills-item-keywords",
	".skills-item-proficiency",
	".languages-item",
	".languages-item-header",
	".languages-item-title",
	".languages-item-name",
	".languages-item-level",
	".languages-item-fluency",
	".interests-item",
	".interests-item-header",
	".interests-item-title",
	".interests-item-name",
	".interests-item-icon",
	".interests-item-keywords",
	".awards-item",
	".awards-item-header",
	".awards-item-title",
	".awards-item-name",
	".awards-item-description",
	".awards-item-website",
	".awards-item-awarder",
	".certifications-item",
	".certifications-item-header",
	".certifications-item-title",
	".certifications-item-name",
	".certifications-item-description",
	".certifications-item-website",
	".certifications-item-issuer",
	".publications-item",
	".publications-item-header",
	".publications-item-title",
	".publications-item-name",
	".publications-item-description",
	".publications-item-website",
	".publications-item-publisher",
	".volunteer-item",
	".volunteer-item-header",
	".volunteer-item-title",
	".volunteer-item-name",
	".volunteer-item-description",
	".volunteer-item-website",
	".volunteer-item-location",
	".references-item",
	".references-item-header",
	".references-item-title",
	".references-item-name",
	".references-item-description",
	".template-azurill",
	".template-bronzor",
	".template-chikorita",
	".template-ditto",
	".template-ditgar",
	".template-gengar",
	".template-glalie",
	".template-kakuna",
	".template-lapras",
	".template-leafish",
	".template-onyx",
	".template-pikachu",
	".template-rhyhorn",
];

const CSS_CLASS_SELECTOR_PATTERN = /\.([\w-]*)$/;

type Props = {
	theme: Theme;
	defaultValue: string;
	onChange: (value: string | undefined) => void;
};

export default function CSSMonacoEditor({ theme, defaultValue, onChange }: Props) {
	const monaco = useMonaco();

	useEffect(() => {
		if (!monaco) return;

		const completionProvider = monaco.languages.registerCompletionItemProvider("css", {
			triggerCharacters: ["."],
			provideCompletionItems: (model, position) => {
				const textUntilPosition = model.getValueInRange({
					startLineNumber: position.lineNumber,
					startColumn: 1,
					endLineNumber: position.lineNumber,
					endColumn: position.column,
				});

				const match = textUntilPosition.match(CSS_CLASS_SELECTOR_PATTERN);
				if (!match) return { suggestions: [] };

				const prefix = match[1].toLowerCase();
				const word = model.getWordUntilPosition(position);
				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};

				const suggestions = CSS_SELECTORS.filter((selector) => selector.toLowerCase().startsWith(`.${prefix}`)).map(
					(selector) => ({
						label: selector,
						kind: monaco.languages.CompletionItemKind.Class,
						insertText: selector,
						range,
						detail: "Resume CSS Selector",
						documentation: `CSS selector for ${selector.replace(".", "")}`,
					}),
				);

				return { suggestions };
			},
		});

		return () => {
			completionProvider.dispose();
		};
	}, [monaco]);

	return (
		<Editor
			language="css"
			onChange={onChange}
			defaultValue={defaultValue}
			theme={theme === "dark" ? "vs-dark" : "light"}
			options={{ tabSize: 2, wordWrap: "on", minimap: { enabled: false } }}
		/>
	);
}
