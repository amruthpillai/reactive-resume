import { CopyIcon, DownloadSimpleIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";

// Anchored menu — rendered open (defaultOpen), positioned below its trigger.
// cfg.overrides.DropdownMenu pins cardMode: single + viewport with room below.
export const Open = () => (
	<div style={{ display: "flex", justifyContent: "center", paddingTop: 16, paddingBottom: 220 }}>
		<DropdownMenu defaultOpen>
			<DropdownMenuTrigger render={<Button variant="outline" />}>Resume actions</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Software Engineer</DropdownMenuLabel>
					<DropdownMenuItem>
						<PencilIcon /> Rename
					</DropdownMenuItem>
					<DropdownMenuItem>
						<CopyIcon /> Duplicate
						<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<DownloadSimpleIcon /> Export PDF
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					<TrashIcon /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
);
