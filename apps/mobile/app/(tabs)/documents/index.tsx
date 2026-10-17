import { useLingui } from "@lingui/react/macro";
import { Link } from "expo-router";
import { FormeCheck } from "@/components/forme-check";
import { RouteStub } from "@/components/route-stub";
import { routes } from "@/routes";
import { Card, ListRow } from "@/ui";

// Sample ids: the stubs only show that every route is reachable by its typed href.
const sample = "sample";

export default function DocumentsScreen() {
	const { t } = useLingui();
	const links = [
		{ title: t`Resume`, href: routes.builder(sample) },
		{ title: t`Cover letter`, href: routes.letter(sample) },
		{ title: t`Trash`, href: routes.trash() },
		{ title: t`Search`, href: routes.search() },
		{ title: t`ATS checker`, href: routes.atsChecker() },
		{ title: t`Sign in`, href: routes.signIn() },
	];

	return (
		<RouteStub title={t`Documents`}>
			<Card style={{ padding: 0, overflow: "hidden" }}>
				{links.map(({ title, href }) => (
					<Link key={href} href={href} asChild>
						<ListRow title={title} subtitle={href} chevron onPress={() => undefined} />
					</Link>
				))}
			</Card>
			{__DEV__ ? <FormeCheck /> : null}
		</RouteStub>
	);
}
