# Mobile store review checklist

Official policy checked **2026-10-17**. Recheck dated submission requirements before each release. This is a risk checklist, not a rejection-frequency ranking: the sources below establish requirements, not comparable prevalence statistics.

## Highest-risk review failures

| Risk                                    | Requirement and practical check                                                                                                                                                                                                                                                                                                                                                              | Source                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Reviewer cannot sign in                 | Supply working review credentials or an approved full-featured demo, exact server URL, and instructions for account restrictions/2FA. Keep backend and sample documents available throughout review. Test from a clean installation without developer credentials.                                                                                                                           | Apple §2.1; Google app access [1][2]                                            |
| Incomplete, crashing, or unusable app   | Release binary must work on supported devices and OS versions. No placeholder screens or broken URLs. Apple requires adequate native utility beyond a repackaged website. Exercise the actual signed build, not only a development client.                                                                                                                                                   | Apple §§2.1, 4.2; Google functionality [1][3]                                   |
| Missing account deletion                | Apps supporting account creation need a discoverable in-app deletion path; Google also requires an external deletion-request resource linked in Play Console. Deactivation is insufficient. Apple allows a website completion step when the app links directly to the deletion page. Explain legitimate retention. Apple sign-in tokens must be revoked when applicable.                     | Apple §5.1.1(v), deletion guidance; Google deletion [1][4][5]                   |
| AI sends personal data without consent  | Apple explicitly requires disclosure and permission before sharing personal data with third-party AI. Identify the destination provider and actual data sent, including resume, letter, career context, attachments, and voice where applicable. Google requires prominent disclosure and affirmative consent for unexpected sensitive-data processing. Declining must prevent transmission. | Apple §5.1.2(i); Google user data [1][6]                                        |
| AI output cannot be reported            | Google requires in-app reporting/flagging of offensive AI-generated content without leaving the app. Assess every generative assistant/writing surface and ensure a real developer reporting destination and handling process. This does not mean adding a public social feed.                                                                                                               | Google AI-generated content [7]                                                 |
| Privacy declarations disagree with app  | Accessible privacy policy in app and listing; accurate Apple privacy labels and Play Data safety answers covering app, backend, and SDK processing. Describe retention, deletion, providers, and contact details. User-configured servers/providers do not remove disclosure obligations.                                                                                                    | Apple §5.1.1(i), privacy details; Google user data [1][6][8]                    |
| Overbroad permissions                   | Ask in context, use accurate iOS purpose strings, handle denial/revocation gracefully, and request minimum permissions. Prefer system photo/document pickers over broad media access. Inspect merged native manifests: transitive SDK permissions count.                                                                                                                                     | Apple §5.1.1; Google permissions [1][9]                                         |
| Social login lacks compliant equivalent | If primary-account authentication offers third-party/social login, Apple §4.8 requires an equivalent privacy-preserving service unless an exception applies. Sign in with Apple is one implementation. Browser-based OAuth alone does not establish an exception. Test the actual production server configuration.                                                                           | Apple §4.8 [1]                                                                  |
| Payments bypass store rules             | Digital features/content generally require store billing, subject to current regional/program exceptions. Audit upgrade, tip, subscription, donation, website, and account-settings links against the actual business model and storefront. Do not assume all external payment links are prohibited or universally allowed.                                                                  | Apple §3.1; Google payments [1][10]                                             |
| Binary fails submission checks          | Confirm current SDK/toolchain requirements, signing, identifiers, entitlements, bundled SDK privacy manifests/signatures where required, and Android native-library compatibility. TypeScript checks cannot prove these.                                                                                                                                                                     | Apple requirements/SDKs; Google target API; Android page sizes [11][12][13][14] |
| Listing misrepresents app               | Screenshots, description, support/privacy URLs, age/content ratings, declarations, and review notes must reflect shipped features. Do not advertise unfinished workflows or imply unavailable purchases.                                                                                                                                                                                     | Apple §2.3; Google app preparation [1][2]                                       |

## Donation and tip nuance

An external donation link is not automatically a policy violation. Apple §3.2.1(vi) permits approved nonprofit fundraising under specific conditions; §3.2.2(iv) permits other charitable/fundraising collection outside a free app, such as through Safari. Apple §3.2.1(vii) separately permits certain optional person-to-person monetary gifts, with 100% going to the recipient, but requires in-app purchase when the gift is associated with digital content/services. Apple §3.1.1 explicitly allows in-app-purchase tips to the developer. These are distinct cases: an open-source project donation is not automatically approved-nonprofit fundraising or a qualifying person-to-person gift. Removing an optional donation link from an initial iOS release is a conservative scope choice, not proof the link was necessarily prohibited. [1]

