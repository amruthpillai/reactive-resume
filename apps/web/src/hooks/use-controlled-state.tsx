import { useCallback, useState } from "react";

interface CommonControlledStateProps<T> {
	value?: T;
	defaultValue?: T;
}

type UseControlledStateProps<T, Rest extends unknown[] = []> = CommonControlledStateProps<T> & {
	onChange?: (value: T, ...args: Rest) => void;
};

export function useControlledState<T, Rest extends unknown[] = []>(
	props: UseControlledStateProps<T, Rest>,
): readonly [T, (next: T, ...args: Rest) => void] {
	const { value, defaultValue, onChange } = props;
	const isControlled = value !== undefined;

	const [internalState, setInternalState] = useState<T>(value !== undefined ? value : (defaultValue as T));
	const state = isControlled ? (value as T) : internalState;

	const setState = useCallback(
		(next: T, ...args: Rest) => {
			if (!isControlled) setInternalState(next);
			onChange?.(next, ...args);
		},
		[isControlled, onChange],
	);

	return [state, setState] as const;
}
