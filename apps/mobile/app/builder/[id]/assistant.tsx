import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export default function AssistantScreen() {
	const { t } = useLingui();
	return <RouteStub title={t`Assistant`} />;
}
