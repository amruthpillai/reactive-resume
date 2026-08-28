import type { UIMessage } from "ai";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckIcon, ProhibitIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";

export type PatchApprovalResponse = {
	id: string;
	approved: boolean;
	reason?: string;
};

export type PatchApprovalCardProps = {
	part: UIMessage["parts"][number];
	disabled?: boolean;
	onRespond: (response: PatchApprovalResponse) => void;
};

type ApprovalPartFields = {
	state?: string;
	input?: unknown;
	approval?: { id?: string; approved?: boolean; reason?: string };
};

export type PatchOperationLike = { op?: unknown; path?: unknown; value?: unknown; from?: unknown };

function truncateValue(value: unknown, max = 80) {
	if (value === undefined) return null;
	const text = typeof value === "string" ? value : JSON.stringify(value);
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function OperationRow({ operation }: { operation: PatchOperationLike }) {
	const valuePreview = truncateValue(operation.value);

	return (
		<li className="flex min-w-0 items-baseline gap-2 font-mono text-[0.7rem] leading-relaxed">
			<Badge variant="outline" className="shrink-0 font-mono uppercase">
				{String(operation.op ?? "?")}
			</Badge>
			<span className="shrink-0 text-foreground">{String(operation.path ?? "")}</span>
			{typeof operation.from === "string" ? (
				<span className="truncate text-muted-foreground">
					{/* One translatable phrase: several languages place the source marker after the path. */}
					<Trans>Source: {operation.from}</Trans>
				</span>
			) : null}
			{valuePreview ? <span className="truncate text-muted-foreground">{valuePreview}</span> : null}
		</li>
	);
}

// Renders the approval lifecycle of an apply_resume_patch call: a pending request with
// Approve/Deny, the waiting state after a response, and the declined terminal state.
export function PatchApprovalCard({ part, disabled, onRespond }: PatchApprovalCardProps) {
	const [reason, setReason] = useState("");
	const fields = part as ApprovalPartFields;
	const input = (typeof fields.input === "object" && fields.input ? fields.input : {}) as Record<string, unknown>;
	const title = typeof input.title === "string" ? input.title : t`Resume edit`;
	const summary = typeof input.summary === "string" ? input.summary : null;
	const operations = Array.isArray(input.operations) ? (input.operations as PatchOperationLike[]) : [];
	const approvalId = typeof fields.approval?.id === "string" ? fields.approval.id : null;
	const state = fields.state;

	if (state === "output-denied") {
		return (
			<div className="flex items-center gap-2 text-muted-foreground text-xs">
				<ProhibitIcon />
				<span>
					<Trans>Edit declined</Trans>
					{fields.approval?.reason ? ` — ${fields.approval.reason}` : null}
				</span>
			</div>
		);
	}

	// Read-only threads keep the request visible but never actionable: responding would only
	// change local state before the server rejects the continuation.
	const isPending = state === "approval-requested" && approvalId !== null && !disabled;

	return (
		<div className="space-y-3 text-sm">
			<div className="flex items-center gap-2 font-medium">
				<ShieldCheckIcon className="text-muted-foreground" />
				<span>
					<Trans>Review this edit</Trans>
				</span>
			</div>

			<div className="min-w-0">
				<p className="truncate font-medium">{title}</p>
				{summary ? <p className="mt-0.5 text-muted-foreground text-xs">{summary}</p> : null}
			</div>

			{operations.length > 0 ? (
				<ul className="max-h-48 space-y-1 overflow-auto rounded-md border bg-muted/20 p-2">
					{operations.map((operation, index) => (
						<OperationRow key={`${String(operation.path)}-${index}`} operation={operation} />
					))}
				</ul>
			) : null}

			{isPending ? (
				<>
					<Textarea
						rows={1}
						value={reason}
						aria-label={t`Optional note for the agent`}
						placeholder={t`Optional note for the agent…`}
						className="min-h-8 text-xs"
						onChange={(event) => setReason(event.target.value)}
					/>
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							onClick={() =>
								onRespond({ id: approvalId, approved: true, ...(reason.trim() ? { reason: reason.trim() } : {}) })
							}
						>
							<CheckIcon />
							<Trans>Approve</Trans>
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() =>
								onRespond({ id: approvalId, approved: false, ...(reason.trim() ? { reason: reason.trim() } : {}) })
							}
						>
							<ProhibitIcon />
							<Trans>Deny</Trans>
						</Button>
					</div>
				</>
			) : (
				<p className={cn("text-muted-foreground text-xs")}>
					{fields.approval?.approved === false ? (
						<Trans>Denied, waiting for the agent…</Trans>
					) : fields.approval?.approved === true ? (
						<Trans>Approved, waiting for the agent…</Trans>
					) : (
						<Trans>This edit request can no longer be answered.</Trans>
					)}
				</p>
			)}
		</div>
	);
}
