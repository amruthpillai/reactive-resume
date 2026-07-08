import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@reactive-resume/ui/components/sheet";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { orpc } from "@/libs/orpc/client";
import { mapCsvToApplications, parseCsv } from "../csv";
import { applicationsListQueryKey } from "../queries";

const MAX_IMPORT = 500;
const SAMPLE =
	"Company,Role,Stage,Stage Date,Location,Salary,Source,Tags\nStripe,Frontend Engineer,applied,2026-07-01,Remote,$180k,LinkedIn,remote;react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ImportApplicationsSheet({ open, onOpenChange }: Props) {
	const queryClient = useQueryClient();
	const [text, setText] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	const parsed = useMemo(() => (text.trim() ? mapCsvToApplications(parseCsv(text)) : null), [text]);

	// The import endpoint caps a batch at 500; slice client-side and surface the overflow so the
	// user knows to split rather than getting a generic server rejection.
	const importable = parsed ? parsed.rows.slice(0, MAX_IMPORT) : [];
	const overflow = (parsed?.rows.length ?? 0) - importable.length;

	const resetFile = () => {
		if (fileRef.current) fileRef.current.value = "";
	};

	const importMutation = useMutation(
		orpc.applications.import.mutationOptions({
			onSuccess: (result) => {
				void queryClient.invalidateQueries({ queryKey: applicationsListQueryKey() });
				void queryClient.invalidateQueries({ queryKey: orpc.applications.stats.queryKey() });
				void queryClient.invalidateQueries({ queryKey: orpc.applications.tags.queryKey() });
				toast.success(t`Imported ${result.imported} application(s).`);
				setText("");
				resetFile();
				onOpenChange(false);
			},
			onError: () => toast.error(t`Import failed. Check the CSV and try again.`),
		}),
	);

	const onFile = (file: File | undefined) => {
		if (!file) return;
		file.text().then(setText);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 data-[side=right]:sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						<Trans>Import from CSV</Trans>
					</SheetTitle>
					<SheetDescription>
						<Trans>
							Paste rows or upload a .csv. We map columns like Company, Role, Stage, Stage Date, Salary, Source and
							Tags.
						</Trans>
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
					<div className="flex items-center gap-2">
						<Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
							<UploadSimpleIcon />
							<Trans>Upload .csv</Trans>
						</Button>
						<Button size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>
							<Trans>Use sample</Trans>
						</Button>
						<input
							ref={fileRef}
							type="file"
							accept=".csv,text/csv"
							className="hidden"
							onChange={(event) => onFile(event.target.files?.[0])}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label className="text-muted-foreground text-xs">
							<Trans>CSV data</Trans>
						</Label>
						<Textarea
							value={text}
							rows={8}
							placeholder="Company,Role,Stage,…"
							className="font-mono text-xs"
							onChange={(event) => setText(event.target.value)}
						/>
					</div>

					{parsed && (
						<div className="rounded-lg border border-border p-3 text-sm">
							<div className="flex items-center gap-2 font-medium">
								<CheckCircleIcon className="text-emerald-500" />
								<Trans>{importable.length} ready to import</Trans>
								{parsed.skipped > 0 && (
									<span className="text-muted-foreground text-xs">
										· <Trans>{parsed.skipped} skipped (missing company/role)</Trans>
									</span>
								)}
							</div>
							{overflow > 0 && (
								<p className="mt-1.5 text-amber-600 text-xs dark:text-amber-500">
									<Trans>
										Only the first {MAX_IMPORT} rows import at once — {overflow} left out. Split the file to import the
										rest.
									</Trans>
								</p>
							)}
							{parsed.recognized.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1">
									{parsed.recognized.map((field) => (
										<Badge key={field} variant="secondary" className="text-[10px]">
											{field}
										</Badge>
									))}
								</div>
							)}
							{parsed.rows.length > 0 && (
								<ul className="mt-2 space-y-0.5 text-muted-foreground text-xs">
									{parsed.rows.slice(0, 4).map((row, i) => (
										<li key={`${row.company}-${i}`} className="truncate">
											{row.role} · {row.company}
										</li>
									))}
									{parsed.rows.length > 4 && <li>+{parsed.rows.length - 4} more…</li>}
								</ul>
							)}
						</div>
					)}
				</div>

				<SheetFooter className="flex-row justify-end gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button
						disabled={importable.length === 0 || importMutation.isPending}
						onClick={() => importable.length > 0 && importMutation.mutate({ items: importable })}
					>
						<Trans>Import {importable.length}</Trans>
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
