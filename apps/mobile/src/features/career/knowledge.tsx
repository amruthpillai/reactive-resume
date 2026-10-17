import { useLingui } from "@lingui/react/macro";
import { Stack } from "expo-router";
import { useState } from "react";
import { Facts } from "./facts";
import { useCareerQueries } from "./hooks";
import { Preferences } from "./preferences";
import { LoadState } from "./shared";
import { Stories } from "./stories";
import { useSession } from "@/auth/session";
import { Screen, SelectSheet, Text } from "@/ui";

export function KnowledgeScreen() {
	const { t } = useLingui();
	const [tab, setTab] = useState("facts");
	const session = useSession();
	const { profile } = useCareerQueries();
	return (
		<Screen>
			<Stack.Screen options={{ title: t`Knowledge` }} />
			<Text color="ink3">{t`Your facts, stories and preferences. Editing Knowledge sends nothing to an AI connection.`}</Text>
			<SelectSheet
				label={t`Knowledge`}
				value={tab}
				onChange={setTab}
				options={[
					{ value: "facts", label: t`Facts` },
					{ value: "stories", label: t`Stories` },
					{ value: "preferences", label: t`Preferences` },
				]}
			/>
			{tab === "facts" ? (
				<Facts key={session.server} />
			) : tab === "stories" ? (
				<Stories key={session.server} />
			) : (
				<>
					<LoadState query={profile} />
					{profile.data ? <Preferences key={session.server} initial={profile.data} /> : null}
				</>
			)}
		</Screen>
	);
}
