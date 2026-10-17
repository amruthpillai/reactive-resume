# Offline runtime licences

`notices.ts` is committed. Clean checkouts need no licence generation during config, prebuild or export. Regenerate after runtime dependencies, Rust notices or bundled fonts change, then commit the result.

Use production exports for **both** platforms so platform-specific modules are covered (from repository root):

```sh
pnpm --filter mobile exec expo export --platform ios --source-maps --output-dir dist/ios --max-workers 2
pnpm --filter mobile exec expo export --platform android --source-maps --output-dir dist/android --max-workers 2
node apps/mobile/src/features/licences/generate.cjs apps/mobile/dist/ios/_expo/static/js/ios/*.map apps/mobile/dist/android/_expo/static/js/android/*.map
```

Generator uses Node built-ins. It finds installed package manifests for actual `/node_modules/` sources in the exported runtime maps, then reads their bundled LICENSE/COPYING/NOTICE files and declared licence expressions. It does not traverse dependency manifests into build tools. Virtual modules and app/workspace sources are first-party code; the app already identifies its MIT licence. Rust/HarfBuzz notices and bundled font OFLs are included separately.

Some build packages contain small runtime files: Expo includes `@expo/cli/build/metro-require/require.js` and `@expo/metro/metro-runtime/modules/HMRClient.js` in both production source maps. Those shipped fragments retain their package attribution; the CLI/compiler/toolchain dependency graphs are excluded. Runtime helpers such as `metro-runtime` and `@babel/runtime` also keep their notices. TypeScript, Metro compiler, Babel compiler, Jest and other build-only packages are absent.

All text is interned at paragraph boundaries across JavaScript, Rust and fonts. Each notice stores ordered `textIds` into `licenceTexts`; repeated paragraphs retain their positions without duplicating their bytes. Screen renders each paragraph as a separate selectable Text. Upstream wording and paragraph order stay intact. Packages publishing only a licence declaration retain that declaration; no licence text is invented.

After generating, run mobile typecheck and export iOS again to measure the final payload. Source maps/build outputs stay ignored; generated notices stay tracked. No runtime filesystem or network fetch is involved in the screen.
