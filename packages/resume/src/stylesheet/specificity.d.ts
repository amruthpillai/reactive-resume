declare module "@bramus/specificity" {
	type CalculatedSpecificity = {
		toArray(): [number, number, number];
	};

	export function calculateForAST(selector: object): CalculatedSpecificity;
}
