import { t } from "@lingui/core/macro";
import {
	ArrowCounterClockwiseIcon,
	ArrowsInIcon,
	ArrowsOutIcon,
	ArrowUUpLeftIcon,
	ArrowUUpRightIcon,
	CopyIcon,
} from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";

type ToolbarButtonProps = {
	label: string;
	disabled?: boolean;
	onClick(): void;
	children: React.ReactNode;
};

function ToolbarButton({ label, disabled, onClick, children }: ToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button type="button" size="icon-sm" variant="ghost" aria-label={label} disabled={disabled} onClick={onClick}>
						{children}
					</Button>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export type StylesheetToolbarProps = {
	source: string;
	canUndo: boolean;
	canRedo: boolean;
	focused: boolean;
	onUndo(): void;
	onRedo(): void;
	onReset(): void;
	onFocusToggle(): void;
};

export function StylesheetToolbar({
	source,
	canUndo,
	canRedo,
	focused,
	onUndo,
	onRedo,
	onReset,
	onFocusToggle,
}: StylesheetToolbarProps) {
	return (
		<div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label={t`Stylesheet editor`}>
			<ToolbarButton label={t`Undo stylesheet edit`} disabled={!canUndo} onClick={onUndo}>
				<ArrowUUpLeftIcon data-icon="inline-start" />
			</ToolbarButton>
			<ToolbarButton label={t`Redo stylesheet edit`} disabled={!canRedo} onClick={onRedo}>
				<ArrowUUpRightIcon data-icon="inline-start" />
			</ToolbarButton>
			<ToolbarButton label={t`Copy stylesheet`} onClick={() => void navigator.clipboard?.writeText(source)}>
				<CopyIcon data-icon="inline-start" />
			</ToolbarButton>
			<ToolbarButton label={t`Reset to applied stylesheet`} onClick={onReset}>
				<ArrowCounterClockwiseIcon data-icon="inline-start" />
			</ToolbarButton>
			<ToolbarButton label={focused ? t`Exit focus mode` : t`Open focus mode`} onClick={onFocusToggle}>
				{focused ? <ArrowsInIcon data-icon="inline-start" /> : <ArrowsOutIcon data-icon="inline-start" />}
			</ToolbarButton>
		</div>
	);
}
