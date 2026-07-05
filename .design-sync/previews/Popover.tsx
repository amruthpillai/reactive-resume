import { Button } from "@reactive-resume/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@reactive-resume/ui/components/popover";

// Anchored overlay — rendered open (defaultOpen), positioned below its trigger.
// cfg.overrides.Popover pins cardMode: single + viewport with room for the popup.
export const Open = () => (
	<div style={{ display: "flex", justifyContent: "center", paddingTop: 24, paddingBottom: 220 }}>
		<Popover defaultOpen>
			<PopoverTrigger render={<Button variant="outline" />}>Share resume</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>Public link</PopoverTitle>
					<PopoverDescription>Anyone with this link can view your published resume.</PopoverDescription>
				</PopoverHeader>
				<div style={{ display: "flex", gap: 8 }}>
					<Button size="sm" variant="secondary">
						Copy link
					</Button>
					<Button size="sm" variant="ghost">
						Open
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	</div>
);
