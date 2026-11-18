# Guitar Chords v1 (Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app, installable on the iPhone Home Screen, that loops a key-based, strummed chord progression with synthesized plucked strings for soloing over.

**Architecture:** Pure ES modules (`js/theory`, `js/rhythm`, `js/playback`, `js/synth`, `js/store.js`) hold all the music logic, with no DOM or Web Audio, and `node --test` tests them. A thin browser layer (`js/audio`) turns rendered `Float32Array`s into `AudioBuffer`s and starts them at exact `AudioContext` times from a lookahead scheduler. `js/ui` is plain DOM rendering. A manifest and service worker make it a Home Screen app that works offline. It's hosted as static files on Vercel.

**Tech Stack:** HTML, CSS, JavaScript ES2022 modules with JSDoc types, Web Audio API, Node 22 `node:test` + `node:assert/strict`, Vercel static hosting. No build step and no npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-guitar-chords-design.md`

## Global Constraints

- Targets Safari on iOS 17+ and current desktop browsers. No build step, no third-party runtime code, no network requests other than its own files.
- Only 4/4. BPM is clamped to **40–240**.
- Grids and their steps per bar: eighths **8**, sixteenths **16**, triplets **12**, sextuplets **24**.
- Standard tuning MIDI **[40, 45, 50, 55, 59, 64]**, where string index 0 is low E.
- Voicing: fretted span (max − min of frets > 0) **≤ 3**, the root is the lowest sounding note, ≥ 3 notes, deterministic.
- Strum spread **15 ms**. Ring capped at **2.0 s**. Fade-out **5 ms**. Accent **×2 amplitude (+6 dB)**. Up strokes **×0.8**, top 4 strings only.
- Lookahead `max(barSeconds / 2, 0.2 s)`, scheduler tick **25 ms**. Edits apply from the next unscheduled bar.
- Touch targets ≥ **44 px**, `touch-action: manipulation`, safe-area insets, dark theme.
- All persisted data goes under the single `localStorage` key **`guitarChords.v1`**.
- All data objects are plain JSON-serialisable objects (no classes) so that storage round-trips exactly.
- Commit after every task. Messages end with the session's attribution lines.

## Review Focus

1. **Fast tempo with a dense grid.** At 240 BPM with sextuplets a step lasts ~42 ms, shorter than a 6-string strum. A strike must still start on time, and its strings that would start after the end of the buffer are skipped. Test in Task 6.
2. **All-rest and empty progressions.** The ring search terminates. Play is disabled with 0 bars, and the cursor returns `null`. Tests in Tasks 5 and 7.
3. **Bars deleted during playback.** The next index wraps to 0. Test in Task 7.
4. **Dominant-V bar after switching to a major key.** The variant is ignored outside minor-key degree 5. Spelling stays correct in F# major and Eb minor. Tests in Task 2.
5. **Corrupt or old `localStorage` data.** It falls back to defaults and never crashes on load. Test in Task 8.

---

## File Structure

```
index.html                 app shell, meta tags (viewport-fit=cover, apple-mobile-web-app-*), loads js/main.js
manifest.webmanifest       name, short_name "Chords", display standalone, orientation portrait, icons
sw.js                      cache-first service worker, versioned cache name
icons/icon-192.png, icon-512.png, apple-touch-icon.png (180)
css/app.css
package.json               {"type":"module","scripts":{"test":"node --test"}}
vercel.json                Cache-Control: no-cache for sw.js and index.html
js/theory/pitch.js         spelled pitches
js/theory/key.js           keys, scales
js/theory/chord.js         chords, naming, diatonic generation, qualities, chord refs
js/theory/voicer.js        guitar voicings
js/rhythm/pattern.js       grids, strokes, patterns, notation parser
js/rhythm/presets.js
js/rhythm/progression.js   bars, progression, defaults
js/playback/timing.js      bar/step frames, strike planner with ring lengths
js/playback/cursor.js      playback cursor, playhead tracker
js/synth/karplus.js
js/synth/renderer.js       strum renderer, render cache
js/store.js                load/save with fallback
js/audio/engine.js         AudioContext, iOS session, wake lock, scheduling buffers   (browser only)
js/audio/transport.js      lookahead loop                                              (browser only)
js/ui/*.js                 header, bar list, bar sheet (chord + rhythm tabs)          (browser only)
js/main.js                 wires state, transport, ui, persistence, SW registration
test/*.test.js             one per pure module
tools/make-icons.py        writes the PNG icons (stdlib zlib only)
```

Run all tests with `node --test` from the repo root.

---

### Task 1: Scaffold, pitches and keys

**Files:** Create `package.json`, `.gitignore` (`node_modules/`, `.vercel/`), `js/theory/pitch.js`, `js/theory/key.js`, and `test/key.test.js`.

**Interfaces (produces):**
- `pitch.js`:
  - `LETTERS = ['C','D','E','F','G','A','B']`
  - `parsePitch(name: string) → {letter, acc}`, which accepts "C#", "Bb", "Ebb" (acc between −2 and 2)
  - `pitchClass(p) → 0..11`
  - `pitchName(p) → string`
- `key.js`:
  - `makeKey(tonicName: string, mode: 'major'|'minor') → {tonic, mode}`
  - `scale(key) → Pitch[7]`
  - `keyName(key) → "A minor"`
  - `ALL_TONICS = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']`

- [ ] **Step 1:** `git init`, then commit `docs/`.
- [ ] **Step 2: Failing tests:**
  - C major gives `C D E F G A B`.
  - F# major gives `F# G# A# B C# D# E#`.
  - Eb minor gives `Eb F Gb Ab Bb Cb Db`.
  - A minor gives `A B C D E F G`.
  - For every `ALL_TONICS` × mode, the 7 letters are distinct.
  - `pitchClass(parsePitch('Cb')) === 11`.
- [ ] **Step 3:** Run `node --test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement. A scale walks the letters from the tonic using the major steps `[2,2,1,2,2,2,1]` or the minor steps `[2,1,2,2,1,2,2]`. Each note's accidental is (target pitch class − natural pitch class), normalised to −6..5.
- [ ] **Step 5:** Run `node --test`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(theory): pitches, keys, scale spelling`.

### Task 2: Chords, naming, diatonic generation, chord refs

**Files:** Create `js/theory/chord.js` and `test/chord.test.js`.

**Interfaces:**
- Consumes `parsePitch`, `pitchName`, `pitchClass`, `scale`, `makeKey`.
- Produces:
  - `EXTENSIONS = [3,7,9,11,13]`
  - Chord objects of the form `{root: Pitch, intervals: number[] /* sorted, unique, includes 0 */}`
  - `chordSymbol(chord) → string`
  - `chordName(chord) → string`
  - `chordPitchClasses(chord) → Set<number>`
  - `chordRoles(chord) → {third: number|null, seventh: number|null, topExtension: number|null}`
  - `diatonicChord(key, degree /*1..7*/, ext, variant /*'natural'|'dominant'*/) → Chord`
  - `QUALITIES` is an ordered array of `{id, symbol, intervals}` with ids `major, minor, dim, aug, sus2, sus4, add9, six, minor6, dom7, maj7, min7, min7b5, dim7, sevenSus4, dom9, maj9, min9, min11, dom13, maj13, min13`
  - `qualityChord(rootName, qualityId) → Chord`
  - A chord ref is `{kind:'degree', degree, variant, ext}` or `{kind:'fixed', root: string, quality: string}`
  - `resolveRef(ref, key) → Chord`

- [ ] **Step 1: Failing tests** (`assert.equal(chordName(...), ...)`):
  - C major:
    - deg 1: triad `C`, 7 `Cmaj7`, 9 `Cmaj9`, 11 `Cmaj9#11`, 13 `Cmaj13#11`
    - deg 2: 9 `Dm9`, 11 `Dm11`, 13 `Dm13`
    - deg 3: 9 `Em7b9`
    - deg 5: 7 `G7`, 9 `G9`, 11 `G9`, 13 `G13`
    - deg 7: 7 `Bm7b5`
  - A minor:
    - deg 1 at 9 gives `Am9`
    - deg 5 natural at 7 gives `Em7`
    - deg 5 dominant gives 7 `E7`, 9 `E7b9`, triad `E`
  - Dominant variant ignored: C major deg 5, and A minor deg 4, give equal chords for `'dominant'` and `'natural'`.
  - Spelling: Bb major deg 4 at 7 gives `Ebmaj7`. F# major deg 7 at 7 gives `E#m7b5`.
  - Free pick on A: `min9` → `Am9`, `sevenSus4` → `A7sus4`, `min7b5` → `Am7b5`, `six` → `A6`, `add9` → `Aadd9`.
  - Refs:
    - `{degree 2, natural, 9}` gives `Dm9` in C major and `Am9` in G major.
    - `{degree 2, natural, 7}` in A minor gives `Bm7b5`.
    - `{fixed D min9}` gives `Dm9` in any key.
    - `JSON.parse(JSON.stringify(ref))` resolves to the same chord.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - **Stacking:** use scale offsets 0, 2, 4, 6, 8, 10, 12, as many as the extension needs. For a minor key at degree 5 with `'dominant'`, raise scale degree 7 by a semitone first.
  - **11 rule:** if the chord has a major 3rd and interval 17, use 18 when the 7th is 11, or drop it when the 7th is 10.
  - **Symbol:** the base comes from (3rd, 5th, 7th):
    - (4,7,–) `""`
    - (3,7,–) `m`
    - (3,6,–) `dim`
    - (4,8,–) `aug`
    - (4,7,11) `maj7`
    - (4,7,10) `7`
    - (3,7,10) `m7`
    - (3,6,10) `m7b5`
    - (3,6,9) `dim7`
    - (3,7,11) `m(maj7)`

    Natural 9/11/13 (14/17/21) replace the 7 with the highest number when every lower natural extension is present. A 13 without an 11 is still `13`. Altered tones b9 13, #9 15, #11 18 and b13 20 are appended in ascending order. `QUALITIES` symbols are fixed strings.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(theory): chords, naming, diatonic generation, refs`.

