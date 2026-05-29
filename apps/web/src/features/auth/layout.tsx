import { Outlet } from "@tanstack/react-router";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { LocaleDropdown } from "@/features/locale/dropdown";
import { ThemeToggleButton } from "@/features/theme/toggle-button";

export function AuthLayout() {
	return (
		<>
			<div className="fixed end-3 top-3 z-50 flex items-center gap-x-1 rounded-lg bg-background/80 p-1 backdrop-blur">
				<LocaleDropdown showLabel />
				<ThemeToggleButton />
			</div>

			<div className="mx-auto flex h-svh w-dvw max-w-sm flex-col justify-center gap-y-6 px-4 xs:px-0">
				<BrandIcon className="mb-4 size-20 self-center" />

				<Outlet />
			</div>
		</>
	);
}
