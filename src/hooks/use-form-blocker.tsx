import { t } from "@lingui/core/macro";
import { useCallback } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";

interface UseFormBlockerOptions {
	shouldBlock?: () => boolean;
}

export function useFormBlocker<T extends FieldValues>(form: UseFormReturn<T>, options?: UseFormBlockerOptions) {
	const confirm = useConfirm();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	// Subscribe to formState changes by reading during render (react-hook-form requirement)
	const { isDirty, isSubmitting } = form.formState;

	const shouldBlock = useCallback(() => {
		// Use custom shouldBlock if provided, otherwise use default form state check
		if (options?.shouldBlock) return options.shouldBlock();
		return isDirty && !isSubmitting;
	}, [options, isDirty, isSubmitting]);

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
		onPointerDownOutside: (event: Event) => {
			if (shouldBlock()) {
				event.preventDefault();
				requestClose();
			}
		},
		onInteractOutside: (event: Event) => {
			if (shouldBlock()) {
				event.preventDefault();
			}
		},
	};

	return { requestClose, blockEvents };
}
