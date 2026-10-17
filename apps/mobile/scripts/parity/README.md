# Native preview parity

Run from repository root (Node 24; generated Forme binaries required):

```sh
TSX_TSCONFIG_PATH=packages/pdf/tsconfig.json node --import ./apps/server/node_modules/tsx/dist/loader.mjs apps/mobile/scripts/parity/host.mts
```

Host renders the unchanged sample with all 17 templates through `@reactive-resume/pdf/server`, plus an Azurill free-form case to exercise a measured second pass. Only the picture source changes to the repository JPEG data URI, identically on both sides. PDF.js independently extracts page count and exact concatenated text per page from the Node and uploaded native PDFs. Results contain counts, timings and booleans, never document text or font/image bytes.

Launch the dev build on a dedicated device with Metro on 8086, then open:

- iOS: `me.rxresu://builder/preview-sample/page?parity=http%3A%2F%2F127.0.0.1%3A18086`
- Android: `me.rxresu://builder/preview-sample/page?parity=http%3A%2F%2F10.0.2.2%3A18086`

`page.tsx` invokes `device.ts` only in development. Device checks local data-URI decoding, server-relative image loading, rejection above 12 MB, font preload, real native render/subset and first/last-page OS rasterization. It posts each PDF to the host. Look for 18 PASS rows per platform in `docs/plans/native-mobile-app/reports/M3-T4/{ios,android}-parity.json` and the completion banner. Free-form must report at least two engine calls; template repair passes are counted too.

Close the host and Metro, then shut down/delete only your own simulator and AVD. No dependency, WebView or production testing endpoint is installed.
