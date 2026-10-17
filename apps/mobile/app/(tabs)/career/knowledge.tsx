import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export default function KnowledgeScreen() {
	const { t } = useLingui();
	return <RouteStub title={t`Knowledge`} />;
}
