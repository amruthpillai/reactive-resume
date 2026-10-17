import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { SearchScreen } from "@/features/search/search-screen";

export default function SearchRoute() {
	return (
		<SafeAreaProvider>
			<SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1 }}>
				<SearchScreen />
			</SafeAreaView>
		</SafeAreaProvider>
	);
}
