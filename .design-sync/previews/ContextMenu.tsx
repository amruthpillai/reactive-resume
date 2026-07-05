import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@reactive-resume/ui/components/context-menu";

// Right-click menu — rendered open (defaultOpen) so the card shows the menu.
// cfg.overrides.ContextMenu pins cardMode: single + viewport.
export const Open = () => (
	<div style={{ display: "flex", justifyContent: "center", padding: 24, paddingBottom: 160 }}>
		<ContextMenu defaultOpen>
			<ContextMenuTrigger>
				<div
					style={{
						display: "grid",
						placeItems: "center",
						width: 240,
						height: 96,
						border: "1px dashed var(--border)",
						borderRadius: 8,
						color: "var(--muted-foreground)",
						fontSize: 13,
					}}
				>
					Right-click a resume card
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuGroup>
					<ContextMenuLabel>Software Engineer</ContextMenuLabel>
					<ContextMenuItem>Open</ContextMenuItem>
					<ContextMenuItem>
						Rename
						<ContextMenuShortcut>F2</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuItem>Duplicate</ContextMenuItem>
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive">Delete</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	</div>
);
