import { t } from "@lingui/core/macro";
import { useCallback } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { useDialogStore } from "@/dialogs/store";

interface UseFormBlockerOptions {
	shouldBlock: () => boolean;
}

export function useFormBlocker({ shouldBlock }: UseFormBlockerOptions) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const confirm = useConfirm();

	const requestClose = useCallback(async () => {
		if (!shouldBlock()) {
			closeDialog();
			return;
		}

		const confirmed = await confirm(t`Are you sure you want to close this dialog?`, {
			description: t`You have unsaved changes that will be lost.`,
			confirmText: t`Leave`,
			cancelText: t`Stay`,
		});

		if (confirmed) closeDialog();
	}, [shouldBlock, closeDialog, confirm]);

	const blockEvents = {
		onEscapeKeyDown: (event: KeyboardEvent) => {
			if (shouldBlock()) {
				event.preventDefault();
				requestClose();
			}
		},
		onInteractOutside: (event: Event) => {
			if (shouldBlock()) {
				event.preventDefault();
				requestClose();
			}
		},
	};

	return { requestClose, blockEvents };
}
