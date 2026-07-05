import { Button } from "@reactive-resume/ui/components/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@reactive-resume/ui/components/hover-card";

// Anchored preview-card overlay — rendered open (defaultOpen).
// cfg.overrides.HoverCard pins cardMode: single + viewport with room below the trigger.
export const Open = () => (
	<div style={{ display: "flex", justifyContent: "center", paddingTop: 24, paddingBottom: 180 }}>
		<HoverCard defaultOpen>
			<HoverCardTrigger render={<Button variant="link" />}>@jane-doe</HoverCardTrigger>
			<HoverCardContent>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<span style={{ fontWeight: 600 }}>Jane Doe</span>
					<span style={{ color: "var(--muted-foreground)" }}>Senior Software Engineer · San Francisco</span>
					<span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>3 published resumes · joined 2023</span>
				</div>
			</HoverCardContent>
		</HoverCard>
	</div>
);
