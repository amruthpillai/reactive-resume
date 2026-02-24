import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type z from "zod";
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
								Language
							</FormLabel>
							<FormControl>
								<Combobox
									options={[
										{ value: "en-US", label: "English" },
										{ value: "es-ES", label: "Spanish" },
										{ value: "fr-FR", label: "French" },
										{ value: "de-DE", label: "German" },
										{ value: "pt-BR", label: "Portuguese (Brazil)" },
										{ value: "it-IT", label: "Italian" },
										{ value: "nl-NL", label: "Dutch" },
										{ value: "ja-JP", label: "Japanese" },
										{ value: "ko-KR", label: "Korean" },
										{ value: "zh-CN", label: "Chinese (Simplified)" },
										{ value: "ar-SA", label: "Arabic" },
										{ value: "hi-IN", label: "Hindi" },
										{ value: "ru-RU", label: "Russian" },
										{ value: "tr-TR", label: "Turkish" },
										{ value: "pl-PL", label: "Polish" },
										{ value: "sv-SE", label: "Swedish" },
										{ value: "da-DK", label: "Danish" },
										{ value: "fi-FI", label: "Finnish" },
										{ value: "no-NO", label: "Norwegian" },
										{ value: "cs-CZ", label: "Czech" },
									]}
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
								Format
							</FormLabel>
							<FormControl>
								<Combobox
									options={[
										{ value: "a4", label: "A4" },
										{ value: "letter", label: "Letter" },
										{ value: "free-form", label: "Free-Form" },
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
								Margin (Horizontal)
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
								Margin (Vertical)
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
								Spacing (Horizontal)
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
								Spacing (Vertical)
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
								Hide all icons on the resume
							</FormLabel>
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}
