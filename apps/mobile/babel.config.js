// Lingui macros expand at build time; everything else is Expo's default preset.
module.exports = (api) => {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: ["@lingui/babel-plugin-lingui-macro"],
	};
};
