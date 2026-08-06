declare module "@bramus/specificity" {
	type CalculatedSpecificity = {
		toArray(): [number, number, number];
	};

	// biome-ignore lint/complexity/noStaticOnlyClass: mirrors the installed dependency's default export
	class Specificity {
		static calculateForAST(selector: object): CalculatedSpecificity;
	}

	export default Specificity;
}
