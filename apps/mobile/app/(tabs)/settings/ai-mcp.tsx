import { useLingui } from "@lingui/react/macro";
import { Stack } from "expo-router";
import { useSession } from "@/auth/session";
import { Card, Screen, Text } from "@/ui";

export default function McpScreen() {
	const { t } = useLingui();
	const { server } = useSession();
	return (
		<Screen>
			<Stack.Screen options={{ title: t`MCP server` }} />
			<Text color="ink2">{t`Let AI clients like Claude or Cursor read and edit your resumes, using an API key.`}</Text>
			<Card>
				<Text selectable variant="mono">{`${server}/mcp`}</Text>
			</Card>
			<Text color="ink2">{t`Create an API key from Account settings in your browser. Keys act as you and can read and edit your documents.`}</Text>
			<Text variant="title">{t`Setup guide`}</Text>
			<Text selectable variant="mono">
				https://docs.rxresu.me/guides/using-the-mcp-server
			</Text>
		</Screen>
	);
}
