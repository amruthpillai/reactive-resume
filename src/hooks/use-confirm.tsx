import * as React from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/utils/style";

interface ConfirmOptions {
	description?: string;
	confirmText?: string;
	cancelText?: string;
}

interface ConfirmState extends ConfirmOptions {
	open: boolean;
	title: string;
	resolve: ((value: boolean) => void) | null;
}

type ConfirmContextType = {
	confirm: (title: string, options?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<ConfirmContextType | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = React.useState<ConfirmState>({
		open: false,
		resolve: null,
		title: "",
		description: undefined,
		confirmText: undefined,
		cancelText: undefined,
	});

	const confirm = React.useCallback(async (title: string, options?: ConfirmOptions): Promise<boolean> => {
		return new Promise<boolean>((resolve) => {
			setState({
				open: true,
				resolve,
				title,
				description: options?.description,
				confirmText: options?.confirmText,
				cancelText: options?.cancelText,
			});
		});
	}, []);

	const handleConfirm = React.useCallback(() => {
		if (state.resolve) state.resolve(true);

		setState((prev) => ({ ...prev, open: false, resolve: null }));
	}, [state.resolve]);

	const handleCancel = React.useCallback(() => {
		if (state.resolve) state.resolve(false);

		setState((prev) => ({ ...prev, open: false, resolve: null }));
	}, [state.resolve]);

	return (
		<ConfirmContext.Provider value={{ confirm }}>
			{children}

			<AlertDialog open={state.open} onOpenChange={(open) => !open && handleCancel()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{state.title}</AlertDialogTitle>
						<AlertDialogDescription className={cn(!state.description && "sr-only")}>
							{state.description}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancel}>{state.cancelText ?? "Cancel"}</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirm}>{state.confirmText ?? "Confirm"}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ConfirmContext.Provider>
	);
}

export function useConfirm() {
	const context = React.useContext(ConfirmContext);

	if (!context) {
		throw new Error("useConfirm must be used within a <ConfirmDialogProvider />.");
	}

	return context.confirm;
}