## Open release gates from this audit

Consent and reporting implementations now have local boundary coverage. Signed iOS/Android binaries are uploaded and artifact checks passed. Remaining release gates are native installation checks, production deployment and login, reviewer access, store declarations, screenshots, and actual provider safety evaluation. Local checks do not establish these external gates.

## Current binary requirements

- **iOS:** Apple currently requires Xcode 26 or later and iOS 26 SDK or later for uploads (since April 28, 2026). Minimum deployment target and build SDK are different settings. Apple also requires iOS/iPadOS deployment target 13 or later since September 9, 2026; the mobile plan's iOS 17.4 minimum exceeds this. [11]
- **Android:** New apps and updates currently must target Android 16 / API 36 or higher (since August 31, 2026), subject to Google's stated extension process. An older app's continued availability is a different rule from update acceptance. [12]
- **Android native libraries:** Check every packaged `.so`, including Forme, Hermes, and SDK libraries, for 16 KB support and test on a 16 KB device/emulator. The official page currently states that incompatible app updates cannot release starting **February 1, 2027**. Recheck the page and Play Console before submission; do not rely on older deadline summaries. [13]
- **iOS SDK privacy:** Validate the archive's combined privacy report, required-reason API declarations, and applicable third-party SDK signatures/manifests. App privacy labels are a separate declaration. [8][14]

## Pre-submission test pass

Use a dedicated installation with fictional documents and disposable accounts. Account-deletion tests are destructive; never run them with personal or production test fixtures.

### Automatable checks

- Validate resolved application identifiers, version/build numbers, release URLs, permission descriptions, native permission lists, and current target SDK settings.
- Exercise consent gates: fresh install, accept, decline, relaunch, different account, different server/provider, and newly added data scopes. Verify requests are blocked before consent; checking dialog text alone is insufficient.
- Verify authenticated API ownership, session expiry/revocation handling, cancellation, and logout cleanup using existing package tests.
- Check deletion endpoint behavior and storage cleanup with a disposable account, including documents/attachments and provider tokens. Retention exceptions must match policy text.
- Test core workflows with permission denied, offline/network failure, empty content, malformed imports, and large supported documents. Confirm failed saves cannot silently discard edits.
- Run existing typechecks, lint, formatting, focused tests, and release bundle checks. Inspect signed artifact manifests separately from source configuration.

### Manual checks on signed builds

- [ ] Install through TestFlight and Play internal testing; cold-launch without development server or Metro.
- [ ] Sign in through the exact reviewer server/account; cancel browser login; reopen callback; expire session; sign out; sign in as another user.
- [ ] Create/import/edit/save a resume and letter; restart; verify persistence; render PDF; export/share; verify downloaded content.
- [ ] Navigate every visible tab/action; no stubs, dead buttons, inaccessible error states, or broken links.
- [ ] Deny/revoke photos, microphone, notifications, and other requested permissions; core unrelated workflows remain usable.
- [ ] Before AI/voice transmission, verify provider/data disclosure and affirmative consent; decline and confirm no transmission. Verify in-app AI reporting works where policy applies.
- [ ] Trigger offline and interrupted-save cases; reconnect; verify conflict recovery and no data loss.
- [ ] Test keyboard, safe areas, rotation, large text, screen-reader labels/focus, light/dark mode, iPhone/iPad, Android phone/tablet, minimum supported OS, and current OS.
- [ ] Complete deletion from inside app using a disposable account; verify account and associated data are removed. Open external deletion resource without the app installed.
- [ ] Confirm support/privacy/deletion URLs are public, correct, and point to the selected service where relevant.
- [ ] Upload archive/AAB and resolve App Store Connect/Play Console validation warnings, privacy/permission declarations, and pre-launch report failures.

### Store-console checks

- [ ] Reviewer instructions include server URL, credentials, sample content, login steps, and any intentionally unavailable configuration-dependent features. Store credentials only in private review fields.
- [ ] Privacy policy, Apple privacy labels, Play Data safety, account-deletion URL, content ratings, encryption/export declarations, and permission declarations match the binary and backend.
- [ ] Screenshots show the released UI on supported device types. App name, description, URLs, age/content ratings, and support contact are complete.
- [ ] Billing/account links satisfy the applicable storefront/program rules. For a free build, verify no hidden upgrade flow creates an undeclared payment path.
- [ ] Retest reviewer credentials and backend reachability immediately before submitting.

