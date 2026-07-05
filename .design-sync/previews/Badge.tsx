import { CheckCircleIcon, PencilSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import { Badge } from "@reactive-resume/ui/components/badge";

const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 20 };

export const Variants = () => (
	<div style={row}>
		<Badge>Default</Badge>
		<Badge variant="secondary">Secondary</Badge>
		<Badge variant="destructive">Destructive</Badge>
		<Badge variant="outline">Outline</Badge>
	</div>
);

export const StatusLabels = () => (
	<div style={row}>
		<Badge variant="secondary">
			<CheckCircleIcon weight="fill" data-icon="inline-start" />
			Published
		</Badge>
		<Badge variant="outline">
			<PencilSimpleIcon data-icon="inline-start" />
			Draft
		</Badge>
		<Badge>
			<SparkleIcon weight="fill" data-icon="inline-start" />
			Pro
		</Badge>
		<Badge variant="destructive">Expired</Badge>
	</div>
);

export const Counts = () => (
	<div style={row}>
		<Badge>12</Badge>
		<Badge variant="secondary">New</Badge>
		<Badge variant="outline">v5.2</Badge>
	</div>
);
