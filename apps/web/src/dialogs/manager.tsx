import { Dialog } from "@reactive-resume/ui/components/dialog";
import { Sheet } from "@reactive-resume/ui/components/sheet";
import { renderDialog } from "./renderers";
import { useDialogStore } from "./store";

export function DialogManager() {
	const { open, activeDialog, onOpenChange } = useDialogStore();

	const DialogContent = renderDialog(activeDialog);

	// Item-section editors render as a right-side sheet so the artboard stays visible while editing.
	const Root = activeDialog?.type.startsWith("resume.sections.") ? Sheet : Dialog;

	return (
		<Root open={open} onOpenChange={onOpenChange}>
			{DialogContent}
		</Root>
	);
}
