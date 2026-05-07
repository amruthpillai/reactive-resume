import { useRender } from "@base-ui/react";
import * as React from "react";
import { Label } from "@reactive-resume/ui/components/label";
import { cn } from "@reactive-resume/utils/style";

type FormItemContextValue = {
	id: string;
	hasError: boolean;
};

const FormItemContext = React.createContext<FormItemContextValue>({ id: "", hasError: false });

function useFormItem() {
	return React.useContext(FormItemContext);
}

type FormItemProps = React.ComponentProps<"div"> & { hasError?: boolean };

function FormItem({ className, hasError = false, ...props }: FormItemProps) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id, hasError }}>
			<div data-slot="form-item" className={cn("grid gap-1.5", className)} {...props} />
		</FormItemContext.Provider>
	);
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
	const { id, hasError } = useFormItem();

	return (
		<Label
			data-slot="form-label"
			data-error={hasError}
			className={cn("mb-0.5 data-[error=true]:text-destructive", className)}
			htmlFor={`${id}-form-item`}
			{...props}
		/>
	);
}

function FormControl(props: useRender.ComponentProps<"div">) {
	const { id, hasError } = useFormItem();

	return useRender({
		...props,
		defaultTagName: "div",
		state: { slot: "form-control" },
		props: {
			id: `${id}-form-item`,
			"data-slot": "form-control",
			"aria-describedby": hasError
				? `${id}-form-item-description ${id}-form-item-message`
				: `${id}-form-item-description`,
			"aria-invalid": hasError,
			...props,
		},
	});
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { id } = useFormItem();

	return (
		<p
			data-slot="form-description"
			id={`${id}-form-item-description`}
			className={cn("text-muted-foreground text-xs leading-normal", className)}
			{...props}
		/>
	);
}

type FormMessageProps = Omit<React.ComponentProps<"p">, "children"> & {
	errors?: ReadonlyArray<unknown>;
};

function extractErrorMessage(errors: ReadonlyArray<unknown> | undefined): string | undefined {
	if (!errors || errors.length === 0) return undefined;

	for (const err of errors) {
		if (!err) continue;
		if (typeof err === "string") return err;
		if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
			return (err as { message: string }).message;
		}
	}

	return undefined;
}

function FormMessage({ className, errors, ...props }: FormMessageProps) {
	const { id, hasError } = useFormItem();
	const body = extractErrorMessage(errors);

	if (!body) return null;

	return (
		<p
			id={`${id}-form-item-message`}
			data-error={hasError}
			data-slot="form-message"
			className={cn("line-clamp-1 text-xs", hasError ? "text-destructive" : "text-muted-foreground", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export { FormControl, FormDescription, FormItem, FormLabel, FormMessage };
