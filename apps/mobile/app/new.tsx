import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export default function NewScreen() {
	const { t } = useLingui();
	return <RouteStub title={t`New`} />;
}
