// Expo's defaults already handle the pnpm monorepo: they watch the workspace root, follow pnpm symlinks to one
// React copy and honour package "exports"/"imports" (S2). The only addition compiles Lingui `.po` catalogs on import.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve("@lingui/metro-transformer/expo");
config.resolver.sourceExts.push("po");

module.exports = config;
