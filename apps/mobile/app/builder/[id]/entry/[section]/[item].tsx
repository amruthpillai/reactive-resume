import { useLocalSearchParams } from "expo-router";
import { BasicsScreen } from "@/features/write/basics-screen";
import { EntryScreen, SummaryScreen } from "@/features/write/entry-screen";
import { PictureScreen } from "@/features/write/picture-screen";

/**
 * An entry of a section, full screen. Basics and the summary have no entry ids: `basics/basics`, `basics/picture`
 * and `summary/summary` open their screens. The draft is owned by the pane underneath (Write or Page).
 */
export default function EntryRoute() {
	const { id, section, item, field } = useLocalSearchParams<{
		id: string;
		section: string;
		item: string;
		field?: string;
	}>();
	if (section === "basics")
		return item === "picture" ? <PictureScreen /> : <BasicsScreen key={field} resumeId={id} focusField={field} />;
	if (section === "summary") return <SummaryScreen key={field} autoFocus={field === "content"} />;
	return <EntryScreen key={field} resumeId={id} sectionId={section} entryId={item} focusField={field} />;
}
