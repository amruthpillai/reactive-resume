import { CheckCircleIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Marker, MarkerContent, MarkerIcon } from "@reactive-resume/ui/components/marker";

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, padding: 16, width: 360 };

export const Statuses = () => (
	<div style={wrap}>
		<Marker style={{ width: "fit-content", borderRadius: 8, padding: "12px 16px", background: "var(--muted)" }}>
			<MarkerIcon>
				<SparkleIcon />
			</MarkerIcon>
			<MarkerContent>Tailoring your resume…</MarkerContent>
		</Marker>
		<Marker style={{ width: "fit-content" }}>
			<MarkerIcon>
				<CheckCircleIcon />
			</MarkerIcon>
			<MarkerContent>Applied 4 edits to your resume</MarkerContent>
		</Marker>
		<Marker style={{ width: "fit-content" }}>
			<MarkerIcon>
				<WarningCircleIcon />
			</MarkerIcon>
			<MarkerContent>Couldn't reach the AI provider</MarkerContent>
		</Marker>
	</div>
);

export const Dividers = () => (
	<div style={wrap}>
		<Marker variant="separator">
			<MarkerContent>Today</MarkerContent>
		</Marker>
		<Marker variant="border">
			<MarkerContent>Conversation history</MarkerContent>
		</Marker>
	</div>
);
