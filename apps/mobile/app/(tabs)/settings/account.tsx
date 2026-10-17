import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";

export default function AccountScreen() {
	const { t } = useLingui();
	return <RouteStub title={t`Account`} />;
}
