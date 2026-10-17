import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export default function HistoryScreen() {
	const { t } = useLingui();
	return <RouteStub title={t`History`} />;
}
