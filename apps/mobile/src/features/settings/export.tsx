import { useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { client } from "@/api/client";
import { ListRow, showToast } from "@/ui";

export function ExportDataRow() {
	const { t } = useLingui();
	const exportData = useMutation({
		mutationKey: ["settings", "export"],
		mutationFn: async () => {
			for (const file of Paths.cache.list()) {
				if (file instanceof File && /^reactive-resume-\d+\.json$/.test(file.name)) file.delete();
			}
			if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
			const data = await client.auth.exportData();
			const file = new File(Paths.cache, `reactive-resume-${Date.now()}.json`);
			await file.write(`${JSON.stringify(data, null, 2)}\n`);
			// Android recipients may still read this file after shareAsync resolves; sweep it on the next export.
			await Sharing.shareAsync(file.uri, {
				mimeType: "application/json",
				UTI: "public.json",
				dialogTitle: t`Export everything`,
			});
		},
		onError: () => showToast({ message: t`Couldn't export. Try again.` }),
	});
	return (
		<ListRow
			title={exportData.isPending ? t`Preparing export…` : t`Export everything`}
			subtitle={t`Your profile, documents, applications and Career data as JSON. Images and attachments remain references.`}
			leading="download-simple"
			disabled={exportData.isPending}
			onPress={() => exportData.mutate()}
		/>
	);
}
