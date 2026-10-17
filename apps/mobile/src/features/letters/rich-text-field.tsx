import type { RichTextSession } from "@/features/write/rich-text";
import type { IconName } from "@/ui";
import type { RefObject } from "react";
import type { EnrichedTextInputInstance, OnChangeStateEvent } from "react-native-enriched-html";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScrollView, View } from "react-native";
import { EnrichedTextInput } from "react-native-enriched-html";
import { letterFieldFocus } from "@/draft";
import { createRichTextSession } from "@/features/write/rich-text";
import { Button, IconButton, Text, useTheme } from "@/ui";

/** The focused editor, for the toolbar docked above the keyboard (one per screen). */
type ActiveEditor = {
	ref: RefObject<EnrichedTextInputInstance | null>;
	state: OnChangeStateEvent | null;
	/** A toolbar command: its report is written even if focus moved meanwhile. */
	command: () => void;
};

let active: ActiveEditor | null = null;
const listeners = new Set<() => void>();
const setActive = (next: ActiveEditor | null) => {
	active = next;
	for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** The editor's serialisation of the value it holds; edits are measured against it. */
const loadBaseline = (
	ref: RefObject<EnrichedTextInputInstance | null>,
	session: RichTextSession,
	write: (html: string) => void,
) =>
	void ref.current
		?.getHTML()
		.then((html) => {
			const held = session.baseline(html);
			if (held !== null) write(held);
		})
		.catch(() => undefined);

type LetterRichTextProps = {
	label: string;
	value: string;
	/** Receives letter HTML, only after the user edits this field. */
	onChange: (html: string) => void;
	disabled?: boolean | undefined;
	autoFocus?: boolean | undefined;
	minLines?: number | undefined;
};

/**
 * Rich text for the letter body and an older letter's recipient (react-native-enriched-html). Only an edited field
 * is re-serialised (README §0). Render `LetterRichTextToolbar` once on the screen for bold, italic and lists.
 */
export function LetterRichText({ label, value, onChange, disabled, autoFocus, minLines = 8 }: LetterRichTextProps) {
	const { colors, fonts, radius, space, type } = useTheme();
	const ref = useRef<EnrichedTextInputInstance>(null);
	const [session] = useState(() => createRichTextSession(value));
	const [focused, setFocused] = useState(false);

	// Undo, a kept draft and remote updates change the text from outside; load them while the field isn't focused.
	useEffect(() => {
		const markup = session.external(value);
		if (markup === null) return;
		ref.current?.setValue(markup);
		loadBaseline(ref, session, onChange);
	});

	useEffect(() => {
		loadBaseline(ref, session, () => undefined);
		return () => {
			if (active?.ref === ref) setActive(null);
		};
	}, [session]);

	return (
		<View style={{ gap: space.s1 }}>
			<Text variant="label">{label}</Text>
			<EnrichedTextInput
				ref={ref}
				accessibilityLabel={label}
				// The initial markup only: changing defaultValue reloads the editor and moves the caret.
				defaultValue={session.markup}
				editable={!disabled}
				autoFocus={autoFocus ?? false}
				placeholderTextColor={colors.ink3}
				cursorColor={colors.accent}
				selectionColor={colors.accentSoft}
				linkRegex={null}
				style={{
					minHeight: type.bodyLarge.lineHeight * minLines + space.s3 * 2,
					paddingHorizontal: space.s3,
					paddingVertical: space.s3,
					borderWidth: 1,
					borderRadius: radius.rLg,
					borderColor: focused ? colors.accent : colors.lineStrong,
					backgroundColor: disabled ? colors.sunken : colors.raised,
					color: colors.ink,
					fontFamily: fonts.ui[400],
					fontSize: type.bodyLarge.fontSize,
				}}
				htmlStyle={{
					a: { color: colors.accentText, textDecorationLine: "underline" },
					ul: { bulletColor: colors.ink2 },
					ol: { markerColor: colors.ink2 },
				}}
				onFocus={() => {
					session.focus();
					letterFieldFocus.onFocus();
					setFocused(true);
					loadBaseline(ref, session, onChange);
					setActive({ ref, state: active?.ref === ref ? active.state : null, command: session.command });
				}}
				onBlur={() => {
					session.blur();
					letterFieldFocus.onBlur();
					setFocused(false);
					if (active?.ref === ref) setActive(null);
				}}
				onChangeHtml={(event) => {
					const html = session.change(event.nativeEvent.value);
					if (html !== null) onChange(html);
				}}
				onChangeState={(event) => {
					if (active?.ref === ref) setActive({ ...active, state: event.nativeEvent });
				}}
			/>
		</View>
	);
}

/**
 * Bold, italic, underline and lists above the keyboard while a rich-text field has focus, with Done at the end. No
 * Improve on letters (builder.html). Render it last in the screen: the editor chrome ends content at the keyboard.
 */
export function LetterRichTextToolbar() {
	const { t } = useLingui();
	const { colors, size, space } = useTheme();
	const editor = useSyncExternalStore(subscribe, () => active);
	if (!editor) return null;
	const input = () => {
		editor.command();
		return editor.ref.current;
	};
	const state = editor.state;

	const buttons: { key: string; icon: IconName; label: string; on: boolean | undefined; run: () => void }[] = [
		{ key: "b", icon: "text-b", label: t`Bold`, on: state?.bold.isActive, run: () => input()?.toggleBold() },
		{ key: "i", icon: "text-italic", label: t`Italic`, on: state?.italic.isActive, run: () => input()?.toggleItalic() },
		{
			key: "u",
			icon: "text-underline",
			label: t`Underline`,
			on: state?.underline.isActive,
			run: () => input()?.toggleUnderline(),
		},
		{
			key: "ul",
			icon: "list-bullets",
			label: t`Bulleted list`,
			on: state?.unorderedList.isActive,
			run: () => input()?.toggleUnorderedList(),
		},
		{
			key: "ol",
			icon: "list-numbers",
			label: t`Numbered list`,
			on: state?.orderedList.isActive,
			run: () => input()?.toggleOrderedList(),
		},
	];

	return (
		// The editor chrome already ends its content at the keyboard, so the toolbar is simply last in the layout.
		<View
			accessibilityRole="toolbar"
			accessibilityLabel={t`Formatting`}
			style={{
				flexDirection: "row",
				alignItems: "center",
				minHeight: size.hit + 2,
				borderTopWidth: 1,
				borderTopColor: colors.line,
				backgroundColor: colors.raised,
			}}
		>
			<ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
				<View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.s1 }}>
					{buttons.map((button) => (
						<IconButton
							key={button.key}
							icon={button.icon}
							label={button.label}
							selected={button.on ?? false}
							onPress={button.run}
						/>
					))}
				</View>
			</ScrollView>
			<Button variant="link" label={t`Done`} onPress={() => editor.ref.current?.blur()} />
			<View style={{ width: space.s3 }} />
		</View>
	);
}