Automated tests reduce avoidable failures; they cannot guarantee review approval. Store-console answers, actual provider contracts/data practices, signed native binaries, and reviewer access need release-owner verification.

## Worktree audit: 2026-10-17

Implemented in this worktree:

- Privacy-policy access from authentication screens and Settings. The existing public URL returned HTTP 200; mobile-specific policy changes are source changes and still need publication.
- Account deletion opens `/dashboard/settings/account?deleteAccount=true`, which displays the existing typed confirmation immediately. Navigation never deletes an account. Browser-session-only authorization stays intact. Deploy the web change with the app; older self-hosted servers may ignore the new query parameter.
- Removed the external Donate row on iOS as a conservative review choice while fundraising eligibility is unverified. This is not a claim that every external donation link is prohibited. Android retains its existing row.
- Expanded privacy-policy source with native storage, server selection, camera, voice-provider processing, local reminders, and deletion instructions.

Regression coverage verifies that direct deletion entry opens confirmation, requires typed confirmation, and cancels without sending a deletion request. It failed before the repair and passed afterward. Existing API tests separately verify browser-session authorization and denial of account deletion through OAuth/API keys.

Additional corrections in this worktree:

- Central API interceptor requires explicit, per-operation consent before AI transmission, including attachments, import, writing, career schedules, and voice. Disclosures identify server/provider and data categories. Declining, aborting, or changing account blocks transmission. Real oRPC-client harness exercises these boundaries.
- Private in-app AI reporting from assistant messages, writing, letters, career notices, and Settings. Reports persist before success is shown; account export includes reports and account deletion removes them by database cascade. Real HTTP/database/browser E2E covers report, export, anonymous denial, cancellation, and confirmed deletion.
- Shared AI safety policy applies to generation prompts. This is not proof of actual model refusal behavior; no live provider evaluation has run.
- Apple-linked deletion attempts token revocation with a bounded timeout. Failure never blocks erasure; deletion dialog explains Apple's manual authorization-removal fallback.
- Forme native prebuilts were published and checksum-pinned. EAS project owner and real Apple app ID are configured.

**Release verification outstanding:** signed TestFlight/Play installation, production Apple login and app links, live policy publication, reviewer credentials, actual provider practices, store declarations, and native accessibility/device gates. Android font/density changes can reset navigation and lose unsent transient forms; the earlier in-place scaling workaround was reverted because it clipped text.

## Production deployment handoff

Owner deploys through existing GitHub Actions → Docker Swarm workflow. Merge server/web changes and migration `20261017135047_clammy_the_enforcers`; normal server startup applies migrations. Publish privacy-policy documentation separately if its hosting does not follow this workflow.

Configure Swarm service environment:

```dotenv
MOBILE_IOS_APP_IDS=654ASRW868.me.rxresu
MOBILE_ANDROID_PACKAGES=me.rxresu
MOBILE_ANDROID_CERT_SHA256=3E:8A:8B:56:BB:3D:B6:55:C6:04:F3:85:99:A8:4B:B0:4F:B7:E1:72:60:0A:95:8C:41:CD:59:D7:04:82:25:81
```

Use Play Console's **app signing certificate**, not merely EAS's upload certificate. Comma-separated supported fingerprints can include the direct-build upload certificate when required. Never include debug certificates on production.

Apple browser sign-in uses approved Services ID `me.rxresu.web` for `APPLE_CLIENT_ID` and a valid Apple client-secret JWT for `APPLE_CLIENT_SECRET`. Protected deployment values are in the owner's local credential directory, outside this repository; current JWT expires 2027-04-15T15:13:47Z. Rotate before expiration. App ID capabilities and App Store Connect upload keys do not supply these. Register production callback `https://rxresu.me/api/auth/callback/apple` against the Services ID and test clean-account login after deployment. Keep secrets in deployment configuration.

Live recheck on 2026-10-17 still returned plain `OK` at both association URLs; production deployment gate remains open.

Post-deploy: `/api/health` must be healthy; `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` must return actual association JSON. Exercise native browser callback, private reporting receipt, account export, and deletion on an explicitly disposable review account. Do not run destructive deployment smoke tests against personal accounts.

## Private AI report review

The same private queue also accepts `source = 'public-resume'` reports from the native shared-resume viewer. Public-resume reports default to the reported URL; operators must inspect the report, restrict abusive public sharing or remove offending content when warranted, and act promptly. Native blocking hides all shared resumes under that public username on the reporting device, scoped to account/server. There is no public social feed or user-to-user chat. Blocking is not a server-wide ban, and a changed public username is a new address. Publish the updated acceptable-use terms and privacy policy before release. A prompt report-review/removal process still needs an actual operator.

