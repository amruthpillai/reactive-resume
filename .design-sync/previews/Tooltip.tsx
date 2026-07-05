import { InfoIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";

// Anchored overlay — needs TooltipProvider; rendered open (defaultOpen).
// cfg.overrides.Tooltip pins cardMode: single + viewport with room above the trigger.
export const Open = () => (
	<TooltipProvider>
		<div style={{ display: "flex", justifyContent: "center", paddingTop: 120, paddingBottom: 24 }}>
			<Tooltip defaultOpen>
				<TooltipTrigger render={<Button variant="outline" size="icon" aria-label="About visibility" />}>
					<InfoIcon />
				</TooltipTrigger>
				<TooltipContent>Only you can see private resumes</TooltipContent>
			</Tooltip>
		</div>
	</TooltipProvider>
);
