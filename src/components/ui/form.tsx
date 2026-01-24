import { isPlainObject } from "es-toolkit";
import type { Label as LabelPrimitive } from "radix-ui";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldError,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
	useFormState,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/style";

const Form = FormProvider;

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState } = useFormContext();
	const formState = useFormState({ name: fieldContext.name });
	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
};

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div data-slot="form-item" className={cn("grid gap-1.5", className)} {...props} />
		</FormItemContext.Provider>
	);
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			data-slot="form-label"
			data-error={!!error}
			className={cn("mb-0.5 data-[error=true]:text-destructive", className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

function FormControl({ ...props }: React.ComponentProps<typeof SlotPrimitive.Slot>) {
	const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

	return (
		<SlotPrimitive.Slot
			data-slot="form-control"
			id={formItemId}
			aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-muted-foreground text-xs leading-normal", className)}
			{...props}
		/>
	);
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
	const { error, formMessageId } = useFormField();

	function extractMessage(obj: FieldError | undefined): string | undefined {
		if (!obj || typeof obj !== "object") return undefined;

		if (isPlainObject(obj) && "message" in obj && typeof obj.message === "string") {
			return obj.message;
		}

		for (const value of Object.values(obj)) {
			const found = extractMessage(value as FieldError);
			if (found) return found;
		}

		return undefined;
	}

	const body = extractMessage(error);

	if (!body) return null;

	return (
		<p
			id={formMessageId}
			data-error={!!error}
			data-slot="form-message"
			className={cn("line-clamp-1 text-xs", error ? "text-destructive" : "text-muted-foreground", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
