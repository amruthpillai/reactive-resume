# M8-T2: store privacy and Android Data safety notes

Source audit: `mobile/M8-T2`, based on `a7390ed31`, 2026-10-17. Draft store-form inputs, not a completed Play Console/App Store submission. Re-audit the final merged release: Practise and Write are still stubs on this task base, while other builders are filling them. No tracking, advertising SDK or analytics SDK was added in this task.

## Data leaving the device

The user selects a Reactive Resume server (default `https://rxresu.me`). OAuth uses the system browser and PKCE; access/refresh tokens stay in SecureStore and are sent to that server to authenticate. Native release sign-in requires HTTPS. Server operators control persistence, backups, retention, configured AI providers and email delivery. Review the official server privacy policy and final production services when filling the store forms; arbitrary self-hosted server behavior cannot be certified by this app config.

| Data | Why and destination | User choice / retention |
| --- | --- | --- |
| Account name, username, email and account identifier | Account functionality on selected server; profile/API requests identify the signed-in user | Required for account workflows; deletion through native Account → Delete account, subject to server policy/backups |
| Resume/letter text, contact details, addresses, phone numbers, work/education, job applications, notes, preferences, career stories and salary/offer figures the user enters | Create/edit/sync documents and career records on selected server | Content chosen by user; persists until removed/deleted under server policy; consider Personal info, Files/docs, Other user-generated content and Financial info categories as applicable to actual content |
| Profile photo and uploaded pictures, resumes and attachments | User-initiated upload to selected server/storage provider | Optional; classify Photos and videos / Files and docs; photo upload is not restricted to on-device processing |
| AI prompts, selected documents/context, replies and configured provider details | User-initiated AI features through selected server and its configured provider | Optional; disclose as user content processed by a service provider; verify final provider retention/training policy and opt-ins |
| OAuth credentials / API credentials | Authentication and user-selected integrations | Sensitive; never disclose in store screenshots, logs or test reports; server-side saved AI provider credentials have their own encryption/retention policy |
| Network request metadata, including IP address | TLS connections to selected server, image hosts, and Google-hosted resume fonts; infrastructure may log requests | Verify actual server/CDN logging and retention before declaring diagnostics or identifiers absent |

No native code path on this base accesses contacts, location, calendars, advertising identifiers, microphone audio or a broad media library. Imports use document pickers; photo selection uses the system picker; exports use sandbox files plus OS share sheets. Explicit camera capture is used by Settings → Account → profile photo. Local reminder content remains on device and uses no Expo/APNs/FCM token registration API. No speech recording/transcription is wired yet: if M6-T2 adds voice recording before release, re-enable the foreground microphone permission and add **Audio files / voice recordings** and transcription-provider disclosure here before building. Keep background recording/playback disabled unless a real workflow requires it.

For Play Data safety, account/content uploads are data collection. Do **not** answer “no data collected” merely because there is no analytics SDK. For the official server, declare collection for app functionality/account management and user-linked content; optional photo/AI/other features remain optional where the form supports that distinction. “Data shared” depends on Google policy exemptions and the actual server/provider relationship, so the publisher must check configured processors and user-directed sharing; do not claim a universal no-sharing answer. No sale, advertising or cross-app tracking behavior was found in the native source audit. Exports and public links are user-directed sharing; account deletion must be tested on the release server, and the store listing needs the public privacy-policy and deletion-request URLs.

## On-device storage

SecureStore holds OAuth tokens and DCR registrations. SQLite kv-store holds scoped unsaved drafts, offline queues and feature preferences; resume/font/image/PDF/export caches use app-private files. Existing sign-out cleanup, cache TTLs and account deletion behavior belong to their feature owners; this task did not change them. Verify backup/restore retention on the final binary. SecureStore backup exclusions come from its stock config plugin.

## Permissions

Expected functional Android set after manifest merge: `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `CAMERA`, `VIBRATE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`. The last permission restores scheduled local reminders after reboot. No exact-alarm permission is requested; reminders can be delayed by OS power policies. Runtime camera/notification prompts occur through the existing user actions.

`app.config.ts` blocks legacy external-storage, modern broad media-read, overlay, microphone/audio-settings, foreground audio-service, Firebase remote receive/wakelock and unused vendor badge permissions. Static inspection included installed Expo manifests and cached Firebase Messaging 25.0.1 / ShortcutBadger 1.1.22 AAR manifests. Expo config introspection verifies removal directives; **the final Gradle merged release manifest has not been built**. AndroidX can additionally declare the app-scoped `me.rxresu.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` for receiver protection, which is an implementation permission rather than access to user data. Recheck the final AAB manifest before store submission.

iOS user-data usage descriptions: `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`. Microphone and unused Face ID descriptions are disabled. Notification authorization is a system permission, with local notifications only: `enableRemoteNotifications: false` and `enableBackgroundRemoteNotifications: false`; config introspection has **no `aps-environment` entitlement** and no audio/remote-notification background modes. Stock Expo dev-client config still declares local-network discovery text/Bonjour services; confirm release behavior separately from development builds.

## iOS required-reason API manifest

`ios.privacyManifests` declares no tracking/domains and these APIs:

| API | Reason codes | Observed use |
| --- | --- | --- |
| UserDefaults | `CA92.1` | App-only preferences; Expo Constants/Localization/Notifications/System UI and React Native manifests |
| File timestamp | `C617.1`, `3B52.1`, `0A2A.1` | App-container files, selected files and file metadata; React Native and Expo FileSystem manifests |
| System boot time | `35F9.1` | Elapsed-time/timing measurements in native runtime; no fingerprinting workflow |
| Disk space | `E174.1`, `85F4.1` | File-write/storage capacity checks; Expo FileSystem manifest |

The privacy manifest is not a substitute for App Store privacy labels. No empty `NSPrivacyCollectedDataTypes` declaration was added to imply that account/content uploads do not exist. System-only TLS/OS cryptography is marked `usesNonExemptEncryption: false`; publisher must revisit export-compliance answers if adding non-exempt cryptography.

## Release verification still required

Fill store forms from the final merged app/server and provider contracts; publish policy/deletion URLs; inspect built manifests and permission prompts; test account deletion, local reminder delivery/reboot, camera/photo import/export, sign-out/backup behavior and (if merged) voice permissions. Native builds/devices were explicitly excluded on this shared host.
