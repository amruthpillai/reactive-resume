import { useLocalSearchParams } from "expo-router";
import { PublicResume } from "@/features/public/public-resume";

export default function PublicResumeScreen() {
	const { username = "", slug = "" } = useLocalSearchParams<{ username: string; slug: string }>();
	return <PublicResume username={username} slug={slug} />;
}
