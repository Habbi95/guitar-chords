# Guitar Chords – Music Generator: v1 Design

Date: 2026-11-18
Status: revised for web platform, awaiting approval

## Intent and why

A free, personal app that plays a looping guitar chord progression in any key, extended chords included, so the owner can solo over it on guitar. Existing App Store apps that do this are paid. It is for one person's practice.

**Platform change:** the owner has a Windows PC and an iPhone, and no Mac. A native iOS app can't be built and installed without one (except through cloud builds plus sideloading that expires every 7 days). So v1 is a **web app**, made to be used on the iPhone: opened in Safari and added to the Home Screen *(owner)*.

## Goals (v1)

- Pick a **key**. The app offers that key's diatonic chords, extended chords included. A free root + quality pick is available as a fallback.
- Build a progression of **any number of bars**, one chord per bar. The whole thing loops.
- Each bar **holds its chord and strums it** with a rhythmic pattern.
- **Strum patterns**: a row of steps. Grids are **8ths (8 steps/bar), 16ths (16), 8th-note triplets (12), sextuplets (24)**. **Presets** include at least *Funky* and *Country*, and users can edit them or make their own.
- **Tempo** is set in BPM.
- The sound is **synthesized plucked strings**, with no samples.
- **It works well on an iPhone**: touch-sized controls, portrait layout, it plays with the silent switch on, it launches from the Home Screen, and it works offline after the first visit.

## Non-goals (v1)

