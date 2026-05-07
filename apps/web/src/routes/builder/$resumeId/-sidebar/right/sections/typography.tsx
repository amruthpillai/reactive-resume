import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { typographySchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@reactive-resume/ui/components/input-group";
import { Separator } from "@reactive-resume/ui/components/separator";
import { useResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { FontFamilyCombobox, FontWeightCombobox, getNextWeights } from "@/components/typography/combobox";
import { useAppForm } from "@/libs/tanstack-form";
import { SectionBase } from "../shared/section-base";

export function TypographySectionBuilder() {
	return (
		<SectionBase type="typography">
			<TypographySectionForm />
		</SectionBase>
	);
}

const formSchema = typographySchema;

type FormValues = z.infer<typeof formSchema>;
type FontWeight = FormValues["body"]["fontWeights"][number];

function TypographySectionForm() {
	const resume = useResume();
	const typography = resume?.data.metadata.typography;
	const updateResumeData = useUpdateResumeData();

	const persist = (data: FormValues) => {
		updateResumeData((draft) => {
			draft.metadata.typography.body = data.body;
			draft.metadata.typography.heading = data.heading;
		});
	};

	const form = useAppForm({
		defaultValues: typography,
		validators: { onChange: formSchema },
		onSubmit: ({ value }) => {
			persist(value);
		},
	});

	const handleAutoSave = () => {
		persist(form.state.values);
	};

	const bodyFontFamily = useStore(form.store, (s) => s.values.body.fontFamily);
	const headingFontFamily = useStore(form.store, (s) => s.values.heading.fontFamily);

	return (
		<form
			className="grid @md:grid-cols-2 grid-cols-1 gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<div className="col-span-full flex items-center gap-x-2">
				<Separator className="basis-[16px]" />
				<div className="shrink-0 font-medium text-base leading-none">
					<Trans context="Body Text (paragraphs, lists, etc.)">Body</Trans>
				</div>
				<Separator className="flex-1" />
			</div>

			<form.Field name="body.fontFamily">
				{(field) => (
					<FormItem
						className="col-span-full"
						hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
					>
						<FormLabel>
							<Trans>Font Family</Trans>
						</FormLabel>
						<FormControl
							render={
								<FontFamilyCombobox
									value={field.state.value}
									className="text-base"
									onValueChange={(value: string | null) => {
										if (value === null) return;
										field.handleChange(value);
										const nextWeights = getNextWeights(value);
										if (nextWeights) form.setFieldValue("body.fontWeights", nextWeights);
										handleAutoSave();
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="body.fontWeights">
				{(field) => (
					<FormItem
						className="col-span-full"
						hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
					>
						<FormLabel>
							<Trans>Font Weights</Trans>
						</FormLabel>
						<FormControl
							render={
								<FontWeightCombobox
									value={field.state.value}
									fontFamily={bodyFontFamily}
									onValueChange={(value) => {
										if (value?.length === 0) return;
										field.handleChange(value as FontWeight[]);
										handleAutoSave();
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="body.fontSize">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Font Size</Trans>
						</FormLabel>
						<InputGroup>
							<FormControl
								render={
									<InputGroupInput
										name={field.name}
										value={field.state.value}
										min={6}
										max={24}
										step={0.1}
										type="number"
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.handleChange("" as unknown as number);
											else field.handleChange(Number(value));
											handleAutoSave();
										}}
									/>
								}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>pt</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</FormItem>
				)}
			</form.Field>

			<form.Field name="body.lineHeight">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Line Height</Trans>
						</FormLabel>
						<InputGroup>
							<FormControl
								render={
									<InputGroupInput
										name={field.name}
										value={field.state.value}
										min={0.5}
										max={4}
										step={0.05}
										type="number"
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.handleChange("" as unknown as number);
											else field.handleChange(Number(value));
											handleAutoSave();
										}}
									/>
								}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>x</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</FormItem>
				)}
			</form.Field>

			<div className="col-span-full flex items-center gap-x-2">
				<Separator className="basis-[16px]" />
				<div className="shrink-0 font-medium text-base leading-none">
					<Trans context="Headings or Titles (H1, H2, H3, H4, H5, H6)">Heading</Trans>
				</div>
				<Separator className="flex-1" />
			</div>

			<form.Field name="heading.fontFamily">
				{(field) => (
					<FormItem
						className="col-span-full"
						hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
					>
						<FormLabel>
							<Trans>Font Family</Trans>
						</FormLabel>
						<FormControl
							render={
								<FontFamilyCombobox
									value={field.state.value}
									className="text-base"
									onValueChange={(value: string | null) => {
										if (value === null) return;
										field.handleChange(value);
										const nextWeights = getNextWeights(value);
										if (nextWeights) form.setFieldValue("heading.fontWeights", nextWeights);
										handleAutoSave();
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="heading.fontWeights">
				{(field) => (
					<FormItem
						className="col-span-full"
						hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
					>
						<FormLabel>
							<Trans>Font Weight</Trans>
						</FormLabel>
						<FormControl
							render={
								<FontWeightCombobox
									value={field.state.value}
									fontFamily={headingFontFamily}
									onValueChange={(value) => {
										if (value?.length === 0) return;
										field.handleChange(value as FontWeight[]);
										handleAutoSave();
									}}
								/>
							}
						/>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="heading.fontSize">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Font Size</Trans>
						</FormLabel>
						<InputGroup>
							<FormControl
								render={
									<InputGroupInput
										name={field.name}
										value={field.state.value}
										min={6}
										max={24}
										step={0.1}
										type="number"
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.handleChange("" as unknown as number);
											else field.handleChange(Number(value));
											handleAutoSave();
										}}
									/>
								}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>pt</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</FormItem>
				)}
			</form.Field>

			<form.Field name="heading.lineHeight">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Line Height</Trans>
						</FormLabel>
						<InputGroup>
							<FormControl
								render={
									<InputGroupInput
										name={field.name}
										value={field.state.value}
										min={0.5}
										max={4}
										step={0.05}
										type="number"
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.handleChange("" as unknown as number);
											else field.handleChange(Number(value));
											handleAutoSave();
										}}
									/>
								}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>x</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</FormItem>
				)}
			</form.Field>
		</form>
	);
}