Owner confirmed on 2026-10-17 that they will monitor reports daily and promptly act on abusive public sharing or offending content. Use the restricted queue below; there are no email alerts. Triage urgent child-safety/violence reports immediately when noticed, reproduce with fictional data, and correct prompts/providers or disable affected generation when necessary. This commitment does not establish that production reporting is deployed or that a live report has been reviewed.

Use a restricted database session; report contents contain personal data. Do not copy contents into logs, public issues, or analytics. Queue query:

```sql
SELECT id, source, reason, content, note, created_at
FROM ai_content_report
WHERE reviewed_at IS NULL
ORDER BY created_at
LIMIT 100;
```

After actual review, update the selected report with a parameterized statement:

```sql
UPDATE ai_content_report SET reviewed_at = now() WHERE id = $1;
```

`reviewed_at` records review, not deletion. Reports remain private, exportable by their author, and cascade-delete with their account. No automatic email or public feed exists.

## Listing asset gate

`apps/mobile/assets/launch-kit/README.md` explicitly identifies its phone/tablet panels as editable reconstructions. Do not upload those panels as verified screenshots. Capture the actual app at the store's required device dimensions, using fictional accounts/documents, before replacing the screen instances. Existing simulator smoke captures are evidence with their recorded development/release limitations; their presence alone does not close this gate. Icon and feature artwork are branding assets and can be assessed separately.

## Release artifact verification: 2026-10-17

Current iOS build `afe7e122-ebf2-44fa-906d-dbcada3a8b20`, version 1.0.0 (4), includes launch-kit icons/splash and shared-resume reporting/blocking. Deep strict code-signature verification passed; SDK is iOS 27.1, associated domains and team/bundle entitlements match, development Bonjour/local-network strings are absent, and all 14 privacy manifests declare no tracking. SHA-256: `455a1e71eda35aa21e5be644802c61f5ad46ff6d484632b0a3bef1abac1bdbcd`. App Store Connect processed build as VALID and attached it to version 1.0.0 (build resource `dbaa48a2-520f-4109-9756-aa1c1dc036ca`; EAS submission `1e5b261a-4200-4bdf-9ff4-9f9abcbb3a0d`). TestFlight installation remains outstanding.

Current Android build `1bd29d31-4d2c-4bc7-9e3f-2bbe5a5ff061`, version code 5, includes the same branding/safety updates. Bundletool and upload-signature checks passed; targets API 36, minimum API 24, non-debuggable. All 68 packaged 64-bit ELF libraries and all 68 uncompressed library ZIP entries in the generated inspection APK pass 16 KB alignment checks. Inspection APK is locally debug-signed, not Play-signed. AAB SHA-256: `da8a204762e7173d0cc43ee4f58f344ed08c010304bf86aeb96cbc801c8ce4fb`. Uploaded and processed in Play internal-track draft release 1, track `4701728381949252022`; preview reports only missing testers. No internal rollout or store installation yet. Play app signing fingerprint above was read from Play Console's Digital Asset Links JSON on 2026-10-17; it differs from EAS upload identity.

Local source verification: API unit run passed 399 tests; all 71 database-gated integration cases subsequently passed against the dedicated migrated test database (five suites). Auth package passed 33, PDF passed 361, AI passed 7, focused web account tests passed 4, and real report/export/deletion browser E2E passed. These are separate from native runtime verification.

Expo Doctor initially identified missing direct expo-asset peer dependency. Added SDK-compatible expo-asset and config plugin; doctor passes 20/20. Earlier iOS/Android builds are superseded by versions 4/5 above. Local artifacts and machine-readable checks are in `/tmp/rxresu-store-artifacts`, outside source control.

## Store preparation status: 2026-10-17

