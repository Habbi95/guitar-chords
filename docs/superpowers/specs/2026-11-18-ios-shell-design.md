# Guitar Chords — iOS sideload shell (design)

Date: 2026-11-18 · Status: approved by owner ("Go")

## Intent
Run the finished web app as a real iPhone app, installed from Windows with Sideloadly and a free Apple ID (re-signed every 7 days). No App Store, so no App Review.

## Approaches
- **Chosen: native WKWebView shell** that bundles the web app's files. Smallest change, and it reuses all tested code. Native extras: the screen never auto-locks while the app is open, it plays with the silent switch on, and it has its own app icon.
- Full Swift rewrite: rejected for now. Its only extra is playback with the phone locked, which the owner didn't ask for.
- Capacitor or similar: rejected. Same result with more tooling.

## Design
- Repo `Habbi95/guitar-chords` holds the web app at the root plus `ios/`.
- `ios/WebShellKit`: a Swift package with Foundation only. `WebFiles` maps `app://localhost/<path>` to a bundled file and MIME type, and refuses path traversal. Tested with `swift test` on GitHub's Linux runner.
- `ios/App`: a SwiftUI app.
  - **Web view:** shows a `WKWebView` that loads `app://localhost/index.html` through a `WKURLSchemeHandler`. Plain `file://` URLs can't load ES modules, and the custom scheme keeps one stable origin, so localStorage persists. Inline playback is on, with no user action needed for media. The web view ignores safe areas so the CSS `env()` insets apply.
  - **Prompts:** a `WKUIDelegate` implements JS `prompt()` with a native alert. Without it, prompt returns null and the tempo and pattern-name boxes break.
  - **Silent switch:** the audio session is set to `.playback`.
  - **Screen:** `isIdleTimerDisabled = true` while the app is active.
  - **Project file:** generated with XcodeGen (`ios/project.yml`). Bundle id `com.habbi95.guitarchords`, iOS 17+, iPhone, portrait, display name "Chords", a 1024 px AppIcon.
- CI (`.github/workflows/build.yml`, runs on every push):
  - `node --test` on ubuntu.
  - `swift test` for WebShellKit on ubuntu.
  - On macOS:
    - copy the web files into `ios/web`
    - run `xcodegen`
    - run `xcodebuild` (Release, iphoneos, with `CODE_SIGNING_ALLOWED=NO`)
    - zip `Payload/GuitarChords.app` into `GuitarChords.ipa`
    - upload it as an artifact
- Owner: download the artifact, then sign and install it with Sideloadly.

## Left to the builder
Exact MIME table, alert wording, CI caching.
