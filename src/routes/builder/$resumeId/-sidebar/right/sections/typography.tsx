import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useForm } from "react-hook-form";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import { FontFamilyCombobox, FontWeightCombobox, getNextWeights } from "@/components/typography/combobox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { typographySchema } from "@/schema/resume/data";
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

function TypographySectionForm() {
	const typography = useResumeStore((state) => state.resume.data.metadata.typography);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		mode: "onChange",
		resolver: zodResolver(formSchema),
		defaultValues: typography,
	});

	const bodyFontFamily = form.watch("body.fontFamily");
	const headingFontFamily = form.watch("heading.fontFamily");

	const onSubmit = (data: FormValues) => {
		updateResumeData((draft) => {
			draft.metadata.typography.body = data.body;
			draft.metadata.typography.heading = data.heading;
		});
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="grid @md:grid-cols-2 grid-cols-1 gap-4">
				<div className="col-span-full flex items-center gap-x-2">
					<Separator className="basis-[16px]" />
					<p className="shrink-0 font-medium text-base">
						<Trans context="Body Text (paragraphs, lists, etc.)">Body</Trans>
					</p>
					<Separator className="flex-1" />
				</div>

				<FormField
					control={form.control}
					name="body.fontFamily"
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel>
								<Trans>Font Family</Trans>
							</FormLabel>
							<FormControl>
								<FontFamilyCombobox
									value={field.value}
									buttonProps={{ size: "lg", className: "text-base" }}
									onValueChange={(value) => {
										if (value === null) return;
										field.onChange(value);
										const nextWeights = getNextWeights(value);
										if (nextWeights !== null) {
											form.setValue("body.fontWeights", nextWeights, { shouldDirty: true });
										}
										form.handleSubmit(onSubmit)();
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="body.fontWeights"
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel>
								<Trans>Font Weights</Trans>
							</FormLabel>
							<FormControl>
								<FontWeightCombobox
									value={field.value}
									fontFamily={bodyFontFamily}
									onValueChange={(value) => {
										field.onChange(value);
										form.handleSubmit(onSubmit)();
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="body.fontSize"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Font Size</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={6}
										max={24}
										step={0.1}
										type="number"
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.onChange("");
											else field.onChange(Number(value));
										}}
									/>
								</FormControl>
								<InputGroupAddon align="inline-end">
									<InputGroupText>pt</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="body.lineHeight"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Line Height</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={0.5}
										max={4}
										step={0.05}
										type="number"
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.onChange("");
											else field.onChange(Number(value));
										}}
									/>
								</FormControl>
								<InputGroupAddon align="inline-end">
									<InputGroupText>x</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</FormItem>
					)}
				/>

				<div className="col-span-full flex items-center gap-x-2">
					<Separator className="basis-[16px]" />
					<p className="shrink-0 font-medium text-base">
						<Trans context="Headings or Titles (H1, H2, H3, H4, H5, H6)">Heading</Trans>
					</p>
					<Separator className="flex-1" />
				</div>

				<FormField
					control={form.control}
					name="heading.fontFamily"
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel>
								<Trans>Font Family</Trans>
							</FormLabel>
							<FormControl>
								<FontFamilyCombobox
									value={field.value}
									buttonProps={{ size: "lg", className: "text-base" }}
									onValueChange={(value) => {
										if (value === null) return;
										field.onChange(value);
										const nextWeights = getNextWeights(value);
										if (nextWeights !== null) {
											form.setValue("heading.fontWeights", nextWeights, { shouldDirty: true });
										}
										form.handleSubmit(onSubmit)();
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="heading.fontWeights"
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel>
								<Trans>Font Weight</Trans>
							</FormLabel>
							<FormControl>
								<FontWeightCombobox
									value={field.value}
									fontFamily={headingFontFamily}
									onValueChange={(value) => {
										field.onChange(value);
										form.handleSubmit(onSubmit)();
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="heading.fontSize"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Font Size</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={6}
										max={24}
										step={0.1}
										type="number"
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.onChange("");
											else field.onChange(Number(value));
										}}
									/>
								</FormControl>
								<InputGroupAddon align="inline-end">
									<InputGroupText>pt</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="heading.lineHeight"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Line Height</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={0.5}
										max={4}
										step={0.05}
										type="number"
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.onChange("");
											else field.onChange(Number(value));
										}}
									/>
								</FormControl>
								<InputGroupAddon align="inline-end">
									<InputGroupText>x</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}
