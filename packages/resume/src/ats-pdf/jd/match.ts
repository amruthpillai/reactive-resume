import type { JdMatchReport, JdTermMatch } from "../types";
import { canonicalize, surfaceFormsOf } from "./aliases";
import { buildNgrams, isKnownSkillForm, MAX_NGRAM_LENGTH } from "./ngrams";
import { normalizeForMatching } from "./normalize";
import { stemFreeText } from "./stem";
import { splitIntoRuns, tokenize } from "./tokenize";

/** Terms drawn from a requirements section count for more than terms from the company blurb. */
const REQUIREMENTS_BOOST = 1.5;
/** A name the curated skill list recognises is the kind of term recruiters actually search on. */
const KNOWN_SKILL_BOOST = 2;
/** Each additional word makes a phrase more specific, and slightly more worth matching. */
const PHRASE_BONUS_PER_WORD = 0.4;
const REQUIREMENTS_HEADING =
	/\b(?:requirement|qualification|must[- ]have|nice[- ]to[- ]have|what you(?:'| a|)ll (?:need|bring|do)|about you|we(?:'| a|)re looking for|your (?:profile|background)|you (?:have|bring)|minimum|preferred)\b/;

const DEFAULT_MAX_TERMS = 35;

/**
 * Stuffing is rare, and the bar for calling it is deliberately high.
 *
 * A specialist's resume repeats its own field far more often than a posting does — a Unity
 * developer writes "Unity" in every role, and the posting writes it once. Ratio to the posting
 * alone therefore accuses honest resumes, so a term must also account for a real share of
 * everything the document says before it is named here.
 */
const STUFFING_MIN_COUNT = 8;
const STUFFING_MULTIPLIER = 5;
const STUFFING_MIN_DENSITY = 0.015;

export type JdMatchOptions = {
	jobDescription: string;
	resumeText: string;
	/** From the operator pass: the file draws text a reader cannot see. */
	documentHasHiddenText?: boolean;
	maxTerms?: number;
};

type JdTerm = { term: string; count: number; inRequirements: boolean; words: number; isSkill: boolean };

function collectJdTerms(jobDescription: string): Map<string, JdTerm> {
	const runs = splitIntoRuns(normalizeForMatching(jobDescription));
	const terms = new Map<string, JdTerm>();

	let inRequirements = false;

	for (const run of runs) {
		// A heading flips the section on; it does not itself contribute terms worth counting.
		if (REQUIREMENTS_HEADING.test(run)) inRequirements = true;

		for (const ngram of buildNgrams(tokenize(run))) {
			const term = canonicalize(ngram);
			const existing = terms.get(term);

			if (existing) {
				existing.count += 1;
				existing.inRequirements ||= inRequirements;
				continue;
			}

			terms.set(term, {
				term,
				count: 1,
				inRequirements,
				words: ngram.split(" ").length,
				isSkill: isKnownSkillForm(ngram),
			});
		}
	}

	return terms;
}

/** Counts every 1- to 4-word phrase in the resume, under both its own spelling and its stem. */
function countResumeNgrams(resumeText: string): Map<string, number> {
	const counts = new Map<string, number>();

	for (const run of splitIntoRuns(normalizeForMatching(resumeText))) {
		const tokens = tokenize(run);

		for (let size = 1; size <= MAX_NGRAM_LENGTH; size += 1) {
			for (let start = 0; start + size <= tokens.length; start += 1) {
				const window = tokens.slice(start, start + size);
				const raw = window.join(" ");
				const stemmed = window.map(stemFreeText).join(" ");

				counts.set(raw, (counts.get(raw) ?? 0) + 1);
				if (stemmed !== raw) counts.set(stemmed, (counts.get(stemmed) ?? 0) + 1);
			}
		}
	}

	return counts;
}

function resumeCountFor(term: string, counts: ReadonlyMap<string, number>): number {
	let best = 0;

	for (const surface of surfaceFormsOf(term)) {
		best = Math.max(best, counts.get(surface) ?? 0);
	}

	const stemmed = term.split(" ").map(stemFreeText).join(" ");
	return Math.max(best, counts.get(stemmed) ?? 0);
}

const weigh = (entry: JdTerm) =>
	entry.count *
	(1 + PHRASE_BONUS_PER_WORD * (entry.words - 1)) *
	(entry.inRequirements ? REQUIREMENTS_BOOST : 1) *
	(entry.isSkill ? KNOWN_SKILL_BOOST : 1);

/**
 * Keeps the highest-weighted terms, dropping any phrase already fully represented by one that
 * outranks it — reporting "react", "react hooks" and "react hooks experience" as three separate
 * gaps would triple-count one missing skill.
 */
function selectTerms(entries: readonly JdTerm[], maxTerms: number): JdTerm[] {
	const ranked = [...entries].sort((a, b) => weigh(b) - weigh(a) || a.term.localeCompare(b.term));
	const selected: JdTerm[] = [];

	for (const entry of ranked) {
		if (selected.length >= maxTerms) break;

		const subsumed = selected.some(
			(chosen) => (chosen.term.includes(entry.term) || entry.term.includes(chosen.term)) && entry.count <= chosen.count,
		);
		if (subsumed) continue;

		selected.push(entry);
	}

	return selected;
}

/**
 * Deterministic keyword coverage between a posting and a resume.
 *
 * This is reported as coverage — "24 of 31 terms" — and never folded into the parse score. The
 * two measure different things: one is whether software can read the file, the other is whether
 * this particular posting's vocabulary appears in it.
 */
export function matchJobDescription(options: JdMatchOptions): JdMatchReport {
	const jdTerms = collectJdTerms(options.jobDescription);
	const selected = selectTerms([...jdTerms.values()], options.maxTerms ?? DEFAULT_MAX_TERMS);

	const resumeCounts = countResumeNgrams(options.resumeText);
	const resumeTokenCount = splitIntoRuns(normalizeForMatching(options.resumeText)).reduce(
		(total, run) => total + tokenize(run).length,
		0,
	);

	const terms: JdTermMatch[] = selected.map((entry) => ({
		term: entry.term,
		jdCount: entry.count,
		resumeCount: resumeCountFor(entry.term, resumeCounts),
		weight: Math.round(weigh(entry) * 1000) / 1000,
	}));

	const matched = terms.filter((term) => term.resumeCount > 0);
	const totalWeight = terms.reduce((total, term) => total + term.weight, 0);
	const matchedWeight = matched.reduce((total, term) => total + term.weight, 0);

	return {
		terms,
		matchedTerms: matched.map((term) => term.term),
		missingTerms: terms.filter((term) => term.resumeCount === 0).map((term) => term.term),
		totalTerms: terms.length,
		matchedCount: matched.length,
		weightedCoverage: totalWeight === 0 ? 0 : matchedWeight / totalWeight,
		stuffedTerms: terms
			.filter(
				(term) =>
					term.resumeCount >= STUFFING_MIN_COUNT &&
					term.resumeCount >= term.jdCount * STUFFING_MULTIPLIER &&
					resumeTokenCount > 0 &&
					term.resumeCount / resumeTokenCount >= STUFFING_MIN_DENSITY,
			)
			.map((term) => term.term),
		documentHasHiddenText: options.documentHasHiddenText ?? false,
	};
}
