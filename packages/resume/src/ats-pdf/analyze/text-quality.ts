import type { TextQuality } from "../types";

/**
 * A small English lexicon, embedded so the check needs no network and no dictionary package.
 *
 * It exists for one job: telling "this text extracted correctly" from "this text extracted as
 * mojibake". Coverage of rare vocabulary is irrelevant; what matters is that clean English prose
 * hits it often and a broken character map hits it almost never.
 */
const LEXICON_SOURCE =
	"a about above across after again against all almost along also although always am among an and another any anything are around as at away back be became because become been before began begin behind being below best better between both but by came can cannot come could day days did different do does doing done down during each early end enough even ever every example experience few find first five for form found four from full further gave general get give given go going good got great group had half hand has have he her here high him his how however i if in into is it its itself just keep kind knew know known large last later least left less let life like likely little long look made make man many may me mean might more most much must my near need never new next no not now number of off often old on once one only open or order other our out over own part people per perhaps place point possible present problem program provide put quite rather really right run said same saw say school second see seem seen set several shall she should show side since small so some something soon state still such system take taken team than that the their them then there these they thing think this those though three through time to today together too took toward turn two under until up upon us use used using very want was way we well went were what when where whether which while who whole why will with within without work world would year years yet you young your " +
	"ability account achieved across across-team added address advanced agile analysis analyst analytics android api application applications approach architecture assisted automated automation aws azure backend based bachelor budget build building built business campaign candidate capacity career certification certified change client clients cloud code collaborated collaboration communication company completed compliance computer conducted configuration container content contract contributed control coordinated cost created creating cross culture current customer customers data database degree delivered delivery deployed deployment design designed developed developer developing development device devops digital directed director distributed docker documentation drove education efficiency effort employee engaged engineer engineering ensure ensured enterprise environment established evaluated event execution experience expertise feature features finance financial focus framework frontend full-stack function functional git global goals graduate growth guided hardware health hired implementation implemented improve improved improvement increase increased industry information infrastructure initiative integration internal internship java javascript job kubernetes language lead leader leadership leading led legal level leverage linux machine maintained management manager managing marketing master mentored methodology metrics microservices migrated migration mobile model modern monitoring national network node objectives onboarding operations optimization optimized organization outcomes ownership partner partnership performance pipeline planning platform policy portfolio position practice presented process product production professional program project projects promoted proposal python quality quarterly react reduced reduction refactored regional relationship release reliability report reporting requirements research responsible results revenue review risk roadmap role sales scala scale scalable scope scrum security senior server service services skills software solution solutions specialist sprint sql stack stakeholders standards startup strategic strategy streamlined structure success successful summary supervised support surface systems teaching technical technologies technology test testing tests tools track trained training transformation typescript university usability user users validated value vendor version volunteer web workflow workshop written";

const LEXICON = new Set(LEXICON_SOURCE.split(/\s+/).filter(Boolean));

const VOWELS = /[aeiouy]/;
const LATIN = /[A-Za-z]/;
const ALPHABETIC_TOKEN = /^[A-Za-z][A-Za-z'-]*$/;

/** Long enough that a vowel-free run stops being a plausible acronym or abbreviation. */
const VOWELLESS_MIN_LENGTH = 5;
/** Beyond this, an "alphabetic token" is a run of words whose spaces did not survive extraction. */
const RUN_ON_MIN_LENGTH = 25;

/** Above this share of common-word hits, the text reads as English and lexicon signals are trustworthy. */
const ENGLISH_LEXICON_THRESHOLD = 0.15;

export type TextQualityInput = {
	fullText: string;
	/** From the document catalog, when the file declares one. */
	languageTag: string | null;
	/** Share of text items carrying exactly one character; measured on the raw items, not the text. */
	singleCharItemRatio: number;
};

function countCharsIn(text: string, predicate: (codePoint: number) => boolean): number {
	let count = 0;
	for (const character of text) {
		const codePoint = character.codePointAt(0);
		if (codePoint !== undefined && predicate(codePoint)) count += 1;
	}
	return count;
}

const isReplacement = (codePoint: number) => codePoint === 0xff_fd;
const isPrivateUse = (codePoint: number) => codePoint >= 0xe0_00 && codePoint <= 0xf8_ff;
const isLigature = (codePoint: number) => codePoint >= 0xfb_00 && codePoint <= 0xfb_06;

/**
 * Measures how well the text came out, and whether the language-sensitive measurements can be
 * believed at all.
 *
 * The replacement character and private-use ratios are language-neutral: they mean the same thing
 * for a Japanese resume as an English one. Everything derived from the lexicon is only meaningful
 * once English has been established, either from the document's own language tag or from the text
 * itself, and callers are expected to skip those checks otherwise rather than guess.
 */
export function analyzeTextQuality(input: TextQualityInput): TextQuality {
	const { fullText } = input;
	const charCount = [...fullText].length;

	const replacementCount = countCharsIn(fullText, isReplacement);
	const puaCount = countCharsIn(fullText, isPrivateUse);
	const ligatureCount = countCharsIn(fullText, isLigature);
	const latinCount = (fullText.match(/[A-Za-z]/g) ?? []).length;

	const tokens = fullText.split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);
	const alphabetic = tokens.filter((token) => ALPHABETIC_TOKEN.test(token));

	const lexiconHits = alphabetic.filter((token) => LEXICON.has(token.toLowerCase())).length;
	const lexiconHitRatio = alphabetic.length === 0 ? 0 : lexiconHits / alphabetic.length;

	const vowelless = alphabetic.filter(
		(token) => token.length >= VOWELLESS_MIN_LENGTH && !VOWELS.test(token.toLowerCase()),
	).length;

	const runOn = alphabetic.filter((token) => token.length >= RUN_ON_MIN_LENGTH).length;

	const declaresEnglish = (input.languageTag ?? "").toLowerCase().startsWith("en");
	const looksLatin = charCount === 0 ? false : latinCount / charCount > 0.4 || LATIN.test(fullText);

	return {
		tokenCount: tokens.length,
		replacementRatio: charCount === 0 ? 0 : replacementCount / charCount,
		puaRatio: charCount === 0 ? 0 : puaCount / charCount,
		ligatureCount,
		vowellessRatio: alphabetic.length === 0 ? 0 : vowelless / alphabetic.length,
		lexiconHitRatio,
		isEnglish: declaresEnglish || (looksLatin && lexiconHitRatio >= ENGLISH_LEXICON_THRESHOLD),
		runOnTokenRatio: alphabetic.length === 0 ? 0 : runOn / alphabetic.length,
		singleCharItemRatio: input.singleCharItemRatio,
	};
}
