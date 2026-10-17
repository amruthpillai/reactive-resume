import type { KeyCommand } from "../../modules/key-commands";
import { useEffect, useRef } from "react";
import { keyCommands } from "../../modules/key-commands";

/** A hardware keyboard shortcut and what it does. */
export type KeyBinding = KeyCommand & { run: () => void };

type Owner = { readonly current: readonly KeyBinding[] };

// Every mounted `useKeyCommands`, in mount order. For the same keys the latest mounted one wins.
const owners = new Set<Owner>();

const active = () => {
	const byKey = new Map<string, KeyBinding>();
	for (const owner of owners)
		for (const binding of owner.current) byKey.set(`${binding.input}:${!!binding.shift}`, binding);
	return [...byKey.values()];
};

const sync = () =>
	keyCommands?.setCommands(active().map(({ id, input, shift, title }) => ({ id, input, shift: !!shift, title })));

keyCommands?.addListener("onKeyCommand", ({ id }) =>
	active()
		.find((binding) => binding.id === id)
		?.run(),
);

/**
 * Registers ⌘-shortcuts (Ctrl on Android) while the calling screen is mounted (iPad and Android hardware keyboards).
 * A no-op in dev clients without the `key-commands` module.
 */
export function useKeyCommands(bindings: readonly KeyBinding[]) {
	const owner = useRef<readonly KeyBinding[]>(bindings);
	useEffect(() => {
		owner.current = bindings;
	});
	const signature = bindings.map(({ id, input, shift, title }) => `${id}:${input}:${!!shift}:${title}`).join("|");
	useEffect(() => {
		if (!keyCommands) return;
		owners.add(owner);
		sync();
		return () => {
			owners.delete(owner);
			sync();
		};
	}, [signature]);
}
