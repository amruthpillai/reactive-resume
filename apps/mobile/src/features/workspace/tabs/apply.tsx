// Placeholder; M6-T2 owns and fills this tab.
import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export function ApplyTab() {
	const { t } = useLingui();
	return <RouteStub title={t`Apply`} />;
}