- A native iOS app or App Store distribution.
- Sampled or recorded guitar sound.
- Recording, exporting or sharing audio.
- Time signatures other than 4/4. Mixing grids inside one bar.
- Playing while the phone is locked or the app is in the background (iOS web apps can't do this reliably).
- Accounts, sync, or a desktop-specific layout (it should still work in a desktop browser).

## Anti-goals

- Timing drifts, or there are audible clicks or gaps at loop or bar boundaries.
- Ads, paywalls, sign-up, or tracking.
- Extended chords sound like piano clusters and not like guitar voicings.
- It is fiddly on a phone: tiny targets, zooming, or accidental scrolling while tapping steps.

## Constraints

- It runs in **Safari on iOS 17+** and current desktop browsers.
- **Plain HTML, CSS and JavaScript (ES modules), with no build step and no third-party runtime dependencies** *(my call: nothing to install, works offline, easy to host)*. Types are documented with JSDoc.
- Synthesis uses Karplus-Strong plucked strings, and audio uses the **Web Audio API**.
- Hosting is a free static host. I'll use **Vercel**, since it's already connected, which gives a real HTTPS URL to open on the phone *(my call)*.

## Approaches considered

**Platform**

| | Platform | Trade-off |
|---|---|---|
| **Web app (chosen by owner)** | Safari on iPhone, added to the Home Screen | Free, no Mac, instant updates, and Claude can build and test it in its cloud workspace. It can't play in the background or with the phone locked. |
| Native via cloud build | GitHub macOS runner + Sideloadly from Windows | A true native app, but it expires every 7 days, a free Apple ID allows 3 apps, and there's no simulator or debugger, so the iteration loop is slow. |

**Audio architecture** (the owner picked **B** earlier; it translates directly to the web)

| | Approach | Trade-off |
|---|---|---|
| A | Live synthesis in an `AudioWorklet` | Most flexible, but real-time code is hard to test, and Safari worklet quirks are a risk. |
| **B (chosen)** | Pre-render each strike to an `AudioBuffer` and play it with a one-shot `AudioBufferSourceNode.start(when)` at an exact `AudioContext` time, using a lookahead scheduler | Synthesis is a pure, testable function. Web Audio's sample-accurate `start(when)` is built for this. There's a short render cost on new chords, hidden by rendering ahead. |
| C | A sample-based soundfont player | Needs samples, which were ruled out. |

## Decided by the owner

- Synthesized sound. Hold the chord for the bar, strummed with patterns. Funky and Country presets.
- Any number of bars, the whole progression repeating. Tempo in BPM.
- Grids: 8ths, 16ths, triplets, sextuplets.
- Key-based chord selection. Architecture B.
- Strokes: down, up, muted scratch, bass note, rest, plus a per-step accent. A rest lets the chord ring.
- Changing the key transposes the bars picked from the key. Free-pick chords stay fixed.
- In minor keys, degree V offers both the natural-minor v chord and the dominant V7.
- A web app that must be usable on the iPhone.

## Design

### 1. Music theory engine (pure JS module, no DOM/audio)

- Spelled pitches (letter + accidental), keys (tonic + mode). v1 modes: **major and natural minor** *(my call)*.
- Diatonic chords per degree, stacked in thirds, at extension levels triad, 7, 9, 11, 13 *(my call)*. Free-pick qualities: major, m, dim, aug, sus2, sus4, add9, 6, m6, 7, maj7, m7, m7b5, dim7, 7sus4, 9, maj9, m9, m11, 13, maj13, m13 *(my call)*.
- **Minor keys, degree V:** both the natural chord (Em7 in A minor) and the harmonic-minor dominant (E7, E7b9…) *(owner)*.
- **Natural 11 against a major 3rd:** raised to #11 on major-7th chords, dropped on dominants *(my call)*.
- **Chord reference in a bar:** either `degree(degree, variant, extension)`, which transposes with the key *(owner)*, or `fixed(root, quality)`, which never moves *(owner)*.
- No slash chords or inversions. The root is always the lowest note *(my call)*.
- Naming (e.g. `Am9`, `Bm7b5`, `Cmaj9#11`) with correct sharps or flats for the key.
- **Guitar voicing:** 6 strings in standard tuning (EADGBE). A fretted span ≤ 4 frets, the root on the lowest sounding string, the 3rd, 7th and top extension kept, the 5th dropped first. It is deterministic *(my call; the builder tunes the scoring)*.

### 2. Rhythm model

- `Grid`: eighths 8, sixteenths 16, triplets 12, sextuplets 24 steps per bar.
- `Step` = stroke + accent. Strokes:
  - `down` / `up`: full strums.
  - `mute`: a percussive "chk" that cuts any ringing.
  - `bass`: the root on the lowest voiced string.
  - `rest`: the previous strike keeps ringing *(owner)*.
- An accent is +6 dB *(my call)*.
- Presets include *Funky* (16ths, mutes and accents), *Country* (8ths, bass on beats 1 and 3, strums between), straight 8ths, and a triplet shuffle.
- Each bar holds **its own copy** of a pattern. **"Save as my pattern"** adds it to a named user library *(my call)*.
- `Progression`: key, BPM (40–240) and bars *(my call)*. Every edit made during playback takes effect from the **next bar**.

### 3. Synthesis (pure JS, returns `Float32Array`)

- Karplus-Strong pluck per string, deterministic (seeded noise).
- Down strokes play low→high. Up strokes play high→low, slightly quieter, top 4 strings. Mute is a heavily damped pluck plus a noise burst. Bass is one string.
- The strum spread is 15 ms between strings, independent of tempo.
- **Ringing:** a strike rings until the next non-rest strike, across bar lines too, capped at 2 s. Each buffer is rendered already trimmed to that length with a 5 ms fade-out *(my call)*. Strings that would start after the end of the buffer are skipped.
- The cache key is (voicing, stroke, accent, ring length). The next bar's strikes are rendered ahead of time.

### 4. Playback (Web Audio)

- One `AudioContext` → master `GainNode` (a light limiter/compressor to avoid clipping on overlaps) → destination.
- Each strike becomes an `AudioBuffer` played by a new `AudioBufferSourceNode` started at `barStartTime + stepOffset`. Overlapping strikes are natural, so no node pool is needed.
- **Timing:** the bar length and step offsets are computed in integer sample frames from a fixed start, then converted to seconds once. Grids that don't divide evenly round per step from the absolute bar start.
- **Scheduler:** a `setInterval` of 25 ms schedules whole bars once they are within `max(half a bar, 200 ms)` of starting. It wraps to bar 0, and edits apply from the next unscheduled bar.
- **iOS specifics:**
  - The `AudioContext` is created or resumed inside the Play tap, since iOS requires a user gesture.
  - `navigator.audioSession.type = "playback"` where available, so audio plays with the silent switch on.
  - The **Screen Wake Lock** keeps the screen on while playing, where supported.
  - On `visibilitychange` to hidden, playback stops cleanly. On return, the user taps Play again.
  - If the context is interrupted (e.g. by a phone call), playback stops.
- Transport: Play / Stop.

### 5. UI (mobile-first HTML/CSS)

```
┌──────────────────────────────┐
│ A minor ▾      ‹ 96 BPM ›  ▶ │  sticky header
├──────────────────────────────┤
│ 1  Am9    16ths ↓·✕↑ ↓·✕↑ …  │  playing bar highlighted
│ 2  Dm11   16ths …            │
│ 3  E7     8ths  B·↓↑ B·↓↑    │
│ [ + Add bar ]                │
└──────────────────────────────┘
```

- Portrait phone layout. Touch targets ≥ 44 px. No double-tap zoom on controls (`touch-action: manipulation`). Respects the safe areas (notch, home bar). Dark theme by default *(my call)*.
- Tapping a bar opens a bottom sheet with two tabs, **Chord** and **Rhythm**:
  - **Chord, "In key":** 7 degree buttons (`ii Bm7b5`), an extension selector, and the extra `V E7` button in minor keys. **Chord, "Free":** a root and quality grid.
  - **Rhythm:** a preset / my-pattern / blank-grid selector. A step row where tapping cycles ↓ → ↑ → ✕ → B → ·, and a long-press toggles accent. Beats are marked visually. 24-step grids scroll horizontally. It also has "Save as my pattern" and "Apply to all bars".
- Bars can be added, deleted, duplicated and reordered (move up / down buttons, since drag on touch is my call to skip).
- The playing bar and step are highlighted.
- **Home Screen app:** a web manifest (name, icons, `display: standalone`, portrait), Apple touch icon and status-bar meta tags, and a **service worker** that caches all files so it opens offline.

### 6. Persistence

- `localStorage` holds the last progression and the "my patterns" library. It falls back to defaults if the data is missing or corrupt *(my call)*.
- Note: iOS keeps Home Screen web app storage separate from Safari's, so it's best to always use the Home Screen icon.

## Testing

- Pure modules (theory, voicer, rhythm, timing, synthesis, cursor, storage) are tested with `node --test`, using the cases listed in the plan. They run in Claude's workspace.
- Browser smoke test: the page loads without console errors, and an offline render of one bar produces non-silent audio (run in a desktop browser).
- Manual on the iPhone:
  - Add to the Home Screen, play a 4-bar loop at 60, 180 and 240 BPM for a few minutes, and check for clicks and drift.
  - With the silent switch on, it still plays.
  - Lock or switch apps, and it stops cleanly. Tap Play again, and it resumes.
  - In airplane mode, it still opens.

## Left to the builder

- File and module layout, exact preset contents, Karplus-Strong tuning, the voicing scoring, icons and visual styling.
