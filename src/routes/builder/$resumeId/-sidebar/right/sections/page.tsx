import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useForm } from "react-hook-form";
import type z from "zod";
import { getLocaleOptions } from "@/components/locale/combobox";
import { useResumeStore } from "@/components/resume/store/resume";
import { Combobox } from "@/components/ui/combobox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { pageSchema } from "@/schema/resume/data";
import { SectionBase } from "../shared/section-base";

export function PageSectionBuilder() {
	return (
		<SectionBase type="page">
			<PageSectionForm />
		</SectionBase>
	);
}

const formSchema = pageSchema;

type FormValues = z.infer<typeof formSchema>;

function PageSectionForm() {
	const page = useResumeStore((state) => state.resume.data.metadata.page);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		mode: "onChange",
		resolver: zodResolver(formSchema),
		defaultValues: page,
	});

	const onSubmit = (data: FormValues) => {
		updateResumeData((draft) => {
			draft.metadata.page = data;
		});
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="grid @md:grid-cols-2 grid-cols-1 gap-4">
				<FormField
					control={form.control}
					name="locale"
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel>
								<Trans>Language</Trans>
							</FormLabel>
							<FormControl>
								<Combobox
									options={getLocaleOptions()}
									value={field.value}
									onValueChange={(locale) => {
										field.onChange(locale);
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
					name="format"
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel>
								<Trans context="Page Format (A4, Letter or Free-Form)">Format</Trans>
							</FormLabel>
							<FormControl>
								<Combobox
									options={[
										{ value: "a4", label: t`A4` },
										{ value: "letter", label: t`Letter` },
										{ value: "free-form", label: t`Free-Form` },
									]}
									value={field.value}
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
					name="marginX"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Margin (Horizontal)</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={0}
										max={100}
										step={1}
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
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="marginY"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Margin (Vertical)</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={0}
										max={100}
										step={1}
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
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="gapX"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Spacing (Horizontal)</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={0}
										step={1}
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
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="gapY"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Spacing (Vertical)</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl>
									<InputGroupInput
										{...field}
										min={0}
										step={1}
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
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="hideIcons"
					render={({ field }) => (
						<FormItem className="col-span-full flex items-center gap-x-3 py-2">
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={(checked) => {
										field.onChange(checked);
										form.handleSubmit(onSubmit)();
									}}
								/>
							</FormControl>
							<FormLabel>
								<Trans>Hide all icons on the resume</Trans>
							</FormLabel>
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}
