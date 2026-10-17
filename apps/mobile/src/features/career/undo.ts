import { t } from "@lingui/core/macro";
import { AppState } from "react-native";
import { dismissToast, showToast, toastLifetime } from "@/ui";

type UndoOptions = { message: string; commit: () => Promise<unknown>; restore: () => void; failed: () => void };

/** Own timer because M1 Toast has no close callback. Backgrounding flushes before JS suspension. */
export function withUndo({ message, commit, restore, failed }: UndoOptions) {
	let settled = false;
	const finish = (apply: boolean) => {
		if (settled) return;
		settled = true;
		clearTimeout(timer);
		listener.remove();
		dismissToast(toast);
		if (apply)
			void Promise.resolve()
				.then(commit)
				.catch(() => {
					restore();
					failed();
				});
		else restore();
	};
	const timer = setTimeout(() => finish(true), toastLifetime(6000));
	const listener = AppState.addEventListener("change", (state) => {
		if (state === "background") finish(true);
	});
	const toast = showToast({ message, duration: 6000, action: { label: t`Undo`, onPress: () => finish(false) } });
	return { flush: () => finish(true), cancel: () => finish(false) };
}
