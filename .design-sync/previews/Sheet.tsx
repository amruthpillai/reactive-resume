import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@reactive-resume/ui/components/sheet";

// Side drawer — rendered open (defaultOpen), anchored to the right edge.
// cfg.overrides.Sheet pins cardMode: single + viewport.
export const Open = () => (
	<Sheet defaultOpen>
		<SheetContent side="right">
			<SheetHeader>
				<SheetTitle>Resume settings</SheetTitle>
				<SheetDescription>Control how “Software Engineer” appears when shared publicly.</SheetDescription>
			</SheetHeader>
			<div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px" }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<Label>Public slug</Label>
					<span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>rxresume.me/jane-doe</span>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<Label>Visibility</Label>
					<span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Anyone with the link can view</span>
				</div>
			</div>
			<SheetFooter>
				<SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
				<SheetClose render={<Button />}>Save changes</SheetClose>
			</SheetFooter>
		</SheetContent>
	</Sheet>
);
