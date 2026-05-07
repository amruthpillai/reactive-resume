import type * as React from "react";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { InputGroupInput } from "@reactive-resume/ui/components/input-group";

type FieldFrameProps = {
	label?: React.ReactNode;
	description?: React.ReactNode;
	formItemClassName?: string;
};

type TextFieldProps = FieldFrameProps &
	Omit<React.ComponentProps<typeof Input>, "children" | "defaultValue" | "name" | "onBlur" | "onChange" | "value">;

type InputGroupTextFieldProps = FieldFrameProps &
	Omit<
		React.ComponentProps<typeof InputGroupInput>,
		"children" | "defaultValue" | "name" | "onBlur" | "onChange" | "value"
	>;

type NumberFieldProps = FieldFrameProps &
	Omit<
		React.ComponentProps<typeof Input>,
		"children" | "defaultValue" | "name" | "onBlur" | "onChange" | "type" | "value"
	>;

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

function TextField({ label, description, formItemClassName, ...props }: TextFieldProps) {
	const field = useFieldContext<string>();

	const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;

	return (
		<FormItem hasError={hasError} className={formItemClassName}>
			{label ? <FormLabel>{label}</FormLabel> : null}
			<FormControl
				render={
					<Input
						{...props}
						name={field.name}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(event) => field.handleChange(event.target.value)}
					/>
				}
			/>
			<FormMessage errors={field.state.meta.errors} />
			{description ? <FormDescription>{description}</FormDescription> : null}
		</FormItem>
	);
}

function InputGroupTextField({ label, description, formItemClassName, ...props }: InputGroupTextFieldProps) {
	const field = useFieldContext<string>();

	const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;

	return (
		<FormItem hasError={hasError} className={formItemClassName}>
			{label ? <FormLabel>{label}</FormLabel> : null}
			<FormControl
				render={
					<InputGroupInput
						{...props}
						name={field.name}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(event) => field.handleChange(event.target.value)}
					/>
				}
			/>
			<FormMessage errors={field.state.meta.errors} />
			{description ? <FormDescription>{description}</FormDescription> : null}
		</FormItem>
	);
}

function NumberField({ label, description, formItemClassName, ...props }: NumberFieldProps) {
	const field = useFieldContext<number>();
	const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
	const value = Number.isFinite(field.state.value) ? field.state.value : "";

	return (
		<FormItem hasError={hasError} className={formItemClassName}>
			{label ? <FormLabel>{label}</FormLabel> : null}
			<FormControl
				render={
					<Input
						{...props}
						type="number"
						name={field.name}
						value={value}
						onBlur={field.handleBlur}
						onChange={(event) => field.handleChange(event.target.valueAsNumber)}
					/>
				}
			/>
			<FormMessage errors={field.state.meta.errors} />
			{description ? <FormDescription>{description}</FormDescription> : null}
		</FormItem>
	);
}

export const { useAppForm, withForm } = createFormHook({
	fieldComponents: { InputGroupTextField, NumberField, TextField },
	fieldContext,
	formComponents: {},
	formContext,
});
