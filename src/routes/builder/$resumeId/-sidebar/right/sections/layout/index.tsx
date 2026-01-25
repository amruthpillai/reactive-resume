import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useForm } from "react-hook-form";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { metadataSchema } from "@/schema/resume/data";
import { SectionBase } from "../../shared/section-base";
import { LayoutPages } from "./pages";

export function LayoutSectionBuilder() {
	return (
		<SectionBase type="layout" className="space-y-4">
			<LayoutPages />
			<LayoutSectionForm />
		</SectionBase>
	);
}

const formSchema = metadataSchema.shape.layout.omit({ pages: true });

type FormValues = z.infer<typeof formSchema>;

function LayoutSectionForm() {
	const layout = useResumeStore((state) => state.resume.data.metadata.layout);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		mode: "onChange",
		resolver: zodResolver(formSchema),
		defaultValues: {
			sidebarWidth: layout.sidebarWidth,
		},
	});

	const onSubmit = (data: FormValues) => {
		updateResumeData((draft) => {
			draft.metadata.layout.sidebarWidth = data.sidebarWidth;
		});
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="sidebarWidth"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Sidebar Width</Trans>
							</FormLabel>
							<div className="flex items-center gap-4">
								<FormControl>
									<Slider
										min={10}
										max={50}
										step={0.01}
										value={[field.value]}
										onValueChange={(value) => field.onChange(value[0])}
									/>
								</FormControl>

								<FormControl>
									<InputGroup className="w-auto shrink-0">
										<InputGroupInput
											{...field}
											type="number"
											min={10}
											max={50}
											step={0.1}
											onChange={(e) => {
												const value = e.target.value;
												if (value === "") field.onChange("");
												else field.onChange(Number(value));
											}}
										/>
										<InputGroupAddon align="inline-end">
											<InputGroupText>%</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}
