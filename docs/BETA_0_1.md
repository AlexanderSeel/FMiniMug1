# FMiniMug1 Browser Beta 0.1

This beta is intended for musical/interaction testing in a desktop browser. It is **not** a flashable FM-1 firmware beta yet.

## What is testable

- Synth A: canonical native C/WASM voice when the WASM asset is available; Web Audio fallback otherwise.
- Synth B: second three-oscillator classic-style layer in Web Audio.
- Layer on/off and independent Synth B level.
- Analog-style synthesized kick, snare, closed/open hats, clap, tom and percussion.
- Scene-linked drum patterns with swing.
- Global Studio character saturation modes: Clean, Classic, Aged, Hot and Broken.
- Delay send with feedback and scene-derived timing.
- Algorithmic/convolution reverb send.
- 8 curated Studio scenes combining Synth A, Synth B, pattern, drums and FX direction.
- 40 synth presets and 20 sequence/demo patterns.
- Native sequencer swing, velocity, transpose and accent/tie/slide data when Synth A is running in WASM mode.

## Quick start

From `web/`:

```bash
npm install
npm run dev
```

Open the Vite URL, choose a **STUDIO SCENE**, then press **PLAY SCENE**. `npm run dev` is deliberately usable without Emscripten: Synth A falls back to Web Audio while Synth B/drums/FX remain available.

For the canonical Synth A C/WASM engine, install Emscripten and use:

```bash
npm run dev:native
```

## Recommended first tests

1. `Neon Basement`: verify bass sequence + Synth B keyboard layer + drums; toggle Synth B and drums independently.
2. `Berlin Afterhours`: verify 32-step playback, low swing and Aged character.
3. `Rubber Funk Lab`: verify stronger swing/rest behavior and short envelopes.
4. `Dark Satellite`: verify long releases, resonance/drift texture and larger ambience.
5. `Calibration Bench`: turn Synth B/drums/FX off and compare the exposed Synth A behavior.

Use the **STUDIO** page to adjust Synth B level, drum level, delay send and reverb send while playing. Character can be changed in the scene bar without reloading the scene.

## Beta limitations

- Synth B and drums are browser-layer engines, not yet native FM-1 DSP modules.
- Drum timing is browser-scheduled; it is suitable for beta feel/arrangement testing but is not yet sample-clock native.
- Studio FX currently process the browser Studio layer (Synth B + drums). Synth A remains on its existing native/fallback output path so the canonical voice stays untouched for this beta.
- Parameter locks, motion recording, probability and real ratchets are still planned.
- No user persistence/import/export yet.
- No `.fwsc` is produced and nothing in this beta should be flashed to an FM-1.

## Feedback to capture

For each scene note: groove/tempo feel, whether Synth B supports or masks Synth A, drum balance, useful delay/reverb ranges, character-mode usefulness, CPU/glitches, and which controls need to be reachable from the 240x240 hardware UI.
