import { Skeleton } from "@reactive-resume/ui/components/skeleton";

const pad: React.CSSProperties = { padding: 20 };

export const TextLines = () => (
	<div style={{ ...pad, display: "flex", flexDirection: "column", gap: 10, width: 320 }}>
		<Skeleton style={{ height: 12, width: "70%" }} />
		<Skeleton style={{ height: 12, width: "100%" }} />
		<Skeleton style={{ height: 12, width: "90%" }} />
		<Skeleton style={{ height: 12, width: "40%" }} />
	</div>
);

export const ProfileHeader = () => (
	<div style={{ ...pad, display: "flex", alignItems: "center", gap: 14 }}>
		<Skeleton style={{ height: 48, width: 48, borderRadius: "9999px" }} />
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<Skeleton style={{ height: 14, width: 160 }} />
			<Skeleton style={{ height: 12, width: 100 }} />
		</div>
	</div>
);

export const ResumeCard = () => (
	<div
		style={{
			...pad,
			display: "flex",
			flexDirection: "column",
			gap: 12,
			width: 220,
			border: "1px solid var(--border)",
			borderRadius: 12,
		}}
	>
		<Skeleton style={{ height: 140, width: "100%" }} />
		<Skeleton style={{ height: 14, width: "60%" }} />
		<Skeleton style={{ height: 12, width: "40%" }} />
	</div>
);
