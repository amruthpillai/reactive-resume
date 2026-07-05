import { FileTextIcon, GearIcon, HouseIcon, PlusIcon } from "@phosphor-icons/react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@reactive-resume/ui/components/sidebar";

// SidebarProvider supplies context + --sidebar-width. `collapsible="none"`
// renders the sidebar inline (the default offcanvas variant is fixed-positioned
// and would escape the card).
export const Navigation = () => (
	<SidebarProvider>
		<div
			style={{ height: 400, display: "flex", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}
		>
			<Sidebar collapsible="none">
				<SidebarHeader>
					<div style={{ padding: 8, fontWeight: 600, fontSize: 14 }}>Reactive Resume</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Workspace</SidebarGroupLabel>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton isActive>
									<HouseIcon /> Dashboard
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton>
									<FileTextIcon /> Resumes
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton>
									<PlusIcon /> New resume
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton>
								<GearIcon /> Settings
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
		</div>
	</SidebarProvider>
);
