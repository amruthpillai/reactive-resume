declare module "hyphen/da" {
	const hyphenator: {
		hyphenateSync: (text: string, options?: { hyphenChar?: string }) => string;
	};

	export default hyphenator;
}

declare module "hyphen/en-us" {
	const hyphenator: {
		hyphenateSync: (text: string, options?: { hyphenChar?: string }) => string;
	};

	export default hyphenator;
}
