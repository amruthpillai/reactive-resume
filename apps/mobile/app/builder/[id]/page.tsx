import type { ResumeDraftStore } from "@/draft/types";
import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams } from "expo-router";
import { produce } from "immer";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumePage } from "@/preview/page";
import { Banner } from "@/ui";

export default function PageScreen() {
	const { t } = useLingui();
	const { id, parity } = useLocalSearchParams<{ id: string; parity?: string }>();
	// shortcut: M3-T3 is a parallel branch; coordinator replaces this sample binding with useResumeStore on merge.
	const [data, setData] = useState(sampleResumeData);
	const [history, setHistory] = useState(data);
	const [parityStatus, setParityStatus] = useState<string | null>(null);
	useEffect(() => {
		if (!__DEV__ || !parity) return;
		let active = true;
		void import("../../../scripts/parity/device")
			.then(({ runParity }) => runParity(parity))
			.then(() => {
				if (active) setParityStatus(t`Renderer parity passed`);
			})
			.catch(() => {
				if (active) setParityStatus(t`Renderer parity failed`);
			});
		return () => {
			active = false;
		};
	}, [parity, t]);
	const update: ResumeDraftStore["update"] = (recipe) => {
		setHistory(data);
		setData((value) => produce(value, recipe));
	};
	return (
		<View style={{ flex: 1 }}>
			<Stack.Screen options={{ title: t`Page`, headerTransparent: false }} />
			<Banner
				tone="info"
				message={parityStatus ?? (__DEV__ && parity ? t`Checking renderer parity…` : t`Sample resume preview`)}
			/>
			{!(__DEV__ && parity && parityStatus === null) ? (
				<ResumePage id={id} draft={{ data, update, locked: false, undo: () => setData(history) }} />
			) : null}
		</View>
	);
}
