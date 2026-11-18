# Guitar Chords

A personal backing-track app: pick a key, build a looping chord progression (extended chords, guitar voicings, strum patterns, any tempo) and solo over it.

- **Web app:** the files at the repo root. They're plain HTML and ES modules with no build step. Run the tests with `node --test`.
- **iPhone app:** `ios/` wraps the web app in a native shell. Every push to `main` builds `GuitarChords.ipa` on GitHub Actions.

## Install on iPhone (Windows, free Apple ID)
1. Open the latest green run under **Actions → build** and download the `GuitarChords-ipa` artifact. Unzip it to get `GuitarChords.ipa`.
2. Install **iTunes** (the apple.com version, not the Microsoft Store one) and **Sideloadly** on the PC.
3. Plug in the iPhone and open Sideloadly. Enter your Apple ID, drop in `GuitarChords.ipa`, and press **Start**.
4. On the iPhone, go to Settings → General → VPN & Device Management, open your Apple ID, and tap **Trust**. On iOS 16 and later, also turn on Settings → Privacy & Security → **Developer Mode** and restart.
5. Free Apple IDs expire sideloaded apps after **7 days**. Re-run Sideloadly, or turn on its automatic refresh.

Design docs: `docs/superpowers/specs/`.