### Task 3: Guitar voicer

**Files:** Create `js/theory/voicer.js` and `test/voicer.test.js`.

**Interfaces:**
- Consumes the chord functions.
- Produces:
  - `TUNING = [40,45,50,55,59,64]`
  - `voice(chord) → {frets: (number|null)[6]}`, memoised by `chordName` + intervals
  - `voicingMidi(v) → (number|null)[6]`
  - `soundingStrings(v) → number[]`, in ascending order

- [ ] **Step 1: Failing tests.** Run them over every chord from `ALL_TONICS` × 2 modes × degrees 1–7 × `EXTENSIONS` × 2 variants, plus every quality on C, F# and Bb:
  - fretted span ≤ 3
  - the lowest sounding note's pitch class equals the root's
  - only chord tones sound
  - the 3rd, 7th and topExtension are present when the chord has them
  - at least 3 notes
  - deterministic (`deepEqual` across two calls)
  - C major's max fret ≤ 3
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the search.
  - **Bass string:** string b ∈ {0,1,2} carries the root at fret 0..12.
  - **Fret windows:** use `[w, w+3]` for w from max(1, bassFret−3) to max(1, bassFret). Open strings are always allowed.
  - **Higher strings:** each string is either muted, open, or fretted inside the window on a chord tone.
  - **Muting:** strings below b are muted. Allow at most one muted string between sounding strings.
  - **Requirement:** a voicing must contain the root, 3rd, 7th and topExtension.
  - **Score (lowest wins):**
    - +3 per extra root
    - +2 if it has the 5th and the chord has ≥ 5 tones
    - +1 per muted interior string
    - +0.2 × w
    - −0.5 per distinct chord tone

    Ties go to the lexicographic order of `frets`, with null sorting as −1.
  - **Fallback:** if nothing qualifies, drop topExtension from the requirement. The test records fallbacks and requires 0 of them for diatonic chords.
