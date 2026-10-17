import { plural, t } from "@lingui/core/macro";

/** Same non-blocking font-glyph warning as the web export. Missing font files still reject rendering. */
export function getLostCharactersMessage(characters: readonly string[]): string {
	if (characters.length === 0)
		return t`Your selected font can't display some characters. They show as “?”. In Design, choose a font that has them.`;
	const list = characters.join(", ");
	return plural(characters.length, {
		one: `Your selected font can't display ${list}. It shows as “?”. In Design, choose a font that has it.`,
		other: `Your selected font can't display ${list}. They show as “?”. In Design, choose a font that has them.`,
	});
}
