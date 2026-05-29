import type { ButtonProps } from "@reactive-resume/ui/components/button";
import type * as React from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { TranslateIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { cn } from "@reactive-resume/utils/style";
import { isLocale, loadLocale, localeMap, resolveLocale, setLocaleCookie } from "@/libs/locale";

type Props = {
	showLabel?: boolean;
	align?: React.ComponentProps<typeof DropdownMenuContent>["align"];
	side?: React.ComponentProps<typeof DropdownMenuContent>["side"];
	buttonClassName?: string;
	buttonVariant?: ButtonProps["variant"];
	buttonSize?: ButtonProps["size"];
};

export function LocaleDropdown({
	showLabel = false,
	align = "end",
	side = "bottom",
	buttonClassName,
	buttonVariant = "ghost",
	buttonSize,
}: Props) {
	const { i18n } = useLingui();
	const selectedLocale = resolveLocale(i18n.locale);
	const selectedLabel = i18n.t(localeMap[selectedLocale]);
	const selectedCode = selectedLocale.split("-")[0].toUpperCase();

	const handleLocaleChange = async (value: string) => {
		if (!isLocale(value) || value === selectedLocale) return;

		setLocaleCookie(value);
		await loadLocale(value);
		window.location.reload();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant={buttonVariant}
						size={buttonSize ?? (showLabel ? "sm" : "icon")}
						className={cn(showLabel && "gap-x-2", buttonClassName)}
						aria-label={t`Change language. Current language: ${selectedLabel}`}
					>
						<TranslateIcon aria-hidden="true" />
						{showLabel ? (
							<>
								<span className="hidden sm:inline">{selectedLabel}</span>
								<span className="sm:hidden">{selectedCode}</span>
							</>
						) : (
							<span className="font-semibold text-[0.625rem] leading-none" aria-hidden="true">
								{selectedCode}
							</span>
						)}
					</Button>
				}
			/>

			<DropdownMenuContent align={align} side={side} className="max-h-[min(28rem,var(--available-height))] min-w-48">
				<DropdownMenuRadioGroup value={selectedLocale} onValueChange={handleLocaleChange}>
					{Object.entries(localeMap).map(([value, label]) => (
						<DropdownMenuRadioItem key={value} value={value}>
							{i18n.t(label)}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
