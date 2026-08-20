import type { UIMessage } from "ai";
import { t } from "@lingui/core/macro";
import { FileTextIcon, GlobeIcon, ReadCvLogoIcon, WrenchIcon } from "@phosphor-icons/react";
import { Badge } from "@reactive-resume/ui/components/badge";

export type ToolPartCardProps = {
	part: UIMessage["parts"][number];
};

type ToolPartFields = {
	type: string;
	toolName?: string;
	state?: string;
	input?: unknown;
	output?: unknown;
	errorText?: string;
};

function toolDisplay(part: ToolPartFields): { label: string; icon: React.ReactNode } {
	switch (part.type) {
		case "tool-read_resume": {
			return { label: t`Read the resume`, icon: <ReadCvLogoIcon /> };
		}
		case "tool-read_attachment": {
			return { label: t`Read an attachment`, icon: <FileTextIcon /> };
		}
		case "tool-web_search": {
			return { label: t`Searched the web`, icon: <GlobeIcon /> };
		}
		default: {
			return { label: part.toolName ?? part.type, icon: <WrenchIcon /> };
		}
	}
}

function stateBadge(state: string | undefined, errorText: string | undefined) {
	if (state === "output-error" || errorText) return { label: t`Failed`, variant: "destructive" as const };
	if (state === "output-available") return { label: t`Done`, variant: "outline" as const };
	return { label: t`Running…`, variant: "secondary" as const };
}

function payloadPreview(value: unknown) {
	if (value === undefined || value === null) return null;
	const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
	return text.length > 4_000 ? `${text.slice(0, 4_000)}…` : text;
}

// Generic collapsed card for tool activity that previously rendered as nothing:
// read_resume / read_attachment / web_search plus the dynamic-tool fallback.
export function ToolPartCard({ part }: ToolPartCardProps) {
	const fields = part as ToolPartFields;
	const { label, icon } = toolDisplay(fields);
	const badge = stateBadge(fields.state, fields.errorText);
	const inputPreview = payloadPreview(fields.input);
	const outputPreview = payloadPreview(fields.output);

	return (
		<details className="group text-muted-foreground text-xs">
			<summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md py-1 font-medium hover:text-foreground [&::-webkit-details-marker]:hidden">
				{icon}
				<span>{label}</span>
				<Badge variant={badge.variant}>{badge.label}</Badge>
			</summary>

			<div className="mt-2 space-y-2 rounded-md border bg-muted/20 p-3">
				{fields.errorText ? <p className="text-rose-500">{fields.errorText}</p> : null}
				{inputPreview && inputPreview !== "{}" ? (
					<pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border bg-background p-2 font-mono text-[0.7rem]">
						{inputPreview}
					</pre>
				) : null}
				{outputPreview ? (
					<pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border bg-background p-2 font-mono text-[0.7rem]">
						{outputPreview}
					</pre>
				) : null}
			</div>
		</details>
	);
}
