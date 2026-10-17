import type { CheckIssue } from "./issues";
import { useLingui } from "@lingui/react/macro";
import { useNetworkState } from "expo-network";
import { router } from "expo-router";
import { useDeferredValue, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeOut, LinearTransition, ReduceMotion } from "react-native-reanimated";
import { ATS_CATEGORIES } from "@reactive-resume/resume/ats";
import { editWithUndo, fixIssue } from "./actions";
import { getCategoryDescription, getCategoryName } from "./issues";
import { JobMatch } from "./job-match";
import { checkStateOf, computeCheck } from "./model";
import { CheckPage } from "./page";
import { Score } from "./score";
import { Writing } from "./writing";
import { useSession } from "@/auth/session";
import { useResumeStore } from "@/draft";
import { routes } from "@/routes";
import { Banner, Button, Card, EmptyState, ListRow, Segmented, Skeleton, Text, useTheme } from "@/ui";

type CheckScreenProps = { id: string };
export function CheckScreen({ id }: CheckScreenProps) {
	const { t } = useLingui();
	const { colors, space, motion } = useTheme();
	// Subscribe only. Builder layout owns open/close, save/conflict state and undo history.
	const draft = useResumeStore();
	const session = useSession();
	const network = useNetworkState();
	const data = useDeferredValue(draft.document?.id === id ? draft.data : null);
	const [refreshVersion, setRefreshVersion] = useState(0);
	const check = data ? computeCheck(data) : null;
	const [tab, setTab] = useState<"issues" | "match" | "writing">("issues");
	const [selected, setSelected] = useState<string | null>(null);
	const [showPage, setShowPage] = useState(false);
	const [highlightTerm, setHighlightTerm] = useState<string | null>(null);
	const [initialLens, setInitialLens] = useState<"person" | "parser">("person");
	const [category, setCategory] = useState<string | null>(null);
	const offline = draft.status === "offline" || network.isConnected === false || network.isInternetReachable === false;
	if (session.status !== "signed-in" || !data || !check || draft.document?.id !== id)
		return (
			<View style={{ padding: space.s4, gap: space.s3 }}>
				{session.status === "loading" || (session.status === "signed-in" && draft.status !== "error") ? (
					<Skeleton height={space.s12} />
				) : (
					<EmptyState
						title={t`Couldn't open this resume`}
						message={
							session.status === "signed-in"
								? t`Return to Documents and reopen it, or retry the connection.`
								: t`Sign in again to continue checking this resume.`
						}
						action={{
							label: session.status === "signed-in" ? t`Retry` : t`Sign in again`,
							onPress: () => {
								if (session.status === "signed-in") void draft.open(id).catch(() => {});
								else router.push(routes.signIn());
							},
						}}
					/>
				)}
			</View>
		);
	const onPage = (issue: CheckIssue) => {
		setSelected(issue.key);
		setHighlightTerm(null);
		setInitialLens("person");
		setShowPage(true);
	};
	return (
		<ScrollView
			contentContainerStyle={{ padding: space.s4, gap: space.s4 }}
			style={{ flex: 1, backgroundColor: colors.bg }}
			keyboardShouldPersistTaps="handled"
			refreshControl={
				<RefreshControl
					refreshing={false}
					onRefresh={() => {
						setRefreshVersion((value) => value + 1);
					}}
					tintColor={colors.accent}
				/>
			}
		>
			{offline && (
				<Banner
					tone="info"
					message={t`You're offline. Issues and Job match still work; reconnect for Writing and PDF checks.`}
				/>
			)}
			{draft.locked && (
				<Banner tone="warn" message={t`This resume is locked. Checks are available; editing is disabled.`} />
			)}
			<Score report={check.report} />
			<Segmented
				label={t`Check views`}
				value={tab}
				options={[
					{ value: "issues", label: t`Issues` },
					{ value: "match", label: t`Job match` },
					{ value: "writing", label: t`Writing` },
				]}
				onChange={(tab) => {
					setTab(tab);
					setShowPage(false);
				}}
			/>
			{showPage ? (
				<>
					<Button variant="ghost" label={t`Back to checks`} onPress={() => setShowPage(false)} />
					<CheckPage
						id={id}
						data={data}
						issues={check.issues}
						selected={selected}
						onSelect={(key) => {
							setSelected(key);
							setHighlightTerm(null);
						}}
						locked={draft.locked}
						highlightTerm={highlightTerm}
						initialLens={initialLens}
						refreshVersion={refreshVersion}
						offline={offline}
					/>
				</>
			) : tab === "issues" ? (
				<>
					{check.issues.length === 0 && (
						<EmptyState icon="check-circle" title={t`Nothing to fix`} message={t`Every check passes.`} />
					)}
					{check.issues.map((issue) => (
						<Animated.View
							key={issue.key}
							exiting={FadeOut.duration(motion.d2).reduceMotion(ReduceMotion.System)}
							layout={LinearTransition.duration(motion.d2).reduceMotion(ReduceMotion.System)}
						>
							<Card style={{ gap: space.s2 }}>
								<Text variant="caption" color="ink3">
									{issue.number} · {getCategoryName(issue.category)}
								</Text>
								<Text variant="title">{issue.title}</Text>
								<Text color="ink2">{issue.body}</Text>
								<Button label={issue.fix.label} disabled={draft.locked} onPress={() => fixIssue(id, issue)} />
								<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
									<Button variant="ghost" label={t`Show on page`} onPress={() => onPage(issue)} />
									<Button
										variant="ghost"
										label={issue.keepLabel ? t`Keep` : t`Ignore`}
										disabled={draft.locked}
										onPress={() =>
											editWithUndo(
												id,
												(draft) => {
													const state = checkStateOf(draft);
													if (!state.ignored.includes(issue.key)) state.ignored.push(issue.key);
												},
												issue.keepLabel ? t`Kept as it is` : t`Issue ignored`,
											)
										}
									/>
								</View>
							</Card>
						</Animated.View>
					))}
					{ATS_CATEGORIES.map((entry) => {
						const score = check.report.categories[entry];
						return (
							<View key={entry}>
								<ListRow
									title={getCategoryName(entry)}
									subtitle={category === entry ? getCategoryDescription(entry) : undefined}
									trailing={
										<Text color={score.passed === score.total ? "accentText" : "warnText"}>
											{score.passed}/{score.total}
										</Text>
									}
									onPress={() => setCategory(category === entry ? null : entry)}
								/>
							</View>
						);
					})}
					<Text
						variant="callout"
						color="ink3"
					>{t`The score counts how reliably software reads your resume. It doesn't predict whether you'll be shortlisted.`}</Text>
					{check.report.ignored.length > 0 && (
						<Button
							variant="ghost"
							label={t`Show ${check.report.ignored.length} ignored issues again`}
							disabled={draft.locked}
							onPress={() =>
								editWithUndo(
									id,
									(draft) => {
										checkStateOf(draft).ignored = [];
									},
									t`Ignored issues are back`,
								)
							}
						/>
					)}
					<Button
						variant="secondary"
						label={t`Also check the exported PDF`}
						onPress={() => {
							setSelected(null);
							setHighlightTerm(null);
							setInitialLens("parser");
							setShowPage(true);
						}}
					/>
				</>
			) : tab === "match" ? (
				<JobMatch
					id={id}
					data={data}
					applicationId={draft.document.applicationId ?? null}
					locked={draft.locked}
					offline={offline}
					onTerm={(term) => {
						setSelected(null);
						setHighlightTerm(term);
						setInitialLens("person");
						setShowPage(true);
					}}
				/>
			) : (
				<Writing id={id} data={data} issues={check.issues} offline={offline} />
			)}
		</ScrollView>
	);
}
