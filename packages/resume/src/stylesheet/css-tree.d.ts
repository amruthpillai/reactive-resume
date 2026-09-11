declare module "css-tree" {
	export type CssLocation = {
		start: { line: number; column: number; offset: number };
		end: { line: number; column: number; offset: number };
	};

	export type CssNode = {
		type: string;
		name?: string;
		prelude?: CssNode | null;
		block?: CssNode | null;
		children?: Iterable<CssNode>;
		loc?: CssLocation | null;
	};

	export type ParseOptions = {
		context?: string;
		positions?: boolean;
		parseCustomProperty?: boolean;
		onParseError?: (error: unknown, node: CssNode) => void;
		onComment?: (value: string, location: CssLocation) => void;
		onToken?: (...args: unknown[]) => void;
	};

	export const ident: {
		decode(value: string): string;
	};

	export function generate(node: CssNode): string;
	export function parse(source: string, options?: ParseOptions): CssNode;
	export function walk(node: CssNode, enter: (node: CssNode) => void): void;
}
