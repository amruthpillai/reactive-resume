import { WarningIcon } from "@phosphor-icons/react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@reactive-resume/ui/components/alert-dialog";

// Overlay — rendered open (defaultOpen). cfg.overrides.AlertDialog pins
// cardMode: single + viewport (content is fixed-positioned, centred).
export const Open = () => (
	<AlertDialog defaultOpen>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogMedia>
					<WarningIcon />
				</AlertDialogMedia>
				<AlertDialogTitle>Delete this resume?</AlertDialogTitle>
				<AlertDialogDescription>
					“Software Engineer” and its entire version history will be permanently removed. This action can’t be undone.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel>Cancel</AlertDialogCancel>
				<AlertDialogAction variant="destructive">Delete resume</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
);
