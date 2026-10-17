import type { NativeModule } from "expo";
import { requireOptionalNativeModule } from "expo";

/** ⌘ (Ctrl on Android) plus `input`, a single lowercase key; `shift` adds ⇧. `title` shows in the iPad ⌘-hold overlay. */
export type KeyCommand = { id: string; input: string; shift?: boolean | undefined; title: string };

declare class KeyCommandsModule extends NativeModule<{ onKeyCommand: (event: { id: string }) => void }> {
	/** Replaces every registered command. */
	setCommands(commands: KeyCommand[]): void;
}

/** Null in dev clients built before this module existed: callers skip shortcuts instead of crashing. */
export const keyCommands = requireOptionalNativeModule<KeyCommandsModule>("KeyCommands");
