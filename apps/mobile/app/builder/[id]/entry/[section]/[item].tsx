import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export default function EntryScreen() {
	const { t } = useLingui();
	return <RouteStub title={t`Edit entry`} />;
}
