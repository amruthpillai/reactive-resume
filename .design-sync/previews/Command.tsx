import { DownloadSimpleIcon, GearIcon, PlusIcon, UserIcon } from "@phosphor-icons/react";
import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@reactive-resume/ui/components/command";

// Command renders inline (cmdk) — a searchable command palette. No overlay.
export const Palette = () => (
	<div style={{ width: 400, padding: 16 }}>
		<div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
			<Command>
				<CommandInput placeholder="Type a command or search…" />
				<CommandList>
					<CommandGroup heading="Actions">
						<CommandItem>
							<PlusIcon /> New resume
							<CommandShortcut>⌘N</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<DownloadSimpleIcon /> Export as PDF
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Account">
						<CommandItem>
							<UserIcon /> Profile
						</CommandItem>
						<CommandItem>
							<GearIcon /> Settings
							<CommandShortcut>⌘,</CommandShortcut>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	</div>
);
