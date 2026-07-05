import { InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, padding: 16, maxWidth: 540 };

export const Default = () => (
	<div style={wrap}>
		<Alert>
			<InfoIcon />
			<AlertTitle>Resume saved</AlertTitle>
			<AlertDescription>Your changes were saved automatically and synced to your account.</AlertDescription>
		</Alert>
	</div>
);

export const Destructive = () => (
	<div style={wrap}>
		<Alert variant="destructive">
			<WarningIcon />
			<AlertTitle>Export failed</AlertTitle>
			<AlertDescription>We couldn't generate your PDF. Check your connection and try again.</AlertDescription>
		</Alert>
	</div>
);

export const WithAction = () => (
	<div style={wrap}>
		<Alert>
			<AlertTitle>Unsaved changes</AlertTitle>
			<AlertDescription>You have edits that haven't been published to your public resume yet.</AlertDescription>
			<AlertAction>
				<Button size="sm">Publish</Button>
			</AlertAction>
		</Alert>
	</div>
);
