import type { IconName } from "@reactive-resume/schema/icons";
import type { CellComponentProps } from "react-window";
import { t } from "@lingui/core/macro";
import { ProhibitIcon } from "@phosphor-icons/react";
import Fuse from "fuse.js";
import { memo, useCallback, useMemo, useState } from "react";
import { Grid } from "react-window";
import { icons } from "@reactive-resume/schema/icons";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { cn } from "@reactive-resume/utils/style";

const columnCount = 8;
const columnWidth = 36;
const rowHeight = 36;

type IconSearchInputProps = {
	value: string;
	onChange: (value: string) => void;
	className?: string;
};

function _IconSearchInput(props: IconSearchInputProps) {
	return (
		<Input
			spellCheck={false}
			inputMode="search"
			value={props.value}
			aria-label={t({
				comment: "Accessible label for icon picker search input",
				message: "Search for an icon",
			})}
			placeholder={t({
				comment: "Placeholder text in icon picker search input",
				message: "Search for an icon",
			})}
			onChange={(e) => props.onChange(e.currentTarget.value)}
			className={cn("rounded-none border-0 focus-visible:ring-0", props.className)}
		/>
	);
}

const IconSearchInput = memo(_IconSearchInput);

IconSearchInput.displayName = "IconSearchInput";

type IconCellComponentProps = CellComponentProps & {
	icons: IconName[];
	onChange: (icon: IconName) => void;
};

function IconCellComponent({ columnIndex, rowIndex, style, icons, onChange }: IconCellComponentProps) {
	const index = rowIndex * columnCount + columnIndex;
	const icon = icons[index];

	return (
		<button
			type="button"
			title={icon}
			style={style}
			tabIndex={-1}
			onClick={() => onChange(icon)}
			className="flex size-full items-center justify-center hover:bg-accent"
		>
			{icon ? <i className={cn("ph text-base", `ph-${icon}`)} /> : <ProhibitIcon />}
		</button>
	);
}

function useIconSearch() {
	const fuse = useMemo(() => new Fuse(icons, { threshold: 0.35 }), []);

	const search = useCallback(
		(query: string): IconName[] => {
			if (!query.trim()) return Array.from(icons);
			return fuse.search(query).map((result) => result.item);
		},
		[fuse],
	);

	return search;
}

type IconPickerProps = Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> & {
	value: string;
	onChange: (icon: string) => void;
	popoverProps?: React.ComponentProps<typeof Popover>;
};

export function IconPicker({ value, onChange, popoverProps, ...props }: IconPickerProps) {
	const searchIcons = useIconSearch();

	const [search, setSearch] = useState("");

	const searchedIcons = useMemo(() => searchIcons(search), [search, searchIcons]);
	const rowCount = useMemo(() => Math.ceil(searchedIcons.length / columnCount), [searchedIcons]);

	return (
		<Popover {...popoverProps}>
			<PopoverTrigger
				render={
					<Button size="icon" variant="outline" {...props}>
						<i className={cn("ph size-4 text-base", `ph-${value}`)} />
					</Button>
				}
			/>

			<PopoverContent align="start" className="h-[326px] w-[290px] gap-0 p-0">
				<IconSearchInput value={search} onChange={setSearch} />

				<div className="size-[290px]">
					<Grid
						key={search}
						rowCount={rowCount}
						rowHeight={rowHeight}
						columnCount={columnCount}
						columnWidth={columnWidth}
						cellComponent={IconCellComponent}
						cellProps={{ icons: searchedIcons, onChange }}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
