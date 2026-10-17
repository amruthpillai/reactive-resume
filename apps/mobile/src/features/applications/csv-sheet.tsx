import type { CsvField } from "./csv";
import type { Application } from "./types";
import { useLingui } from "@lingui/react/macro";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
	autoMapHeaders,
	CSV_FIELDS,
	exportApplicationsCsv,
	mapCsvToApplications,
	parseCsv,
	parseDateOnly,
	rowsToCsv,
	selectApplicationsForExport,
} from "./csv";
import { applicationError } from "./error";
import { useApplicationMutations } from "./queries";
import { Banner, Button, Segmented, SelectSheet, Sheet, Text, TextArea, TextField, useTheme } from "@/ui";

/** Recipients can read after shareAsync resolves; sweep task-owned files on the next export. */
async function shareCsv(text: string, name: string) {
	for (const file of Paths.cache.list()) {
		if (file instanceof File && /^applications(?:-skipped)?-\d+\.csv$/.test(file.name)) file.delete();
	}
	if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
	const file = new File(Paths.cache, `${name}-${Date.now()}.csv`);
	await file.write(text);
	await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
}

type ApplicationsCsvSheetProps = { applications: Application[]; filtered: Application[]; onClose: () => void };

export function ApplicationsCsvSheet({ applications, filtered, onClose }: ApplicationsCsvSheetProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const { importCsv } = useApplicationMutations();
	const [mode, setMode] = useState<"import" | "export">("import");
	const [text, setText] = useState("");
	const [table, setTable] = useState<string[][] | null>(null);
	const [mapping, setMapping] = useState<(CsvField | null)[]>([]);
	const [scope, setScope] = useState<"all" | "filtered">("filtered");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [imported, setImported] = useState<number | null>(null);
	const active = useRef(true);
	const locked = useRef(false);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	const run = async (work: () => Promise<void>) => {
		if (locked.current) return;
		locked.current = true;
		setBusy(true);
		setError(null);
		try {
			await work();
		} catch (cause) {
			if (active.current) setError(applicationError(cause));
		} finally {
			locked.current = false;
			if (active.current) setBusy(false);
		}
	};
	const review = (value: string) => {
		setError(null);
		setTable(null);
		try {
			const parsed = parseCsv(value);
			if (parsed.length < 2) {
				setError(t`Include a header and at least one application row.`);
				return;
			}
			setTable(parsed);
			setMapping(autoMapHeaders(parsed[0] ?? []));
			setImported(null);
		} catch {
			setError(t`CSV has an unclosed quoted field. Fix it before importing.`);
		}
	};
	const pick = () =>
		void run(async () => {
			const result = await DocumentPicker.getDocumentAsync({
				type: ["text/csv", "text/comma-separated-values", "text/plain", "application/csv", "application/vnd.ms-excel"],
				copyToCacheDirectory: true,
			});
			if (result.canceled) return;
			const asset = result.assets[0];
			if (!asset) return;
			const file = new File(asset.uri);
			try {
				if (file.size > 10 * 1024 * 1024) {
					if (active.current) setError(t`CSV is larger than 10 MB. Split it before importing.`);
					return;
				}
				const value = await file.text();
				if (active.current) {
					setText(value);
					review(value);
				}
			} finally {
				if (file.exists) file.delete();
			}
		});
	const fieldLabels: Record<CsvField, string> = {
		company: t`Company`,
		role: t`Role`,
		status: t`Stage`,
		stageEnteredAt: t`Application date`,
		location: t`Location`,
		salary: t`Salary`,
		source: t`Source`,
		sourceUrl: t`Link`,
		jobDescription: t`Job description`,
		postingSource: t`Posting source`,
		notes: t`Notes`,
		tags: t`Tags`,
		contactName: t`Contact name`,
		contactRole: t`Contact role`,
		contactType: t`Contact label`,
		contactEmail: t`Contact email`,
		contactPhone: t`Contact phone`,
		archived: t`Archived (closes it)`,
		contacts: t`Contacts`,
	};
	const mapped = table ? mapCsvToApplications(table, mapping) : null;
	const duplicate = mapping.filter(Boolean).length !== new Set(mapping.filter(Boolean)).size;
	const validMapping = mapping.includes("company") && mapping.includes("role") && !duplicate;
	const importable = mapped?.rows.slice(0, 500) ?? [];
	const overflow = (mapped?.rows.length ?? 0) - importable.length;
	const validRows = importable.length > 0 && !mapped?.invalidValues.length;
	const validRange = (!from || !!parseDateOnly(from)) && (!to || !!parseDateOnly(to)) && (!from || !to || from <= to);
	const selected = validRange ? selectApplicationsForExport(applications, filtered, { scope, from, to }) : [];
	const invalidRows =
		table?.slice(1).filter((_, index) => mapped?.invalidValues.some((value) => value.row === index + 2)) ?? [];
	return (
		<Sheet open onClose={onClose} title={t`Import or export CSV`} detents={[0.9]}>
			<View style={{ padding: space.s4, gap: space.s4 }}>
				<Segmented
					value={mode}
					options={[
						{ value: "import", label: t`Import` },
						{ value: "export", label: t`Export` },
					]}
					onChange={(value) => {
						if (!locked.current) setMode(value);
					}}
				/>
				{error && <Banner tone="danger" message={error} />}
				{busy && (
					<Banner tone="info" message={t`Working. Closing this sheet does not cancel an import already sent.`} />
				)}
				{mode === "import" ? (
					<>
						{imported !== null ? (
							<>
								<Text variant="heading">{t`Import complete`}</Text>
								<Text>{t`Imported ${imported} applications. ${overflow} rows left out because only the first 500 import at once.`}</Text>
								<Button label={t`Open Applications`} onPress={onClose} />
							</>
						) : (
							<>
								<Button label={t`Upload .csv`} variant="secondary" loading={busy} onPress={pick} />
								<TextArea
									label={t`CSV data`}
									value={text}
									onChangeText={(value) => {
										setText(value);
										setTable(null);
									}}
									editable={!busy}
								/>
								<Button label={t`Review columns`} disabled={busy || !text.trim()} onPress={() => review(text)} />
								{mapped && (
									<>
										<Text variant="title">{t`Match columns`}</Text>
										<Text>{t`Company and Role are required. Match each field once or leave it out. Descriptions are limited to 20,000 characters.`}</Text>
										{mapped.headers.map((header, index) => (
											<SelectSheet
												key={index}
												label={t`Column ${index + 1}: ${header}`}
												value={mapping[index] ?? "omit"}
												options={[
													{ value: "omit", label: t`Leave out` },
													...CSV_FIELDS.map((field) => ({ value: field, label: fieldLabels[field] })),
												]}
												disabled={busy}
												onChange={(value) =>
													setMapping((values) =>
														values.map((field, column) =>
															column === index ? (value === "omit" ? null : value) : field,
														),
													)
												}
											/>
										))}
										{!validMapping && (
											<Banner
												tone="warn"
												message={t`Map Company and Role exactly once. Remove duplicate field matches.`}
											/>
										)}
										<Text>{t`${importable.length} rows ready. ${mapped.skipped} rows missing Company or Role will be skipped. ${mapped.contactsSkipped} invalid contacts will be left out.`}</Text>
										{mapped.contactsSkipped > 0 && (
											<Banner
												tone="warn"
												message={t`Contacts with an invalid email or no name are left out; their applications still import.`}
											/>
										)}
										{overflow > 0 && (
											<Banner
												tone="warn"
												message={t`Only the first 500 rows import at once, leaving out ${overflow}. Split the file to import the rest.`}
											/>
										)}
										{mapped.invalidValues.map((value, index) => (
											<Text
												key={index}
												color="dangerText"
											>{t`Row ${value.row}, ${fieldLabels[value.field]}: “${value.value}” is invalid. Fix the CSV or leave this column out.`}</Text>
										))}
										{mapped.rows.slice(0, 3).map((row, index) => (
											<Text key={index} color="ink2">{`${row.company} · ${row.role}`}</Text>
										))}
										<Button
											label={t`Import applications`}
											disabled={busy || !validMapping || !validRows}
											loading={busy}
											onPress={() =>
												void run(async () => {
													if (!validMapping || !validRows) return;
													try {
														const result = await importCsv.mutateAsync({ items: importable });
														if (active.current) setImported(result.imported);
													} catch {
														if (active.current)
															setError(
																t`Could not confirm the import. Check Applications before retrying to avoid duplicates.`,
															);
													}
												})
											}
										/>
									</>
								)}
							</>
						)}
						{mapped && (mapped.skippedRows.length > 0 || invalidRows.length > 0) && (
							<Button
								label={t`Share skipped or invalid rows`}
								variant="secondary"
								disabled={busy}
								onPress={() =>
									void run(() =>
										shareCsv(
											rowsToCsv(mapped.headers, [...mapped.skippedRows, ...invalidRows]),
											"applications-skipped",
										),
									)
								}
							/>
						)}
						{mapped && (
							<Button
								label={t`Back to CSV data`}
								variant="ghost"
								disabled={busy}
								onPress={() => {
									setTable(null);
									setImported(null);
								}}
							/>
						)}
					</>
				) : (
					<>
						<Text>{t`Export application details, contacts, notes and timeline history as CSV.`}</Text>
						<SelectSheet
							label={t`Applications to export`}
							value={scope}
							options={[
								{ value: "filtered", label: t`Current filters` },
								{ value: "all", label: t`All applications (including closed)` },
							]}
							onChange={setScope}
							disabled={busy}
						/>
						<TextField
							label={t`Application date from`}
							value={from}
							onChangeText={setFrom}
							helper={t`YYYY-MM-DD (optional)`}
							editable={!busy}
						/>
						<TextField
							label={t`Application date to`}
							value={to}
							onChangeText={setTo}
							helper={t`YYYY-MM-DD (optional)`}
							editable={!busy}
						/>
						{!validRange && <Banner tone="warn" message={t`Enter valid dates with start on or before end.`} />}
						<Text>{t`${selected.length} applications to export.`}</Text>
						<Button
							label={t`Share CSV`}
							loading={busy}
							disabled={busy || !selected.length || !validRange}
							onPress={() => void run(() => shareCsv(exportApplicationsCsv(selected), "applications"))}
						/>
					</>
				)}
				<Button label={t`Close`} variant="ghost" disabled={busy} onPress={onClose} />
			</View>
		</Sheet>
	);
}
