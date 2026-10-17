import type { ReactNode } from "react";
import { createContext, use, useCallback, useLayoutEffect, useMemo, useState } from "react";

type Setter<T> = (owner: object, value: T | null) => void;

/**
 * Chrome that the shell renders and screens fill. Screens call `useFill(values)` while mounted; the shell reads the
 * merged values of every mounted screen with `useSlot()`, later mounts winning per key. Each shell instance has its
 * own `Provider`, so two editors on one stack keep their own chrome.
 */
export function createSlot<T extends object>() {
	const SetContext = createContext<Setter<T> | null>(null);
	const ValueContext = createContext<Partial<T>>({});

	function Provider({ children }: { children: ReactNode }) {
		const [fills, setFills] = useState<ReadonlyMap<object, T>>(new Map());
		const set = useCallback<Setter<T>>(
			(owner, value) =>
				setFills((previous) => {
					const next = new Map(previous);
					if (value) next.set(owner, value);
					else next.delete(owner);
					return next;
				}),
			[],
		);
		const value = useMemo(() => Object.assign({}, ...fills.values()) as Partial<T>, [fills]);

		return (
			<SetContext value={set}>
				<ValueContext value={value}>{children}</ValueContext>
			</SetContext>
		);
	}

	function useFill(values: T) {
		const set = use(SetContext);
		const [owner] = useState(() => ({}));

		// Re-set whenever the values change; ReactNode values are new on every render, so this compares nothing.
		useLayoutEffect(() => {
			set?.(owner, values);
		}, [set, owner, values]);
		useLayoutEffect(() => () => set?.(owner, null), [set, owner]);
	}

	const useSlot = () => use(ValueContext);

	return { Provider, useFill, useSlot };
}
