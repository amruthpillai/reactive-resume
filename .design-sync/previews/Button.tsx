import { ArrowRightIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";

const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 16 };

export const Variants = () => (
	<div style={row}>
		<Button>Save changes</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="destructive">Delete</Button>
		<Button variant="link">Learn more</Button>
	</div>
);

export const Sizes = () => (
	<div style={row}>
		<Button size="xs">Extra small</Button>
		<Button size="sm">Small</Button>
		<Button size="default">Default</Button>
		<Button size="lg">Large</Button>
	</div>
);

export const WithIcons = () => (
	<div style={row}>
		<Button>
			<PlusIcon /> Add section
		</Button>
		<Button variant="outline">
			Continue <ArrowRightIcon />
		</Button>
		<Button variant="destructive">
			<TrashIcon /> Remove
		</Button>
		<Button size="icon" variant="outline" aria-label="Add section">
			<PlusIcon />
		</Button>
	</div>
);

export const Disabled = () => (
	<div style={row}>
		<Button disabled>Saving…</Button>
		<Button variant="outline" disabled>
			Disabled
		</Button>
	</div>
);
