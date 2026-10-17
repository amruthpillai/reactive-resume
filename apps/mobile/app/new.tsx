import { NewDocument } from "@/features/documents/new-document";

export default function NewScreen() {
	return (
		<SafeAreaProvider>
			<NewDocument />
		</SafeAreaProvider>
	);
}
import { SafeAreaProvider } from "react-native-safe-area-context";
