import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
// Dev-only: proves @reactive-resume/forme-native loads on the device (M1-T1 acceptance). Renders a one-line
// document and subsets a downloaded font through the native module. Not shipped in release builds (`__DEV__`).
import { renderSerializedDocWithLayout, subsetFont } from "@reactive-resume/forme-native";
import { Button, Text } from "@/ui";

const tinyDocument = {
	children: [
		{
			kind: { type: "Page", config: { size: "A4", margin: { top: 36, right: 36, bottom: 36, left: 36 }, wrap: true } },
			style: {},
			children: [
				{ kind: { type: "Text", content: "Reactive Resume native check" }, style: { fontSize: 18 }, children: [] },
			],
		},
	],
	metadata: {},
	defaultPage: { size: "A4", margin: { top: 54, right: 54, bottom: 54, left: 54 }, wrap: true },
};

const fontUrl =
	"https://fonts.gstatic.com/s/hankengrotesk/v12/ieVq2YZDLWuGJpnzaiwFXS9tYvBRzyFLlZg_f_Ncs2Za4fpNzXhRKA.ttf";

async function runCheck() {
	const started = performance.now();
	const { pdf, layout, warnings } = await renderSerializedDocWithLayout(tinyDocument);
	const renderMs = Math.round(performance.now() - started);
	const font = new Uint8Array(await (await expoFetch(fontUrl)).arrayBuffer());
	const subset = await subsetFont(font, "Reactive Resume");
	const header = String.fromCharCode(...pdf.subarray(0, 5));
	return `render ${header} ${pdf.length} B, ${layout.pages.length} page(s), ${warnings.length} warning(s), ${renderMs} ms; subset ${font.length} → ${subset.length} B`;
}

export function FormeCheck() {
	const [result, setResult] = useState<string | null>(null);

	return (
		<>
			<Button
				variant="secondary"
				label="Forme engine check"
				onPress={() => {
					setResult("…");
					runCheck()
						.then((summary) => {
							console.info(`[forme-check] ${summary}`);
							setResult(summary);
						})
						.catch((error: unknown) => {
							const message = error instanceof Error ? error.message : String(error);
							console.warn(`[forme-check] failed: ${message}`);
							setResult(`failed: ${message}`);
						});
				}}
			/>
			{result ? (
				<Text variant="mono" color="ink2" testID="forme-check-result">
					{result}
				</Text>
			) : null}
		</>
	);
}
