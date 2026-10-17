import { ApplicationsViewFrame } from "@/features/applications-board/views";
import { ApplicationsListScreen } from "@/features/applications/list-screen";

export default function ApplicationsIndex() {
	return (
		<ApplicationsViewFrame current="list">
			<ApplicationsListScreen />
		</ApplicationsViewFrame>
	);
}
