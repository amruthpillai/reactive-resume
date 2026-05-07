import { Small } from "./primitives";

export const MetaLine = ({ children }: { children: Array<string | undefined> }) => {
	const content = children.filter(Boolean).join(" • ");

	if (!content) return null;

	return <Small>{content}</Small>;
};
