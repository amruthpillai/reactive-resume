# Native preview parity

Run from repository root (Node 24; generated Forme binaries required):

```sh
TSX_TSCONFIG_PATH=packages/pdf/tsconfig.json node --import ./apps/server/node_modules/tsx/dist/loader.mjs apps/mobile/scripts/parity/host.mts
```

Host renders the unchanged sample with all 17 templates through `@reactive-resume/pdf/server`, plus an Azurill free-form case to exercise a measured second pass. Only the picture source changes to the repository JPEG data URI, identically on both sides. PDF.js independently extracts page count and exact concatenated text per page from the Node and uploaded native PDFs. Results contain counts, timings and booleans, never document text or font/image bytes.

Launch the dev build on a dedicated device with Metro on 8086, then open:

- iOS: `me.rxresu://builder/preview-sample/page?parity=http%3A%2F%2F127.0.0.1%3A18086`
- Android: `me.rxresu://builder/preview-sample/page?parity=http%3A%2F%2F127.0.0.1%3A18086`

The host binds only `127.0.0.1:18086`. On Android, use your own emulator serial: `adb -s <serial> reverse tcp:18086 tcp:18086` (and reverse Metro 8086 too).

`page.tsx` conditionally requires the development tools in a top-level `__DEV__` branch. Metro removes that branch before collecting release dependencies; neither `device.ts` nor any other parity module appears in the iOS/Android production source maps. Device checks local data-URI decoding, server-relative image loading, rejection above 12 MB, font preload, real native render/subset and first/last-page OS rasterization. It posts each PDF to the host. Look for 18 PASS rows per platform in `apps/mobile/reports/parity/{ios,android}-parity.json` and the completion banner. Free-form must report at least two engine calls; template repair passes are counted too.

Close the host and Metro, then shut down/delete only your own simulator and AVD. No dependency, WebView or production testing endpoint is installed.

## Review smoke run

For one draft-backed Page run instead of all-template parity, replace `parity=` with `smoke=` in the URLs above. The same loopback host serves the fixture. The tools exercise HTTP 200 font-body rejection, corrupt-cache recovery, real sparse-file FIFO eviction at 200 MB, disk-error fallback, a 25 MP per-page raster cap, PNG replacement and stale-directory cleanup. Seed `rr-pdf-M3T4-stale` under the app's native temporary directory (iOS `tmp`, Android `cache`) before the first launch to verify startup cleanup.

After checks pass, the tools seed a fictional document in the real draft store's SQLite format and a disposable local fixture session in SecureStore. The regular Page route opens it through the builder's `useResumeDraftOwner`. The local fixture host has no authenticated resume API: read/save requests fail, so these checks prove on-device draft recovery, rendering, edits and undo; they do not claim a real account/server save. Tap **Edit draft**, then **Undo draft edit**; each checks the resulting SQLite record. **Draft name** also uses the shared field-focus handlers for a keyboard/debounce smoke check. Development messages stay behind the same excluded branch.

Use a disposable task-owned simulator/emulator only: this changes its local fixture session. Delete that device afterward. No real credentials or personal resume data are used.
