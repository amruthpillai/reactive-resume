import type { ImperativeRouter } from "expo-router";
import { useLingui } from "@lingui/react/macro";
import { useRouter, Stack } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hostOf } from "@/auth/auth-header";
import { serverErrorMessage } from "@/auth/messages";
import { discover, isAllowedServer, ServerError, toOrigin } from "@/auth/oauth";
import { DEFAULT_SERVER, useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Button, Screen, Text, TextField, useTheme } from "@/ui";

const continueTo = (server: string, router: ImperativeRouter) =>
	router.push({ pathname: routes.signIn(), params: { server } });

type Check =
	| { state: "idle" }
	| { state: "checking"; origin: string }
	| { state: "ok"; origin: string }
	| { state: "error"; message: string };

const checkDelay = 600;

export default function CustomServer() {
	const router = useRouter();
	const { t, i18n } = useLingui();
	const { colors, space } = useTheme();
	const insets = useSafeAreaInsets();
	const { server } = useSession();
	const [address, setAddress] = useState(
		server === DEFAULT_SERVER ? "" : server.startsWith("http:") ? server : hostOf(server),
	);
	const [check, setCheck] = useState<Check>({ state: "idle" });
	const latest = useRef(0);

	const run = async (input: string) => {
		const id = ++latest.current;
		const origin = toOrigin(input);
		if (!origin) return setCheck({ state: "error", message: t`Enter an address like resume.example.org.` });
		// https only; development builds may also use http on this machine (isAllowedServer).
		if (!isAllowedServer(origin))
			return setCheck({ state: "error", message: t`This server uses http. The app needs https.` });

		setCheck({ state: "checking", origin });
		try {
			await discover(origin);
			if (id === latest.current) setCheck({ state: "ok", origin });
		} catch (error) {
			if (id !== latest.current) return;
			const reason = error instanceof ServerError ? error : new ServerError("unreachable");
			setCheck({ state: "error", message: serverErrorMessage(i18n, reason) });
		}
	};

	const edit = (value: string) => {
		latest.current++;
		setAddress(value);
		setCheck({ state: "idle" });
	};

	// Check once typing pauses.
	const runLater = useEffectEvent(() => void run(address));
	useEffect(() => {
		if (!address.trim()) return;
		const timer = setTimeout(runLater, checkDelay);
		return () => clearTimeout(timer);
	}, [address]);

	const ready = check.state === "ok";

	return (
		<Screen scroll={false} edges={["bottom"]}>
			<Stack.Screen options={{ headerShown: true, title: t`Another server`, headerBackTitle: t`Back` }} />
			<ScrollView
				style={{ flex: 1 }}
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={{ gap: space.s3 }}
				keyboardShouldPersistTaps="handled"
			>
				<TextField
					label={t`Server address`}
					value={address}
					onChangeText={edit}
					placeholder="resume.example.org"
					keyboardType="url"
					textContentType="URL"
					autoCapitalize="none"
					autoCorrect={false}
					autoFocus
					returnKeyType="go"
					onSubmitEditing={() => void run(address)}
					error={check.state === "error" ? check.message : undefined}
					trailing={check.state === "checking" ? <ActivityIndicator color={colors.ink3} /> : null}
				/>
				{check.state === "checking" ? (
					<Text variant="callout" color="ink3">
						{t`Checking ${hostOf(check.origin)}…`}
					</Text>
				) : null}
				<Text variant="callout" color="ink3">
					{t`Enter the address you open Reactive Resume at in a browser. The app checks it's a Reactive Resume server that allows app sign-in before you continue.`}
				</Text>
			</ScrollView>
			<KeyboardStickyView offset={{ opened: insets.bottom - space.s2 }}>
				<View style={{ flexDirection: "row", gap: space.s2, paddingTop: space.s2 }}>
					{check.state === "error" ? (
						<Button
							label={t`Try again`}
							variant="secondary"
							size="lg"
							icon="arrow-clockwise"
							onPress={() => void run(address)}
						/>
					) : null}
					<View style={{ flex: 1 }}>
						<Button
							label={t`Continue`}
							size="lg"
							fullWidth
							disabled={!ready}
							onPress={() => ready && continueTo(check.origin, router)}
						/>
					</View>
				</View>
			</KeyboardStickyView>
		</Screen>
	);
}
