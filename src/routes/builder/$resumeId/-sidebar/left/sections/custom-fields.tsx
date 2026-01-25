import { Trans } from "@lingui/react/macro";
import { DotsSixVerticalIcon, LinkIcon, ListPlusIcon, XIcon } from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type z from "zod";
import { IconPicker } from "@/components/input/icon-picker";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { basicsSchema } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

type FormValues = z.infer<typeof basicsSchema>;
type CustomField = FormValues["customFields"][number];

type Props = {
	onSubmit: (data: FormValues) => void;
};

export function CustomFieldsSection({ onSubmit }: Props) {
	const form = useFormContext<FormValues>();

	const customFields = useWatch({ control: form.control, name: "customFields" });

	const customFieldsArray = useFieldArray({
		control: form.control,
		keyName: "key",
		name: "customFields",
	});

	function handleReorder(newFields: CustomField[]) {
		const currentFieldsMap = Object.fromEntries(customFields.map((f) => [f.id, f]));
		const reordered = newFields.map((field) => currentFieldsMap[field.id] ?? field);
		form.setValue("customFields", reordered);
		form.handleSubmit(onSubmit)();
	}

	function handleRemove(index: number) {
		customFieldsArray.remove(index);
		form.handleSubmit(onSubmit)();
	}

	function handleAdd() {
		customFieldsArray.append({ id: generateId(), icon: "acorn", text: "", link: "" });
		form.handleSubmit(onSubmit)();
	}

	return (
		<Reorder.Group className="touch-none space-y-4" values={customFieldsArray.fields} onReorder={handleReorder}>
			{customFieldsArray.fields.map((field, index) => (
				<CustomFieldItem key={field.id} field={field}>
					<FormField
						control={form.control}
						name={`customFields.${index}.icon`}
						render={({ field }) => (
							<FormItem className="shrink-0">
								<FormControl>
									<IconPicker
										{...field}
										className="rounded-r-none! border-e-0!"
										onChange={(icon) => {
											field.onChange(icon);
											form.handleSubmit(onSubmit)();
										}}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={`customFields.${index}.text`}
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormControl>
									<Input
										{...field}
										className="rounded-l-none!"
										onChange={(e) => {
											field.onChange(e.target.value);
											form.handleSubmit(onSubmit)();
										}}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<Popover>
						<PopoverTrigger asChild>
							<Button size="icon" variant="ghost" className="ms-1">
								<LinkIcon />
							</Button>
						</PopoverTrigger>

						<PopoverContent align="center">
							<div className="flex flex-col gap-y-1.5">
								<span className="text-muted-foreground text-xs">
									<Trans>Enter the URL to link to</Trans>
								</span>

								<Controller
									control={form.control}
									name={`customFields.${index}.link`}
									render={({ field }) => (
										<Input
											type="url"
											value={field.value}
											placeholder="Must start with https://"
											onChange={(e) => {
												field.onChange(e.target.value);
												form.handleSubmit(onSubmit)();
											}}
										/>
									)}
								/>
							</div>
						</PopoverContent>
					</Popover>

					<Button size="icon" variant="ghost" onClick={() => handleRemove(index)}>
						<XIcon />
					</Button>
				</CustomFieldItem>
			))}

			<Button variant="ghost" onClick={handleAdd}>
				<ListPlusIcon />
				<Trans>Add a custom field</Trans>
			</Button>
		</Reorder.Group>
	);
}

type CustomFieldItemProps = {
	field: CustomField;
	children: React.ReactNode;
};

function CustomFieldItem({ field, children }: CustomFieldItemProps) {
	const controls = useDragControls();

	return (
		<Reorder.Item
			key={field.id}
			value={field}
			dragListener={false}
			dragControls={controls}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex touch-none items-center"
		>
			<Button
				size="icon"
				variant="ghost"
				className="me-2 touch-none"
				onPointerDown={(e) => {
					e.preventDefault();
					controls.start(e);
				}}
			>
				<DotsSixVerticalIcon />
			</Button>

			{children}
		</Reorder.Item>
	);
}
