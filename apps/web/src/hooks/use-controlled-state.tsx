import { useCallback, useEffect, useState } from "react";

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

	const [state, setInternalState] = useState<T>(value !== undefined ? value : (defaultValue as T));

	useEffect(() => {
		if (value !== undefined) setInternalState(value);
	}, [value]);

	const setState = useCallback(
		(next: T, ...args: Rest) => {
			setInternalState(next);
			onChange?.(next, ...args);
		},
		[onChange],
	);

	return [state, setState] as const;
}
