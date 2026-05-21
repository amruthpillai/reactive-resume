import type { ResumeSlot } from "@reactive-resume/schema/template-metadata";
import { Trans } from "@lingui/react/macro";
import { FormControl, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { Separator } from "@reactive-resume/ui/components/separator";
import { Switch } from "@reactive-resume/ui/components/switch";
import { RichInput } from "@/components/input/rich-input";

type Props = {
	value: Record<string, unknown>;
	onChange: (value: Record<string, unknown>) => void;
	slots: ResumeSlot[];
};

export function TemplateExtensionFields({ value, onChange, slots }: Props) {
	if (slots.length === 0) return null;

	const update = (slotId: string, newValue: unknown) => {
		onChange({ ...value, [slotId]: newValue });
	};

	return (
		<>
			<Separator className="sm:col-span-full" />
			<p className="font-medium text-foreground text-sm sm:col-span-full">
				<Trans>Template Fields</Trans>
			</p>
			{slots.map((slot) => (
				<SlotField key={slot.id} slot={slot} value={value[slot.id]} onChange={(v) => update(slot.id, v)} />
			))}
		</>
	);
}

function SlotField({ slot, value, onChange }: { slot: ResumeSlot; value: unknown; onChange: (v: unknown) => void }) {
	const stringValue = String(value ?? "");

	if (slot.type === "toggle") {
		return (
			<FormItem className="flex items-center gap-x-2 sm:col-span-full">
				<FormControl render={<Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />} />
				<FormLabel>{slot.label}</FormLabel>
			</FormItem>
		);
	}

	if (slot.type === "rich-text") {
		return (
			<FormItem className="sm:col-span-full">
				<FormLabel>{slot.label}</FormLabel>
				<FormControl render={<RichInput value={stringValue} onChange={(v) => onChange(v)} />} />
			</FormItem>
		);
	}

	if (slot.type === "image" || slot.type === "image-list") {
		return (
			<FormItem>
				<FormLabel>{slot.label}</FormLabel>
				<FormControl render={<Input disabled placeholder="Image upload coming in a future release" />} />
			</FormItem>
		);
	}

	return (
		<FormItem>
			<FormLabel>{slot.label}</FormLabel>
			<FormControl
				render={
					<Input
						type={slot.type === "url" ? "url" : "text"}
						value={stringValue}
						placeholder={slot.description}
						onChange={(e) => onChange(e.target.value)}
					/>
				}
			/>
		</FormItem>
	);
}