- All 11 requested Apple/Google listing locales saved and reread: English, Spanish, French, German, Brazilian Portuguese, Simplified Chinese, Japanese, Korean, Hindi, Arabic, and Indonesian. Source: `apps/mobile/store/metadata.json`. Native-language editorial review remains unverified.
- Apple privacy responses published; Content Rights saved with owner affirmation. iOS 13+ override selected. Free pricing and availability in 175 regions on manual release configured. Final screenshots and signed installation remain open; owner confirms private reviewer credentials saved. Apple Silicon Mac/Vision Pro defaults remain enabled; compatibility has not been tested.
- Google icon and all 11 localized feature graphics saved; full listing reload confirmed distinct persisted graphics per locale. Supplied launch ZIP contains 264 listing PNGs; decoding, dimensions, and no-alpha checks passed. Real screenshots pending: archive READMEs identify screen panels as marketing reconstructions. IARC questionnaire completed with user sharing, blocking/reporting and online content disclosed; generated ratings include Everyone/PEGI 3 with Users Interact. Intended target audience remains ages 13+; content rating does not set target audience. No intended violent/sexual/offensive/drug content is supplied by the app. Actual AI-provider safety evaluation remains a release gate.
- Google Advertising ID declaration saved as No, consistent with merged final manifest lacking AD_ID permission. Target audience saved as 13–15, 16–17, and 18+. Sign-in declaration saved by owner; Data safety saved to Publishing overview, not sent for review. Its no-sharing response uses Google exemptions for explicit user-initiated/consented transfers and service providers; validate selected production providers and consent behavior before final submission.
- Owner created reviewer account `reactive-resume-store-review`, email `app-review@rxresu.me`. Browser login succeeded; fictional resume, cover letter and saved job application were created and verified. Owner confirms reviewer credentials saved in both stores' private review fields. Google's audience setup is unlocked, confirming its sign-in declaration completion; Apple save confirmed by owner; credentials were not read or copied. No password belongs in source, chat, screenshots, or public notes.
- Production deployment remains owner's responsibility. Publish server/web/migration, policy changes, association environment and Apple web sign-in configuration before reviewing production behavior.

## Store review notes draft

Use these notes only after production and signed-build verification. Put credentials in the stores' private sign-in fields, never this file.

> Reactive Resume is a free resume and cover-letter builder with job-application tracking and optional AI career tools. Choose the default server, https://rxresu.me, then sign in with the supplied review account. Sample fictional documents are available in Documents. Open a resume to edit, preview, and export PDF using the native renderer. Applications and Career demonstrate tracking and preparation. AI features require a tested provider; data sharing requires explicit consent for each operation. Offensive AI output can be reported inside the app, including Settings → AI → Report AI content. Account deletion is available in Settings → Account and opens the direct browser confirmation page. Do not delete the primary review account; create a separate disposable account to test erasure. No paid digital features or subscriptions are sold in this build.

Intended audience confirmed by owner: ages 13–17 and adults; not under 13. Content ratings must still reflect the questionnaire and actual AI functionality. Support email `amruth@rxresu.me` and review contact Raja Rajan Ashokan, `+4917680468274`, were supplied by owner and entered in store forms.

## Open GitHub bugs reviewed

Live issue sweep on 2026-10-17 found five open bug-labelled reports. Enhancement requests are not silently converted into release requirements.

| Issue                                 | Evidence and release check still needed                                                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #2897 GitHub OAuth cannot create user | Production-specific report with no diagnostic server logs. Current auth unit suite passes 33 tests; clean production social-login round trip remains required and cannot be inferred from tests.                                                          |
| #3275 RTL resumes                     | Owner previously requested confirmation; no reporter confirmation. Existing native parity reports cover all 17 templates plus free-form, but exact Arabic/Hebrew/Persian fixture must be checked in final signed build before declaring this issue fixed. |
| #3147 sidebar keyword clipping        | Prior maintainer reconstruction could not reproduce; exact sanitized resume/font/style fixture still missing. Leave issue open; exercise wrapped skills in narrow sidebar in release export.                                                              |
| #2812 Onyx profile header placement   | Historical screenshot-only report, no fixture. Verify current Onyx profile/header in final renderer; do not assume every layout difference is clipping.                                                                                                   |
| #2794 square image preview cropping   | Prior production investigation matched 72 controlled preview/PDF comparisons, but original image/resume missing. Leave issue open; include square-image edge-marker check in final preview/export pass.                                                   |

These are triage results, not claims that all five reports are fixed. No issue was closed or commented on during this sweep.

## Official sources

1. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — §§2.1, 2.3, 3.1, 4.2, 4.8, 5.1.1, 5.1.2.
2. [Google: Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
3. [Google: Functionality, content, and user experience](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en).
4. [Apple: Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
5. [Google: Understanding account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
6. [Google: User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
7. [Google: AI-Generated Content](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en).
8. [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/).
9. [Google: Permissions and APIs that Access Sensitive Information](https://support.google.com/googleplay/android-developer/answer/9888170?hl=en).
10. [Google: Payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).
11. [Apple: Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/).
12. [Google: Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).
13. [Android: Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes).
14. [Apple: Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/).
