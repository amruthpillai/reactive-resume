import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";

// Overlay component — rendered open (defaultOpen) so the card shows the real
// dialog surface. cfg.overrides.Dialog pins cardMode: single + a viewport for
// the portal (content is fixed-positioned at the viewport centre).
export const Open = () => (
	<Dialog defaultOpen>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Delete resume</DialogTitle>
				<DialogDescription>
					This permanently deletes “Software Engineer” along with its version history. This action cannot be undone.
				</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
				<DialogClose render={<Button variant="destructive" />}>Delete resume</DialogClose>
			</DialogFooter>
		</DialogContent>
	</Dialog>
);
