/** Untrusted text can't end a data block early (or open a new one) by containing the markers. */
export const inertMarkers = (text: string) => text.replaceAll("<<<", "‹‹‹").replaceAll(">>>", "›››");

/** Text the model must treat as data, between `<<<NAME_START>>>` and `<<<NAME_END>>>`. */
export const dataBlock = (name: string, text: string) =>
	`<<<${name}_START>>>\n${inertMarkers(text)}\n<<<${name}_END>>>`;
