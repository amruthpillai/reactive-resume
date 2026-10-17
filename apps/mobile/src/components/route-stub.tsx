import type { ReactNode } from "react";
import { Stack, usePathname } from "expo-router";
import { Screen, Text } from "@/ui";

type RouteStubProps = {
	title: string;
	children?: ReactNode;
};

/** A placeholder screen: its title and the route it answers. Later waves replace each one. */
export function RouteStub({ title, children }: RouteStubProps) {
	const pathname = usePathname();

	return (
		<Screen>
			<Stack.Screen options={{ title }} />
			<Text variant="display">{title}</Text>
			<Text variant="mono" color="ink3">
				{pathname}
			</Text>
			{children}
		</Screen>
	);
}
