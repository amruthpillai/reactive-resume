import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import type z from "zod";
import { ColorPicker } from "@/components/input/color-picker";
import { IconPicker } from "@/components/input/icon-picker";
import { LevelTypeCombobox } from "@/components/level/combobox";
import { LevelDisplay } from "@/components/level/display";
import { useResumeStore } from "@/components/resume/store/resume";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { colorDesignSchema, levelDesignSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
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

function ColorSectionForm() {
	const colors = useResumeStore((state) => state.resume.data.metadata.design.colors);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<z.infer<typeof colorDesignSchema>>({
		mode: "onChange",
		resolver: zodResolver(colorDesignSchema),
		defaultValues: colors,
	});

	const onSubmit = (data: z.infer<typeof colorDesignSchema>) => {
		updateResumeData((draft) => {
			draft.metadata.design.colors = data;
		});
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="primary"
					render={({ field }) => (
						<FormItem className="flex flex-wrap gap-2.5 p-1">
							{quickColorOptions.map((color) => (
								<QuickColorCircle
									key={color}
									color={color}
									active={color === field.value}
									onSelect={(color) => {
										field.onChange(color);
										form.handleSubmit(onSubmit)();
									}}
								/>
							))}
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="primary"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Primary Color
							</FormLabel>
							<div className="flex items-center gap-2">
								<ColorPicker
									value={field.value}
									onValueChange={(color) => {
										field.onChange(color);
										form.handleSubmit(onSubmit)();
									}}
								/>
								<FormControl>
									<Input {...field} />
								</FormControl>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="text"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Text Color
							</FormLabel>
							<div className="flex items-center gap-2">
								<ColorPicker
									defaultValue={field.value}
									onValueChange={(color) => {
										field.onChange(color);
										form.handleSubmit(onSubmit)();
									}}
								/>
								<FormControl>
									<Input {...field} />
								</FormControl>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="background"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Background Color
							</FormLabel>
							<div className="flex items-center gap-2">
								<ColorPicker
									defaultValue={field.value}
									onValueChange={(color) => {
										field.onChange(color);
										form.handleSubmit(onSubmit)();
									}}
								/>
								<FormControl>
									<Input {...field} />
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
						className="absolute inset-0 flex size-8 items-center justify-center"
					>
						<div className="size-4 rounded-md bg-foreground" />
					</motion.div>
				)}
			</AnimatePresence>
		</button>
	);
}

function LevelSectionForm() {
	const colors = useResumeStore((state) => state.resume.data.metadata.design.colors);
	const levelDesign = useResumeStore((state) => state.resume.data.metadata.design.level);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<z.infer<typeof levelDesignSchema>>({
		mode: "onChange",
		resolver: zodResolver(levelDesignSchema),
		defaultValues: levelDesign,
	});

	const onSubmit = (data: z.infer<typeof levelDesignSchema>) => {
		updateResumeData((draft) => {
			draft.metadata.design.level = data;
		});
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="space-y-4">
				<h4 className="font-semibold text-lg leading-none tracking-tight">
					Level
				</h4>

				<div
					style={{ "--page-primary-color": colors.primary, backgroundColor: colors.background } as React.CSSProperties}
					className="flex items-center justify-center rounded-md p-6"
				>
					<LevelDisplay
						level={3}
						type={form.watch("type")}
						icon={form.watch("icon")}
						className="w-full max-w-[220px] justify-center"
					/>
				</div>

				<div className="flex items-center gap-4">
					<FormField
						control={form.control}
						name="icon"
						render={({ field }) => (
							<FormItem className="shrink-0">
								<FormLabel>
									Icon
								</FormLabel>
								<FormControl>
									<IconPicker
										size="default"
										value={field.value}
										onChange={(value) => {
											field.onChange(value);
											form.handleSubmit(onSubmit)();
										}}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>
									Type
								</FormLabel>
								<FormControl>
									<LevelTypeCombobox
										value={field.value}
										onValueChange={(value) => {
											if (!value) return;
											field.onChange(value);
											form.handleSubmit(onSubmit)();
										}}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>
			</form>
		</Form>
	);
}
