import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import { colorDesignSchema, levelDesignSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { Separator } from "@reactive-resume/ui/components/separator";
import { cn } from "@reactive-resume/utils/style";
import { ColorPicker } from "@/components/input/color-picker";
import { IconPicker } from "@/components/input/icon-picker";
import { LevelTypeCombobox } from "@/components/level/combobox";
import { LevelDisplay } from "@/components/level/display";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { useAppForm } from "@/libs/tanstack-form";
import { SectionBase } from "../shared/section-base";

export function DesignSectionBuilder() {
	return (
		<SectionBase type="design" className="space-y-6">
			<ColorSectionForm />
			<Separator />
			<LevelSectionForm />
		</SectionBase>
	);
}

type ColorValues = z.infer<typeof colorDesignSchema>;

function ColorSectionForm() {
	const resume = useCurrentResume();
	const colors = resume.data.metadata.design.colors;
	const updateResumeData = useUpdateResumeData();

	const persist = (data: ColorValues) => {
		updateResumeData((draft) => {
			draft.metadata.design.colors = data;
		});
	};

	const form = useAppForm({
		defaultValues: colors,
		validators: { onChange: colorDesignSchema },
		onSubmit: ({ value }) => {
			persist(value);
		},
	});

	const handleAutoSave = () => {
		persist(form.state.values);
	};

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="primary">
				{(field) => (
					<FormItem
						className="flex flex-wrap gap-2.5 p-1"
						hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
					>
						{quickColorOptions.map((color) => (
							<QuickColorCircle
								key={color}
								color={color}
								active={color === field.state.value}
								onSelect={(color) => {
									field.handleChange(color as string);
									handleAutoSave();
								}}
							/>
						))}
					</FormItem>
				)}
			</form.Field>

			<form.Field name="primary">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Primary Color</Trans>
						</FormLabel>
						<div className="flex items-center gap-3">
							<ColorPicker
								value={field.state.value}
								onChange={(color) => {
									field.handleChange(color);
									handleAutoSave();
								}}
							/>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											field.handleChange(e.target.value);
											handleAutoSave();
										}}
									/>
								}
							/>
						</div>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="text">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Text Color</Trans>
						</FormLabel>
						<div className="flex items-center gap-3">
							<ColorPicker
								defaultValue={field.state.value}
								onChange={(color) => {
									field.handleChange(color);
									handleAutoSave();
								}}
							/>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											field.handleChange(e.target.value);
											handleAutoSave();
										}}
									/>
								}
							/>
						</div>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="background">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Background Color</Trans>
						</FormLabel>
						<div className="flex items-center gap-3">
							<ColorPicker
								defaultValue={field.state.value}
								onChange={(color) => {
									field.handleChange(color);
									handleAutoSave();
								}}
							/>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											field.handleChange(e.target.value);
											handleAutoSave();
										}}
									/>
								}
							/>
						</div>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>
		</form>
	);
}

const quickColorOptions = [
	"rgba(231, 0, 11, 1)", // red-600
	"rgba(245, 73, 0, 1)", // orange-600
	"rgba(225, 113, 0, 1)", // amber-600
	"rgba(208, 135, 0, 1)", // yellow-600
	"rgba(94, 165, 0, 1)", // lime-600
	"rgba(0, 166, 62, 1)", // green-600
	"rgba(0, 153, 102, 1)", // emerald-600
	"rgba(0, 150, 137, 1)", // teal-600
	"rgba(0, 146, 184, 1)", // cyan-600
	"rgba(0, 132, 209, 1)", // sky-600
	"rgba(21, 93, 252, 1)", // blue-600
	"rgba(79, 57, 246, 1)", // indigo-600
	"rgba(127, 34, 254, 1)", // violet-600
	"rgba(152, 16, 250, 1)", // purple-600
	"rgba(200, 0, 222, 1)", // fuchsia-600
	"rgba(230, 0, 118, 1)", // pink-600
	"rgba(236, 0, 63, 1)", // rose-600
	"rgba(69, 85, 108, 1)", // slate-600
	"rgba(74, 85, 101, 1)", // gray-600
	"rgba(82, 82, 92, 1)", // zinc-600
	"rgba(82, 82, 82, 1)", // neutral-600
	"rgba(87, 83, 77, 1)", // stone-600
];

type QuickColorCircleProps = React.ComponentProps<"button"> & {
	color: string;
	active: boolean;
	onSelect: (color: string) => void;
};

function QuickColorCircle({ color, active, onSelect, className, ...props }: QuickColorCircleProps) {
	return (
		<button
			type="button"
			onClick={() => onSelect(color)}
			className={cn(
				"relative flex size-8 items-center justify-center rounded-md bg-transparent",
				"scale-100 transition-transform hover:scale-120 hover:bg-secondary/80 active:scale-95",
				className,
			)}
			{...props}
		>
			<div style={{ backgroundColor: color }} className="size-6 shrink-0 rounded-md" />

			<AnimatePresence>
				{active && (
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
						transition={{ duration: 0.16, ease: "easeOut" }}
						className="absolute inset-0 flex size-8 items-center justify-center will-change-transform"
					>
						<div className="size-4 rounded-md bg-foreground" />
					</motion.div>
				)}
			</AnimatePresence>
		</button>
	);
}

type LevelValues = z.infer<typeof levelDesignSchema>;
type LevelType = LevelValues["type"];

function LevelSectionForm() {
	const resume = useCurrentResume();
	const colors = resume.data.metadata.design.colors;
	const levelDesign = resume.data.metadata.design.level;
	const updateResumeData = useUpdateResumeData();

	const persist = (data: LevelValues) => {
		updateResumeData((draft) => {
			draft.metadata.design.level = data;
		});
	};

	const form = useAppForm({
		defaultValues: levelDesign,
		validators: { onChange: levelDesignSchema },
		onSubmit: ({ value }) => {
			persist(value);
		},
	});

	const handleAutoSave = () => {
		persist(form.state.values);
	};

	const previewType = useStore(form.store, (s) => s.values.type);
	const previewIcon = useStore(form.store, (s) => s.values.icon);

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<h4 className="font-semibold text-lg leading-none tracking-tight">
				<Trans>Level</Trans>
			</h4>

			<div
				style={{ "--page-primary-color": colors.primary, backgroundColor: colors.background } as React.CSSProperties}
				className="flex items-center justify-center rounded-md p-6"
			>
				<LevelDisplay level={3} type={previewType} icon={previewIcon} className="w-full max-w-[220px] justify-center" />
			</div>

			<div className="flex items-center gap-3">
				<form.Field name="icon">
					{(field) => (
						<FormItem className="shrink-0" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Icon</Trans>
							</FormLabel>
							<FormControl
								render={
									<IconPicker
										size="icon"
										value={field.state.value}
										onChange={(value) => {
											field.handleChange(value);
											handleAutoSave();
										}}
									/>
								}
							/>
						</FormItem>
					)}
				</form.Field>

				<form.Field name="type">
					{(field) => (
						<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Type</Trans>
							</FormLabel>
							<FormControl
								render={
									<LevelTypeCombobox
										value={field.state.value}
										onValueChange={(value) => {
											if (!value) return;
											field.handleChange(value as LevelType);
											handleAutoSave();
										}}
									/>
								}
							/>
						</FormItem>
					)}
				</form.Field>
			</div>
		</form>
	);
}
