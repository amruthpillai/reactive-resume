import type z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useForm } from "react-hook-form";

import { URLInput } from "@/components/input/url-input";
import { useResumeStore } from "@/components/resume/store/resume";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { basicsSchema } from "@/schema/resume/data";

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
	const basics = useResumeStore((state) => state.resume.data.basics);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: basics,
		mode: "onChange",
	});

	const onSubmit = (data: FormValues) => {
		updateResumeData((draft) => {
			draft.basics = data;
		});
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Name</Trans>
							</FormLabel>
							<FormControl render={<Input {...field} />} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="headline"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Headline</Trans>
							</FormLabel>
							<FormControl render={<Input {...field} />} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Email</Trans>
							</FormLabel>
							<FormControl render={<Input type="email" {...field} />} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Phone</Trans>
							</FormLabel>
							<FormControl render={<Input {...field} />} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="location"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Location</Trans>
							</FormLabel>
							<FormControl render={<Input {...field} />} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="website"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Website</Trans>
							</FormLabel>
							<URLInput {...field} value={field.value} onChange={field.onChange} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<CustomFieldsSection onSubmit={onSubmit} />
			</form>
		</Form>
	);
}
