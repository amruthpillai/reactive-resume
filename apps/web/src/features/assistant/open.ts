import { useEditorStore } from "@/features/resume/editor/store";

type OpenAssistant = {
	/** A conversation, "new", or "prepare" for an application's next step. */
	assistant?: string | undefined;
	/** A question sent as soon as the assistant is ready. In-app actions only (⌘K Ask, Job match). */
	ask?: string | undefined;
	/** Text for the composer that waits for Send. Links (`?ask=`) use this, so a link can't send as the user. */
	draft?: string | undefined;
};

/** Opens the assistant on a conversation, a question to send, or a draft to review. */
export function openAssistantFrom(search: OpenAssistant) {
	if (!search.assistant && !search.ask && !search.draft) return false;
	const editor = useEditorStore.getState();
	const prepare = search.assistant === "prepare";
	editor.setAssistantOpen(true);
	editor.setAssistantThread(search.ask || search.draft || prepare ? "new" : (search.assistant ?? null));
	editor.setAssistantSuggestions(prepare ? "prepare" : null);
	if (search.ask) editor.setAssistantPrompt(search.ask);
	if (search.draft) editor.setAssistantDraft(search.draft);
	return true;
}