- [ ] **Step 4:** Run. Expected: PASS. Tune the weights if needed.
- [ ] **Step 5:** Commit `feat(theory): deterministic guitar voicer`.

### Task 4: Rhythm model, presets, progression

**Files:** Create `js/rhythm/pattern.js`, `js/rhythm/presets.js`, `js/rhythm/progression.js`, and `test/rhythm.test.js`.

**Interfaces:**
- `pattern.js`:
  - `GRIDS = {eighths: 8, sixteenths: 16, triplets: 12, sextuplets: 24}`
  - `GRID_LABELS`
  - `STROKES = ['down','up','mute','bass','rest']`
  - `nextStroke(s)`, which cycles in that order
  - `GLYPH = {down:'↓', up:'↑', mute:'✕', bass:'B', rest:'·'}`
  - Steps are `{stroke, accent}`. A pattern is `{id, name, grid, steps}`.
  - `parsePattern(name, grid, notation, id?) → Pattern`. The notation uses `D U X B .`, and a `>` prefix accents the next step. It throws if the count ≠ the grid's steps.
  - `blankPattern(grid)`: step 0 is a down, the rest are rests.
  - `copyPattern(p, name?)`, which gives a new id via `crypto.randomUUID()`
- `presets.js`: `PRESETS`, an array with fixed ids `preset-funky`, `preset-country`, `preset-straight8`, `preset-shuffle`.
- `progression.js`:
  - `clampBpm(n)`
  - `makeBar(ref, pattern) → {id, chord: ref, pattern: copy}`
  - `defaultProgression() → {key: makeKey('A','minor'), bpm: 96, bars: [i9, iv9, V7 (dominant), i9] with straight 8ths}`

