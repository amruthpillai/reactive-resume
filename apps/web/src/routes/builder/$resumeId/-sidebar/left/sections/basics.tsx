import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { basicsSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { URLInput } from "@/components/input/url-input";
import { useCurrentBuilderResumeSelector, useUpdateResumeData } from "@/features/resume/builder/draft";
import { useSyncFormValues } from "@/hooks/use-sync-form-values";
import { useAppForm } from "@/libs/tanstack-form";
import { SectionBase } from "../shared/section-base";
import { CustomFieldsSection } from "./custom-fields";

export function BasicsSectionBuilder() {
	return (
		<SectionBase type="basics">
			<BasicsSectionForm />
		</SectionBase>
	);
}

const formSchema = basicsSchema;

type FormValues = z.infer<typeof formSchema>;

function BasicsSectionForm() {
	const basics = useCurrentBuilderResumeSelector((resume) => resume.data.basics);
	const updateResumeData = useUpdateResumeData();

	const persist = (data: FormValues) => {
		updateResumeData((draft) => {
			draft.basics = data;
		});
	};

	const form = useAppForm({
		defaultValues: basics,
		validators: { onChange: formSchema },
		// Persist on every field change via a form-level listener. Previously each field called
		// `form.handleSubmit()` on change, which re-validated the whole form AND toggled submit state —
		// firing the render cascade twice per keystroke. A listener persists once, without the submit churn.
		listeners: {
			onChange: ({ formApi }) => {
				persist(formApi.state.values);
			},
		},
		onSubmit: ({ value }) => {
			persist(value);
		},
	});
	useSyncFormValues(form, basics);

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="name">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Name</Trans>
						</FormLabel>
						<FormControl
							render={
								<Input
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="headline">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Headline</Trans>
						</FormLabel>
						<FormControl
							render={
								<Input
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="email">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Email</Trans>
						</FormLabel>
						<FormControl
							render={
								<Input
									type="email"
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="phone">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Phone</Trans>
						</FormLabel>
						<FormControl
							render={
								<Input
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="location">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Location</Trans>
						</FormLabel>
						<FormControl
							render={
								<Input
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="website">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Website</Trans>
						</FormLabel>
						<FormControl
							render={
								<URLInput
									name={field.name}
									value={field.state.value}
									onChange={(value) => {
										field.handleChange(value);
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<CustomFieldsSection form={form} />
		</form>
	);
}
