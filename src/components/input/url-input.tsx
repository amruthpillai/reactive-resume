import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { TagIcon } from "@phosphor-icons/react";
import { useCallback, useMemo } from "react";
import type z from "zod";
import type { urlSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { Input } from "../ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "../ui/input-group";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const PREFIX = "https://";

function stripPrefix(url: string) {
	return url.startsWith(PREFIX) ? url.slice(PREFIX.length) : url;
}

function ensurePrefix(url: string) {
	if (url === "") return "";
	return url.startsWith(PREFIX) ? url : PREFIX + url;
}

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
	value: z.infer<typeof urlSchema>;
	onChange: (value: z.infer<typeof urlSchema>) => void;
	hideLabelButton?: boolean;
};

export function URLInput({ value, onChange, hideLabelButton, ...props }: Props) {
	const handleUrlChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onChange({
				url: ensurePrefix(e.target.value),
				label: value.label,
			});
		},
		[onChange, value.label],
	);

	const handleLabelChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onChange({ url: value.url, label: e.target.value });
		},
		[onChange, value.url],
	);

	const urlValue = useMemo(() => stripPrefix(value.url), [value.url]);

	return (
		<InputGroup>
			<InputGroupAddon align="inline-start">
				<InputGroupText>{PREFIX}</InputGroupText>
			</InputGroupAddon>

			<InputGroupInput
				value={urlValue}
				className={cn(props.className, "ps-0!")}
				onChange={handleUrlChange}
				{...props}
			/>

			{!hideLabelButton && (
				<InputGroupAddon align="inline-end">
					<Popover>
						<PopoverTrigger asChild>
							<InputGroupButton size="icon-sm" title={t`Add a label to the URL`}>
								<TagIcon />
							</InputGroupButton>
						</PopoverTrigger>

						<PopoverContent className="pt-3">
							<div className="grid gap-2" onClick={(e) => e.stopPropagation()}>
								<Label htmlFor="url-label">
									<Trans>Label</Trans>
								</Label>
								<Input id="url-label" name="url-label" value={value.label} onChange={handleLabelChange} />
							</div>
						</PopoverContent>
					</Popover>
				</InputGroupAddon>
			)}
		</InputGroup>
	);
}