- [ ] **Step 1: Failing tests:**
  - the grid step counts
  - the stroke cycle
  - `parsePattern('t','eighths','>D.DU.UDU')` gives step 0 = {down, true}, step 1 = rest, length 8
  - a wrong count throws
  - every preset's length matches its grid
  - Funky is sixteenths with ≥ 1 mute and ≥ 1 accent
  - Country is eighths with bass on steps 0 and 4
  - Shuffle is triplets
  - `clampBpm(10) === 40`, `clampBpm(300) === 240`
  - copying gives a new id
  - `makeBar` copies, so mutating the source doesn't change the bar
  - the default progression survives a JSON round-trip with `deepEqual`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The presets:
  - Funky: `>D.XU.UX>D.XUDXU.U`
  - Country: `B.DUB.DU`
  - Straight 8ths: `DDDDDDDD`
  - Shuffle: `D.UD.UD.UD.U`
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(rhythm): patterns, presets, progression`.

### Task 5: Timing and strike planning

**Files:** Create `js/playback/timing.js` and `test/timing.test.js`.

**Interfaces:**
- Consumes the voicer, `resolveRef` and `GRIDS`.
- Produces:
  - `barFrames(bpm, sr) → Math.round(240 / bpm * sr)`
  - `stepOffset(step, steps, barFr) → Math.floor(step * barFr / steps)`
  - `MAX_RING_SECONDS = 2`
  - `planBar(index, progression, sr) → Strike[]`, where a Strike is `{barIndex, stepIndex, offset /* frames */, stroke /* never rest */, accent, voicing, ring /* frames */}`

- [ ] **Step 1: Failing tests** (sr 48000):
  - `barFrames(120)` is 96000 and `barFrames(96)` is 120000.
  - For every grid at 97 BPM, `stepOffset(steps, steps)` equals barFrames, and the offsets strictly increase.
  - `D...D...` at 120 BPM gives 2 strikes, each ringing 48000.
  - A single bar `D.......` gives ring 96000 at 120 BPM, and the cap of 96000 at 60 BPM.
  - `DX......` gives a first ring of 1 step (12000).
  - A progression with every bar all rests gives `[]`.
  - One strike surrounded by all-rest bars gives ring = cap and finishes in < 50 ms.
  - No strike is a rest.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. To find a ring, walk forward from the strike through this bar and then the following bars (modulo count, each bar's own grid, all at the current BPM). Stop at the first non-rest step or when the distance ≥ the cap.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(playback): sample-exact timing, ring planning`.

