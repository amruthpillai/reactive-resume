import { isEqual } from "es-toolkit";
import { useEffect } from "react";

type ResettableForm<TValues> = {
	reset: (values: TValues) => void;
	state: {
		values: TValues;
	};
};

export function useSyncFormValues<TValues>(form: ResettableForm<TValues>, values: TValues) {
	useEffect(() => {
		if (isEqual(form.state.values, values)) return;
		form.reset(values);
	}, [form, values]);
}
