import { XIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/utils/style";

type Props = Omit<React.ComponentProps<"div">, "value" | "onChange"> & {
	value?: string[];
	defaultValue?: string[];
	onChange?: (value: string[]) => void;
};

export function ChipInput({ value, defaultValue = [], onChange, className, ...props }: Props) {
	const [chips, setChips] = useControlledState<string[]>({
		value,
		defaultValue,
		onChange,
	});

	const [input, setInput] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const addChip = React.useCallback(
		(chip: string) => {
			const trimmed = chip.trim();
			if (!trimmed) return;
			const newChips = Array.from(new Set([...chips, trimmed]));
			setChips(newChips);
		},
		[chips, setChips],
	);

	const removeChip = React.useCallback(
		(index: number) => {
			if (index < 0 || index >= chips.length) return;
			const newChips = chips.slice(0, index).concat(chips.slice(index + 1));
			setChips(Array.from(new Set(newChips)));
		},
		[chips, setChips],
	);

	const handleInputChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;
			if (newValue.includes(",")) {
				const parts = newValue.split(",");
				parts.slice(0, -1).forEach(addChip);
				setInput(parts[parts.length - 1]);
			} else {
				setInput(newValue);
			}
		},
		[addChip],
	);

	const removeLastChip = React.useCallback(() => {
		if (chips.length === 0) return;
		const newChips = chips.slice(0, -1);
		setChips(newChips);
	}, [chips, setChips]);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if ((e.key === "Enter" || e.key === ",") && input.trim() !== "") {
				e.preventDefault();
				addChip(input);
				setInput("");
			} else if (e.key === "Backspace" && input === "") {
				removeLastChip();
			}
		},
		[input, addChip, removeLastChip],
	);

	const handleWrapperClick = React.useCallback(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div
			tabIndex={-1}
			onClick={handleWrapperClick}
			className={cn(
				"flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
				className,
			)}
			{...props}
		>
			<div className="flex flex-wrap items-center gap-1.5">
				{chips.map((chip, idx) => (
					<div key={chip + idx} className="relative">
						<Badge variant="outline" className="flex select-none items-center gap-1 ps-2 pe-1">
							<span>{chip}</span>
							<button
								type="button"
								tabIndex={-1}
								aria-label={`Remove ${chip}`}
								onClick={(e) => {
									e.stopPropagation();
									removeChip(idx);
								}}
								className="ms-0.5 hover:text-destructive focus:outline-none"
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					</div>
				))}
			</div>

			<input
				type="text"
				value={input}
				ref={inputRef}
				autoComplete="off"
				aria-label="Add chip"
				onKeyDown={handleKeyDown}
				onChange={handleInputChange}
				className="min-w-0 grow border-none bg-transparent outline-none focus:outline-none focus:ring-0"
			/>
		</div>
	);
}