### Task 6: Synthesis and render cache

**Files:** Create `js/synth/karplus.js`, `js/synth/renderer.js`, and `test/synth.test.js`.

**Interfaces:**
- `karplus.js`: `pluck({freq, sr, frames, amp, damping, seed}) → Float32Array`. It uses seeded noise from a mulberry32 PRNG, a delay line of round(sr / freq), and a two-point average × damping.
- `renderer.js`:
  - `SPREAD = 0.015`, `FADE = 0.005`
  - `onsets(strike, sr) → {string, frame}[]`
  - `renderStrike(strike, sr) → Float32Array(strike.ring)`
  - `strikeKey(strike) → string`, built from the frets, stroke, accent and ring
  - `class RenderCache { constructor(sr); get(strike) → Float32Array; size }`

- [ ] **Step 1: Failing tests** (sr 48000, a C-major voicing):
  - the length equals the ring for each stroke
  - RMS > 0.01, every sample is finite, and |x| ≤ 1
  - the last sample is 0, and the mean |x| over the last 5 ms is less than over the 5 ms before it
  - a down strike starts at the lowest sounding string at frame 0, with each next string 720 frames later
  - an up strike goes in descending order, with ≤ 4 strings
  - a bass strike is exactly 1 onset, on the lowest sounding string
  - mute: energy after 60 ms is < 5% of the first 60 ms
  - peak(accent) / peak(normal) is in [1.8, 2.2]
  - ring 2000 gives only onsets with frame < 2000, and a length of 2000 (Review Focus 1)
  - getting the same strike twice from the cache returns the same array object, and size is 1
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - Each string is a pluck at 440·2^((midi−69)/12), mixed in at its onset, with damping 0.996.
  - A mute uses damping 0.90 plus a 20 ms decaying noise burst.
  - An up strike is ×0.8.
  - Normalise the peak to 0.35, or 0.70 when accented, then apply a linear fade over the last 5 ms.
  - The seed is the string index.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(synth): Karplus-Strong strum renderer and cache`.

### Task 7: Playback cursor and playhead

**Files:** Create `js/playback/cursor.js` and `test/cursor.test.js`.

**Interfaces:**
- `class PlaybackCursor`:
  - `constructor(startFrame)`
  - `nextIndex`, `nextStart`
  - `lookahead(barFr, sr) → max(barFr / 2, 0.2 * sr)`
  - `isDue(nowFrame, progression, sr) → boolean`
  - `take(progression, sr) → {barIndex, start, barFrames} | null`
- `class PlayheadTracker`:
  - `record(barIndex, start, barFrames, steps)`, which keeps the last 4
  - `position(frame) → {bar, step} | null`
  - `reset()`

- [ ] **Step 1: Failing tests:**
  - With 3 bars, the indices go 0, 1, 2, 0 and the starts accumulate.
  - Take a bar at 120 BPM, set bpm to 60, and take again: the start is 96000 and barFrames is 192000.
  - Take bars 0 and 1 of 3, remove 2 bars, and the next take gives index 0.
  - An empty progression gives `null`.
  - With nextStart 96000 at 120 BPM, `isDue(47999)` is false and `isDue(48000)` is true.
  - A 16-step bar recorded at 0 with 96000 frames gives (0,1) at frame 6000, and `null` at −1.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. `take` reads the BPM at call time. An index ≥ count wraps to 0.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(playback): cursor and playhead`.

### Task 8: Persistence

