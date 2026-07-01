declare module "hyphen/da/index.js" {
	const hyphenator: {
		hyphenateSync: (text: string, options?: { hyphenChar?: string }) => string;
	};

	export default hyphenator;
}

declare module "hyphen/en-us/index.js" {
	const hyphenator: {
		hyphenateSync: (text: string, options?: { hyphenChar?: string }) => string;
	};

	export default hyphenator;
}
