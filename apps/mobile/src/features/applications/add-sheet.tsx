import type { RouterOutput } from "@/api/client";
import { useLingui } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { parseDateOnly } from "./csv";
import { applicationError } from "./error";
import { useApplicationMutations } from "./queries";
import { getStageLabel } from "./stages";
import { client, orpc } from "@/api/client";
import { getServer, useSession } from "@/auth/session";
import { AIProviderSetupSheet, useHasAIProvider } from "@/features/ai/providers";
import { routes } from "@/routes";
import {
	Banner,
	Button,
	ChipInput,
	ListRow,
	Segmented,
	SelectSheet,
	Sheet,
	Text,
	TextArea,
	TextField,
	useTheme,
} from "@/ui";

type ParsedPosting = RouterOutput["applications"]["ai"]["parsePosting"];
type AddApplicationSheetProps = { onClose: () => void };
const isLink = (value: string) => {
	try {
		const url = new URL(value.trim());
		return ["http:", "https:"].includes(url.protocol) && !!url.hostname;
	} catch {
		return false;
	}
};
const today = () => {
	const date = new Date();
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/** Mounted only while open: cancel reads and discard transient input when dismissed. */
export function AddApplicationSheet({ onClose }: AddApplicationSheetProps) {
	const router = useRouter();
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const providers = useHasAIProvider();
	const documentsOptions = orpc.documents.list.queryOptions({ input: { trashed: false } });
	const documents = useQuery({ ...documentsOptions, queryKey: [...documentsOptions.queryKey, session.server] });
	const webOptions = orpc.webAccess.status.queryOptions();
	const web = useQuery({ ...webOptions, queryKey: [...webOptions.queryKey, session.server] });
	const { create } = useApplicationMutations();
	const [mode, setMode] = useState<"link" | "text">("link");
	const [input, setInput] = useState("");
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<RouterOutput["applications"]["ai"]["searchPostings"] | null>(null);
	const [parsed, setParsed] = useState<ParsedPosting | null>(null);
	const [company, setCompany] = useState("");
	const [role, setRole] = useState("");
	const [location, setLocation] = useState("");
	const [salary, setSalary] = useState("");
	const [source, setSource] = useState("");
	const [sourceUrl, setSourceUrl] = useState("");
	const [description, setDescription] = useState("");
	const [stage, setStage] = useState<"saved" | "applied" | "interview">("saved");
	const [stageDate, setStageDate] = useState(today);
	const [resumeId, setResumeId] = useState("");
	const [letterId, setLetterId] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [followUpDate, setFollowUpDate] = useState("");
	const [followUpNote, setFollowUpNote] = useState("");
	const [notes, setNotes] = useState("");
	const [setup, setSetup] = useState(false);
	const [review, setReview] = useState(false);
	const [busy, setBusy] = useState<"read" | "fill" | "search" | "save" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const lock = useRef(false);
	const active = useRef(true);
	const controller = useRef<AbortController | null>(null);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
			controller.current?.abort();
		};
	}, []);

	const run = async (action: NonNullable<typeof busy>, work: (signal: AbortSignal) => Promise<void>) => {
		if (lock.current) return;
		lock.current = true;
		setBusy(action);
		setError(null);
		const request = new AbortController();
		controller.current = request;
		try {
			await work(request.signal);
		} catch (cause) {
			if (active.current && !request.signal.aborted && getServer() === session.server) {
				if (action === "read" && mode === "link" && cause instanceof ORPCError && cause.code === "POSTING_UNREADABLE") {
					setSourceUrl(input.trim());
					setMode("text");
					setInput("");
					setDescription("");
					setParsed(null);
				}
				setError(
					action === "save"
						? t`Could not confirm the save. Check Applications before retrying to avoid a duplicate.`
						: applicationError(cause),
				);
			}
		} finally {
			lock.current = false;
			if (active.current) setBusy(null);
		}
	};
	const current = (signal: AbortSignal) => active.current && !signal.aborted && getServer() === session.server;
	const read = () =>
		void run("read", async (signal) => {
			const result = await client.applications.ai.parsePosting({ input: input.trim() }, { signal });
			if (!current(signal)) return;
			setParsed(result);
			setCompany((value) => value || result.company);
			setRole((value) => value || result.role);
			setLocation((value) => value || result.location);
			setSalary((value) => value || result.salary);
			setSourceUrl(result.sourceUrl ?? (mode === "link" ? input.trim() : sourceUrl));
			setDescription(result.jobDescription);
			setReview(true);
		});
	const fill = () =>
		void run("fill", async (signal) => {
			const result = await client.applications.ai.autofill({ jobDescription: description.trim() }, { signal });
			if (!current(signal)) return;
			setCompany((value) => value || result.company);
			setRole((value) => value || result.role);
			setLocation((value) => value || result.location);
			setSalary((value) => value || result.salary);
		});
	const search = () =>
		void run("search", async (signal) => {
			setResults(null);
			const result = await client.applications.ai.searchPostings({ query: query.trim() }, { signal });
			if (current(signal)) setResults(result);
		});
	const changeInput = (value: string) => {
		setInput(value);
		setParsed(null);
		setError(null);
		setDescription(mode === "text" ? value : "");
	};
	const validDate = stage === "saved" || !!parseDateOnly(stageDate);
	const validFollowUp = !followUpDate || !!parseDateOnly(followUpDate);
	const validUrl = !sourceUrl.trim() || isLink(sourceUrl);
	const ready = company.trim() && role.trim() && validDate && validFollowUp && validUrl && !busy;
	const save = () =>
		void run("save", async (signal) => {
			if (!ready) return;
			const text = description.slice(0, 20_000);
			const clipped = description.length > 20_000;
			const id = await create.mutateAsync({
				company: company.trim(),
				role: role.trim(),
				status: stage,
				location: location.trim() || null,
				salary: salary.trim() || null,
				source: source.trim() || null,
				sourceUrl: sourceUrl.trim() || null,
				jobDescription: text || null,
				requirements: parsed?.requirements ?? [],
				postingSource:
					(parsed
						? { ...parsed.postingSource, ...(clipped ? { truncated: true, completeness: "incomplete" as const } : {}) }
						: null) ??
					(text
						? { method: "paste", format: "text", truncated: clipped, completeness: clipped ? "incomplete" : "unknown" }
						: null),
				...(stage !== "saved" ? { stageEnteredAt: stageDate } : {}),
				resumeId: resumeId || null,
				coverLetterId: stage !== "saved" ? letterId || null : null,
				tags,
				notes: notes || null,
				followUpAt: followUpDate ? new Date(`${followUpDate}T12:00:00`) : null,
				followUpNote: followUpNote.trim() || null,
			});
			if (!current(signal)) return;
			onClose();
			router.push(routes.applicationDetails(id));
		});
	const docs = documents.data ?? [];
	return (
		<>
			<Sheet open onClose={onClose} title={review ? t`Review job details` : t`Save a job`} detents={[0.9]}>
				<View style={{ padding: space.s4, gap: space.s4 }}>
					{error && <Banner tone="danger" message={error} />}
					{busy === "save" && (
						<Banner tone="info" message={t`Saving the job. Closing this sheet does not cancel the save.`} />
					)}
					{!review ? (
						<>
							<Text color="ink2">{t`Paste a job link or posting, then check the role and company. Nothing is saved until you choose Save job.`}</Text>
							<Segmented
								value={mode}
								options={[
									{ value: "link", label: t`Link` },
									{ value: "text", label: t`Text` },
								]}
								onChange={(value) => {
									if (lock.current) return;
									setMode(value);
									setInput("");
									setParsed(null);
									setDescription("");
								}}
							/>
							{mode === "link" ? (
								<TextField
									label={t`Job posting link`}
									value={input}
									onChangeText={changeInput}
									editable={!busy}
									autoCapitalize="none"
									keyboardType="url"
									maxLength={5000}
								/>
							) : (
								<TextArea
									label={t`Pasted description`}
									value={input}
									onChangeText={changeInput}
									editable={!busy}
									maxLength={100_000}
								/>
							)}
							{mode === "text" && !providers.hasAIProvider && (
								<>
									<Banner
										tone="info"
										message={
											providers.error
												? t`AI providers could not be loaded. Retry or fill the details manually.`
												: t`Connect an AI provider to read details from pasted text. Manual entry works without AI.`
										}
									/>
									{providers.error ? (
										<Button label={t`Retry provider lookup`} onPress={providers.retry} />
									) : (
										<Button
											label={t`Connect AI provider`}
											variant="secondary"
											disabled={providers.isLoading}
											onPress={() => setSetup(true)}
										/>
									)}
								</>
							)}
							<Text
								variant="callout"
								color="ink3"
							>{t`AI reads pasted text only when you ask. Links can use the page’s own job data without AI.`}</Text>
							<Button
								label={t`Read posting`}
								loading={busy === "read"}
								disabled={!!busy || !input.trim() || (mode === "link" ? !isLink(input) : !providers.hasAIProvider)}
								onPress={read}
							/>
							<Button
								label={t`Fill details manually`}
								variant="secondary"
								disabled={!!busy}
								onPress={() => {
									if (mode === "link" && isLink(input)) setSourceUrl(input.trim());
									setReview(true);
								}}
							/>
							<Text variant="title">{t`Search job postings`}</Text>
							<TextField
								label={t`Role, company or location`}
								value={query}
								maxLength={500}
								editable={!busy}
								onChangeText={(value) => {
									setQuery(value);
									setResults(null);
								}}
							/>
							<Text color="ink2">{t`Uses the web search service set up in Settings. Search results wait for your review.`}</Text>
							{!web.data?.search && (
								<Button
									label={t`Set up web search`}
									variant="link"
									onPress={() => {
										onClose();
										router.push("/settings/ai-web-access");
									}}
								/>
							)}
							<Button
								label={t`Search`}
								loading={busy === "search"}
								disabled={!!busy || query.trim().length < 2 || !web.data?.search}
								onPress={search}
							/>
							{results?.length === 0 && <Text>{t`No postings found. Try different keywords.`}</Text>}
							{results?.map((result) => (
								<ListRow
									key={result.url}
									title={result.title}
									subtitle={`${result.description}\n${result.url}`}
									disabled={!!busy}
									accessibilityHint={t`Use posting link; review before saving`}
									onPress={() => {
										setMode("link");
										setInput(result.url);
										setSourceUrl(result.url);
										setParsed(null);
										setDescription("");
										setResults(null);
									}}
								/>
							))}
						</>
					) : (
						<>
							{parsed && (
								<Banner
									tone={parsed.enrichmentWarning || parsed.filledBy === "none" ? "warn" : "info"}
									message={
										parsed.enrichmentWarning
											? t`AI enrichment was unavailable. Review the page details or fill them manually.`
											: t`Review the details before saving. Retrieved content does not establish that the posting is still open.`
									}
								/>
							)}
							<TextField label={t`Company`} value={company} onChangeText={setCompany} editable={!busy} />
							<TextField label={t`Role / title`} value={role} onChangeText={setRole} editable={!busy} />
							<TextField label={t`Location`} value={location} onChangeText={setLocation} editable={!busy} />
							<TextField label={t`Salary range`} value={salary} onChangeText={setSalary} editable={!busy} />
							<TextField label={t`Source`} value={source} onChangeText={setSource} editable={!busy} />
							<TextField
								label={t`Job posting link`}
								value={sourceUrl}
								onChangeText={setSourceUrl}
								editable={!busy}
								autoCapitalize="none"
								keyboardType="url"
								error={!validUrl ? t`Use an http or https link.` : undefined}
							/>
							<SelectSheet
								label={t`Stage`}
								value={stage}
								options={["saved", "applied", "interview"].map((value) => ({
									value: value as typeof stage,
									label: getStageLabel(value as typeof stage),
								}))}
								onChange={setStage}
								disabled={!!busy}
							/>
							{stage !== "saved" && (
								<TextField
									label={t`Application date`}
									helper={t`YYYY-MM-DD`}
									value={stageDate}
									onChangeText={setStageDate}
									editable={!busy}
									error={!validDate ? t`Enter a valid date.` : undefined}
								/>
							)}
							{documents.isError && (
								<Button label={t`Retry loading documents`} onPress={() => void documents.refetch()} />
							)}
							<SelectSheet
								label={t`Resume`}
								value={resumeId}
								options={[
									{ value: "", label: t`None` },
									...docs.filter((doc) => doc.type === "resume").map((doc) => ({ value: doc.id, label: doc.name })),
								]}
								onChange={setResumeId}
								disabled={!!busy}
							/>
							{stage !== "saved" && (
								<SelectSheet
									label={t`Cover letter submitted (optional)`}
									value={letterId}
									options={[
										{ value: "", label: t`None` },
										...docs.filter((doc) => doc.type === "letter").map((doc) => ({ value: doc.id, label: doc.name })),
									]}
									onChange={setLetterId}
									disabled={!!busy}
								/>
							)}
							<ChipInput
								label={t`Tags`}
								values={tags}
								onChange={(values) => {
									if (!lock.current) setTags(values);
								}}
							/>
							<TextField
								label={t`Follow-up date`}
								helper={t`YYYY-MM-DD (optional)`}
								value={followUpDate}
								onChangeText={setFollowUpDate}
								editable={!busy}
								error={!validFollowUp ? t`Enter a valid date.` : undefined}
							/>
							<TextField
								label={t`Follow-up note`}
								value={followUpNote}
								onChangeText={setFollowUpNote}
								editable={!busy}
							/>
							<TextArea label={t`Notes`} value={notes} onChangeText={setNotes} editable={!busy} />
							<TextArea
								label={t`Saved description`}
								value={description}
								onChangeText={setDescription}
								editable={!busy}
							/>
							{(parsed?.postingSource.truncated || description.length > 20_000) && (
								<Banner
									tone="warn"
									message={t`Description is clipped to 20,000 characters. Review it before preparing.`}
								/>
							)}
							{parsed?.requirements.length ? <Text color="ink2">{parsed.requirements.join(" · ")}</Text> : null}
							<Button
								label={t`Fill empty fields with AI`}
								variant="secondary"
								disabled={!!busy || !description.trim() || description.length > 20_000 || !providers.hasAIProvider}
								loading={busy === "fill"}
								onPress={fill}
							/>
							{!providers.hasAIProvider && (
								<Button label={t`Connect AI provider`} variant="link" onPress={() => setSetup(true)} />
							)}
							<Button label={t`Save job`} fullWidth loading={busy === "save"} disabled={!ready} onPress={save} />
							<Button label={t`Back to posting`} variant="ghost" disabled={!!busy} onPress={() => setReview(false)} />
						</>
					)}
					{busy === "read" || busy === "search" || busy === "fill" ? (
						<Button label={t`Cancel request`} variant="ghost" onPress={() => controller.current?.abort()} />
					) : null}
					<Button label={t`Cancel`} variant="ghost" disabled={busy === "save"} onPress={onClose} />
				</View>
			</Sheet>
			<AIProviderSetupSheet open={setup} onClose={() => setSetup(false)} />
		</>
	);
}
