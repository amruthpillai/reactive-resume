import { CopyIcon, GlobeIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "@reactive-resume/ui/components/input-group";

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, padding: 16, width: 380 };

export const Addons = () => (
	<div style={wrap}>
		<InputGroup>
			<InputGroupAddon>
				<MagnifyingGlassIcon />
			</InputGroupAddon>
			<InputGroupInput placeholder="Search resumes" defaultValue="Product Designer" />
		</InputGroup>

		<InputGroup>
			<InputGroupAddon>
				<GlobeIcon />
				<InputGroupText>rxresu.me/u/</InputGroupText>
			</InputGroupAddon>
			<InputGroupInput defaultValue="jordan-rivera" />
		</InputGroup>

		<InputGroup>
			<InputGroupInput readOnly defaultValue="rxr_live_9f3c8a21bd47e50a" />
			<InputGroupAddon align="inline-end">
				<InputGroupButton size="icon-sm" aria-label="Copy API key">
					<CopyIcon />
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	</div>
);

export const WithTextarea = () => (
	<div style={wrap}>
		<InputGroup>
			<InputGroupTextarea
				rows={3}
				defaultValue="Senior product designer focused on design systems, accessibility, and shipping polished interfaces."
			/>
			<InputGroupAddon align="block-end">
				<InputGroupText>240 characters left</InputGroupText>
				<InputGroupButton style={{ marginLeft: "auto" }}>Generate with AI</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	</div>
);