**Files:** Create `js/store.js` and `test/store.test.js`.

**Interfaces:**
- `STORAGE_KEY = 'guitarChords.v1'`
- `defaultState() → {version: 1, progression, myPatterns: []}`
- `loadState(storage) → State`, where storage is anything with `getItem`/`setItem` (the tests use a Map-backed fake)
- `saveState(storage, state)`

- [ ] **Step 1: Failing tests:**
  - a round-trip
  - a missing key gives the defaults
  - the value `"{not json"` gives the defaults
  - valid JSON with the wrong shape (no `progression.bars` array, or a bar pattern whose length ≠ its grid) gives the defaults
  - `getItem` throwing gives the defaults
  - myPatterns persist
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with a shape validator: version === 1, the key's tonic parses, every bar's pattern has a valid grid and length, and every ref is valid.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: localStorage persistence with safe fallback`.

### Task 9: Audio engine, transport, playable shell

**Files:** Create `index.html`, `css/app.css` (base), `js/audio/engine.js`, `js/audio/transport.js`, and `js/main.js` (minimal: Play/Stop and BPM ‹ › on the default progression).

**Interfaces:**
- `class AudioEngine`:
  - `async unlock()`, called inside a tap: creates or resumes the `AudioContext`, sets `navigator.audioSession.type = 'playback'` if present, and plays a 1-frame silent buffer
  - `get sampleRate()`, `nowFrame()`
  - `schedule(samples: Float32Array, frame)`: builds an `AudioBuffer`, then `src.start(frame / sr)` into a master gain of 0.9 and a `DynamicsCompressorNode` (threshold −6, ratio 4)
  - `stopAll()`, which stops the tracked sources and clears them on `ended`
  - `async requestWakeLock()`, `releaseWakeLock()`
  - `onInterrupt` callback, fired on `ctx.onstatechange` to `'interrupted'`/`'suspended'` while playing
- `class Transport`:
  - `constructor(engine, getProgression, onPlayhead)`
  - `async play()`: does nothing when there are 0 bars. Otherwise it calls unlock, `cursor = new PlaybackCursor(nowFrame + 0.1·sr)`, and `setInterval(tick, 25)`.
  - `tick()`: while `isDue`, it takes a bar, runs `planBar`, then `cache.get` and `engine.schedule(start + offset)`, records the playhead, and pre-warms the next bar's strikes. A `requestAnimationFrame` loop reports the playhead.
  - `stop()`: clears the timers, calls `stopAll`, releases the wake lock and resets the playhead
  - `isPlaying`
  - Listens for `visibilitychange` to hidden, which calls `stop()`

- [ ] **Step 1:** Implement. `index.html` has `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style=black-translucent`, and `theme-color`.
- [ ] **Step 2: Verify headless.** Serve with `python3 -m http.server 8000` and fetch `/`, `/js/main.js` and every imported module. Expected: all 200. Then run `node -e "import('./js/audio/transport.js')"` with stubbed globals, or at least `node --check` every file. Expected: no syntax errors.
- [ ] **Step 3: Verify in a browser.** Deploy a preview (Task 11's deploy step, early). Open it on a desktop browser and the iPhone: the default loop plays, tempo changes land at the next bar, Stop is silent at once, and the silent switch on still plays.
- [ ] **Step 4:** Commit `feat(audio): Web Audio engine, lookahead transport, playable shell`.

### Task 10: Full mobile UI and persistence wiring

**Files:** Create `js/ui/header.js`, `js/ui/barlist.js`, `js/ui/sheet.js` (bottom sheet with Chord/Rhythm tabs), and `js/ui/dom.js` (a tiny `h(tag, attrs, ...children)` helper). Modify `js/main.js` and `css/app.css`.

**Interfaces:**
- Consumes all pure modules, plus `Transport`.
- `main.js` holds `state = loadState(localStorage)`, `update(mutator)`, which applies the change, re-renders, and debounce-saves after 300 ms (saving immediately on `pagehide`), and `render()`.

- [ ] **Step 1: Header (sticky):**
  - a key `<select>` (`ALL_TONICS` × major/minor, labelled e.g. "A minor")
  - BPM ‹ value › buttons, where holding repeats every 100 ms, and tapping the value opens a numeric prompt that is clamped
  - a large Play/Stop button, disabled when there are 0 bars
- [ ] **Step 2: Bar list:**
  - each row shows the bar number, the chord name (`chordName(resolveRef(bar.chord, key))`), the grid label and the glyph row, with accents shown bold
  - the playing row and step are highlighted from `onPlayhead`
  - each row has ⋯ actions: duplicate, move up, move down, delete
  - an "+ Add bar" button duplicates the last bar, or adds the default's first bar
- [ ] **Step 3: Sheet, Chord tab:**
  - "In key" shows 7 degree buttons labelled with roman numerals in the key's case (major `I ii iii IV V vi vii°`, minor `i ii° III iv v VI VII`) plus the chord name, an extension segmented control (Triad 7 9 11 13), and, in minor keys, an extra `V <name>` dominant button
  - "Free" shows a root grid and a quality grid
  - tapping a chord sets the bar's ref
- [ ] **Step 4: Sheet, Rhythm tab:**
  - a source picker with Presets, My patterns and Blank (one per grid), which copies into the bar
  - a step row of ≥ 44 px cells grouped by beat, which scrolls horizontally. Tapping a cell runs `nextStroke`, and a 450 ms long-press toggles accent (with `contextmenu` and text selection disabled).
  - buttons for "Save as my pattern…" (prompts for a name), "Apply to all bars", and delete on my-pattern entries
- [ ] **Step 5:** CSS: mobile-first, dark, `env(safe-area-inset-*)` padding, `touch-action: manipulation`, `user-select: none` on controls, and a bottom sheet with a backdrop that closes on a tap outside or the ✕ button.
- [ ] **Step 6: Verify.** Run `node --test`, which is still green. Then check in a browser at a 390×844 viewport:
  - a key change relabels degree bars but not fixed bars
  - a minor key shows the V dominant
  - an edited pattern is heard from the next bar
  - a reload restores the state and my patterns
  - deleting all bars disables Play
- [ ] **Step 7:** Commit `feat(ui): mobile progression editor, chord and rhythm sheets, persistence`.

### Task 11: Home Screen app, offline, deploy, final check

**Files:** Create `manifest.webmanifest`, `sw.js`, `tools/make-icons.py`, `icons/*`, and `vercel.json`. Modify `index.html` (manifest link, apple-touch-icon) and `js/main.js` (register the SW).

- [ ] **Step 1:** `tools/make-icons.py` writes solid dark PNGs (192, 512, 180) with a simple guitar-pick shape, using stdlib `zlib` and `struct`. Run it.
- [ ] **Step 2:** The manifest has name "Guitar Chords", short_name "Chords", `start_url: "./"`, `display: "standalone"`, `orientation: "portrait"`, dark colours, and the icons.
- [ ] **Step 3:** `sw.js` keeps a `CACHE = 'gc-v1'` list of every app file. On install it pre-caches them. On activate it deletes old caches. On fetch it serves cache-first with a network fallback. `vercel.json` sets `Cache-Control: no-cache` for `/sw.js` and `/index.html`.
- [ ] **Step 4:** Verify locally: `python3 -m http.server`, and every file in `CACHE` returns 200 (a script compares the list to the files on disk).
- [ ] **Step 5:** Deploy to Vercel production with the Vercel tools as a static project named `guitar-chords`. Fetch the production URL, and it should return 200 with the app title.
- [ ] **Step 6:** Run `node --test` one last time. Expected: all pass.
- [ ] **Step 7:** Commit `feat: installable offline web app, deployed`, and hand the URL to the owner with the iPhone checklist from the spec (Add to Home Screen; loop at 60, 180 and 240 BPM; silent switch; lock and resume; airplane mode).
