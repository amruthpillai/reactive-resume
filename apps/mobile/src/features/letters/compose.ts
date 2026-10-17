import type { LetterDocument } from "@/draft/types";
import type { LetterWords } from "@reactive-resume/resume/cover-letter";
import { useQuery } from "@tanstack/react-query";
import { composeCoverLetter, createCoverLetterResumeData } from "@reactive-resume/resume/cover-letter";
import { letterWords } from "@/features/share/letter";

/** Greeting, sign-off and date in the letter's own language, independent of the app's. */
export const useLetterWords = (locale: string | undefined) =>
	useQuery({
		queryKey: ["letter-words", locale],
		queryFn: () => letterWords(locale ?? ""),
		enabled: locale !== undefined,
		staleTime: Number.POSITIVE_INFINITY,
	}).data;

type ComposableLetter = Parameters<typeof composeCoverLetter>[0] & Pick<LetterDocument, "name" | "style">;

/** The letter as a one-section document the PDF renderer draws: sender header, recipient, greeting, body, sign-off. */
export const letterPageData = (letter: ComposableLetter, words: LetterWords) =>
	createCoverLetterResumeData({ ...letter, ...composeCoverLetter(letter, words) });

/** Renders the sender's details above the letter, as web's `includeCoverLetterHeader`. Stable for the scheduler. */
export const LETTER_RENDER_OPTIONS = { includeCoverLetterHeader: true } as const;
