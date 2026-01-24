import { t } from "@lingui/core/macro";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/style";

type PromptOptions = {
	description?: string;
	defaultValue?: string;
	confirmText?: string;
	cancelText?: string;
	inputProps?: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onKeyDown">;
};

type PromptState = PromptOptions & {
	open: boolean;
	title: string;
	value: string;
	resolve: ((value: string | null) => void) | null;
};

type PromptContextType = {
	prompt: (title: string, options?: PromptOptions) => Promise<string | null>;
};

const PromptContext = React.createContext<PromptContextType | null>(null);

export function PromptDialogProvider({ children }: { children: React.ReactNode }) {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const [state, setState] = React.useState<PromptState>({
		open: false,
		resolve: null,
		title: "",
		value: "",
		description: undefined,
		defaultValue: undefined,
		confirmText: undefined,
		cancelText: undefined,
		inputProps: undefined,
	});

	const cancelText = state.cancelText ?? t`Cancel`;
	const confirmText = state.confirmText ?? t`Confirm`;

	React.useEffect(() => {
		if (!state.open) return;

		setTimeout(() => {
			if (!inputRef.current) return;
			inputRef.current.focus();
		}, 0);
	}, [state.open]);

	const prompt = React.useCallback(async (title: string, options?: PromptOptions): Promise<string | null> => {
		return new Promise<string | null>((resolve) => {
			setState({
				open: true,
				resolve,
				title,
				value: options?.defaultValue ?? "",
				description: options?.description,
				defaultValue: options?.defaultValue,
				confirmText: options?.confirmText,
				cancelText: options?.cancelText,
				inputProps: options?.inputProps,
			});
		});
	}, []);

	const handleConfirm = React.useCallback(() => {
		if (state.resolve) state.resolve(state.value);

		setState((prev) => ({ ...prev, open: false, resolve: null }));
	}, [state.resolve, state.value]);

	const handleCancel = React.useCallback(() => {
		if (state.resolve) state.resolve(null);

		setState((prev) => ({ ...prev, open: false, resolve: null }));
	}, [state.resolve]);

	const handleValueChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setState((prev) => ({ ...prev, value: e.target.value }));
	}, []);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") handleConfirm();
		},
		[handleConfirm],
	);

	return (
		<PromptContext.Provider value={{ prompt }}>
			{children}

			<AlertDialog open={state.open} onOpenChange={(open) => !open && handleCancel()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{state.title}</AlertDialogTitle>
						<AlertDialogDescription className={cn(!state.description && "sr-only")}>
							{state.description}
						</AlertDialogDescription>
					</AlertDialogHeader>

					<Input
						ref={inputRef}
						value={state.value}
						onKeyDown={handleKeyDown}
						onChange={handleValueChange}
						{...state.inputProps}
					/>

					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancel}>{cancelText}</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirm}>{confirmText}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PromptContext.Provider>
	);
}

export function usePrompt() {
	const context = React.useContext(PromptContext);

	if (!context) {
		throw new Error("usePrompt must be used within a <PromptDialogProvider />.");
	}

	return context.prompt;
}
