import { Spinner } from "@/components/ui/spinner";

export function LoadingScreen() {
	return (
		<div className="fixed inset-0 z-50 flex h-svh w-svw items-center justify-center gap-x-3 bg-background">
			<Spinner className="size-6" />
			<p className="text-muted-foreground">
				Loading...
			</p>
		</div>
	);
}
