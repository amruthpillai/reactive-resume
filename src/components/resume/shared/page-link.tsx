import { cn } from "@/utils/style";

type Props = {
	url: string;
	label?: string;
	className?: string;
};

export function PageLink({ url, label, className }: Props) {
	if (!url) return null;

	return (
		<a href={url} target="_blank" rel="noopener" className={cn("inline-block text-wrap", className)}>
			{label || url}
		</a>
	);
}
