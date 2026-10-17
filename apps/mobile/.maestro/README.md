# Store smoke flows

Run later on an installed development/preview build, **phone portrait**, English app/browser/OS UI, against an isolated HTTPS test server with a disposable account. These flows change private resume notes. Never use personal resumes, production credentials or production data. No emulator, simulator or native build is started by these files.

Maestro is not installed on the M8-T2 host. YAML parsing passed; `maestro check-syntax` and all device runs remain for the coordinator:

```sh
for flow in apps/mobile/.maestro/*.yaml; do maestro check-syntax "$flow"; done
```

Supply `SERVER_ORIGIN`, `EMAIL` and `PASSWORD` through the runner environment for `sign-in.yaml`. Start signed out, with browser cookies cleared for the test server, email sign-in enabled and no 2FA. The flow selects Another server, discovers it, signs in through the system browser, accepts OAuth consent when shown, and waits for Documents. Do not store credentials in YAML or commit runner output: input steps and screenshots may expose test credentials.

For each remaining flow, supply `RESUME_ID` for an **unlocked disposable resume** belonging to that signed-in account. Start with empty notes for edit-and-save; use a different disposable resume for offline-and-reconnect. Existing Notes editor exercises the shared draft owner; Write is now implemented after the native-app merge. Flow opens Share → Document options → Notes, modifies the draft, dismisses the phone sheet, checks Saved (or Offline then Saved), and reopens notes after restarting the app. Rich-text accessibility selection and the sheet swipe need device verification; this is authored coverage, not a passing device claim. Saved confirms server acknowledgement in the current draft implementation; restarting alone is insufficient because local drafts persist.

- `edit-and-save.yaml`: online note save and restart/readback, both platforms.
- `offline-and-reconnect.yaml`: **Android**; Maestro `setAirplaneMode`, offline edit, reconnect, server acknowledgement, restart/readback. `onFlowComplete` turns airplane mode off even after failure. Verify Wi-Fi is also disabled while airplane mode is on. If interrupted externally, restore connectivity manually. For iOS, coordinator repeats the scenario with connectivity controlled outside Maestro; do not treat Android YAML as an iOS pass.
- `export.yaml`: both platforms; Download PDF → actual OS share sheet. Supply `SHARE_SHEET_TEXT` for the visible OS share-sheet control (for example `Save to Files` on English iOS, or the tested Android share target). It asserts the share UI, not the contents or saving of the PDF. Coordinator should save/open the exported PDF and verify pages manually.

Example for a non-secret parameter:

```sh
maestro test -e RESUME_ID="$RESUME_ID" -e SHARE_SHEET_TEXT="Save to Files" apps/mobile/.maestro/export.yaml
```

OS browser-consent text, native rich-text accessibility and sheet gestures may need selector adjustments after the first device run. No app-only test flags, authentication bypasses or production test seams were added.
