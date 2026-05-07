import { t } from "@lingui/core/macro";
import { useStore } from "@tanstack/react-form";
import { useCallback, useEffect } from "react";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";

interface UseFormBlockerOptions {
	shouldBlock?: () => boolean;
}

type BlockableFormStore = {
	get: () => {
		isDirty: boolean;
		isSubmitting: boolean;
	};
	subscribe: {
		(observer: {
			next?: (value: { isDirty: boolean; isSubmitting: boolean }) => void;
			error?: (error: unknown) => void;
			complete?: () => void;
		}): { unsubscribe: () => void };
		(
			next: (value: { isDirty: boolean; isSubmitting: boolean }) => void,
			error?: (error: unknown) => void,
			complete?: () => void,
		): { unsubscribe: () => void };
	};
};

export function useFormBlocker<TStore extends BlockableFormStore>(
	form: { store: TStore },
	options?: UseFormBlockerOptions,
) {
	const confirm = useConfirm();
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const setOnBeforeClose = useDialogStore((state) => state.setOnBeforeClose);

	const isDirty = useStore(form.store, (state) => state.isDirty);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	const shouldBlock = useCallback(() => {
		if (options?.shouldBlock) return options.shouldBlock();
		return isDirty && !isSubmitting;
	}, [options, isDirty, isSubmitting]);

	const confirmClose = useCallback(async () => {
		if (!shouldBlock()) return true;

		return confirm(t`Are you sure you want to close this dialog?`, {
			description: t`You have unsaved changes that will be lost.`,
			confirmText: t`Leave`,
			cancelText: t`Stay`,
		});
	}, [shouldBlock, confirm]);

	const requestClose = useCallback(async () => {
		const confirmed = await confirmClose();
		if (!confirmed) return;

		closeDialog();
	}, [confirmClose, closeDialog]);

	useEffect(() => {
		setOnBeforeClose(confirmClose);
		return () => setOnBeforeClose(null);
	}, [confirmClose, setOnBeforeClose]);

	return { requestClose };
}
