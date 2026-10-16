# FMiniMug1 Workstation Plan

## Product vision

Build a compact four-part performance workstation for the M-VAVE FM-1 around four distinct classic-inspired instruments:

1. **MINI** — the existing three-oscillator / ladder monophonic synth. Keep exactly one instance and preserve its character.
2. **808 DRUM** — an original analog drum-machine engine inspired by classic 808-style synthesis and sequencing.
3. **808 BASS** — an original acid/bassline monosynth with accent and slide behavior.
4. **ALPHA** — an original six-voice DCO/VCF/VCA poly synth inspired by Alpha-Juno-era architecture and performance controls.

The goal is not to clone Roland or Moog branding, artwork, ROMs, presets or exact trade dress. The implementation uses original DSP, UI graphics, presets and patterns while adopting familiar synthesis concepts.

## Non-negotiable architecture rules

- Hardware and virtual mode use the **same instrument/page/parameter model** generated from `shared/workstation.json`.
- Every normal page exposes exactly four primary controls because the FM-1 has four main encoders.
- The 240×240 hardware renderer is the reference layout. The browser shows the same screen/pages plus optional surrounding diagnostics/editor chrome.
- WASM uses the same native C DSP/state/transport code as hardware wherever practical. WebAudio fallbacks are development-only.
- One shared transport clock drives MINI sequence, 808 DRUM, 808 BASS and ALPHA sequence/arpeggio lanes.
- Scenes store all four parts, mixer, global FX, tempo/swing and pattern assignments atomically.
- Preserve the proven diagnostic-first FM-1 bring-up and never generate a flashable `.fwsc` until real-device/recovery gates are passed.

## Inspiration from Melodee

Use `keremimo/melodee` as a workflow/reference source, not as a code/UI copy. Adopt these architectural ideas:

- track/part-centric selection;
- descriptor-driven pages and parameter metadata;
- one protocol/state model for hardware and editor;
- live editor updates without forcing page selection changes;
- sequencer steps that can carry note/rest, accent, slide, probability and motion;
- device capability/version discovery rather than hard-coded editor assumptions;
- compact hardware interaction with a richer browser view over the same state.

Do not copy Melodee assets, fonts, visual trade dress or substantial source code.

## Milestone A — Existing MINI foundation ✅ / maintenance

- [x] Native three-oscillator Mini-style voice.
- [x] PolyBLEP saw/pulse/square and integrated triangle.
- [x] Ladder-style nonlinear filter, drive, feedback and drift.
- [x] Independent filter/loudness contours.
- [x] Classic oscillator ranges, glide modes, decay-link switches.
- [x] Mono priority/retrigger/legato behavior.
- [x] Native sequencer and WASM AudioWorklet integration.
- [x] 240×240 native UI and Felucca target adapter.
- [x] Raw input and audio-budget diagnostics.
- [x] Real JieLi compile/link CI with flash writes disabled.
- [ ] Keep MINI as one instance only; remove dual-MINI roadmap and transitional Synth-B feature after replacement engines are usable.
- [ ] Final filter/reference calibration and golden audio tests.

## Milestone B — Canonical workstation UI/state 🚧

Source of truth: `shared/workstation.json`.

- [x] Define four parts: MINI / 808 DRUM / 808 BASS / ALPHA.
- [x] Define hardware-safe four-control pages for every part.
- [x] Add generator producing native C and TypeScript descriptors.
- [ ] CI-regenerate descriptors and fail on drift.
- [ ] Native top-level part selector shared by hardware and virtual renderer.
- [ ] Shared page index/focus/HOLD state per part.
- [ ] Global pages: MIXER / FX / SCENE / CLOCK.
- [ ] Compile the native 240×240 renderer to WASM/canvas for pixel-identical preview.
- [ ] Browser surrounds the native screen with simulated FM-1 buttons/encoders.
- [ ] Browser full editor reads the same descriptor/state model instead of maintaining separate page definitions.

### Hardware interaction target

```text
PART: MINI | DRUM | BASS | ALPHA | GLOBAL
PAGE LEFT/RIGHT: page inside selected part
ENC 1..4: four visible parameters
ENC PRESS: focus/alternate action
HOLD: secondary layer
PLAY: global transport
PATTERN: pattern browser for selected part
PRESET: sound/kit preset browser for selected part
```

The virtual FM-1 must expose the same controls in the same positions and invoke the same state transitions.

## Milestone C — 808 DRUM engine

Original synthesis, no samples required for core voices.

Target voices:

- [ ] Bass Drum — pitch sweep, tune, decay, tone/drive.
- [ ] Snare — body oscillators + filtered noise/snappy component.
- [ ] Low/Mid/High Tom / Conga family.
- [ ] Rim / claves.
- [ ] Clap — multi-burst noise envelope.
- [ ] Cowbell — dual pulse/square metallic source.
- [ ] Closed Hat / Open Hat — metallic oscillator/noise network with separate decays.
- [ ] Cymbal — metallic source + band/high-pass shaping.
- [ ] Per-voice level/accent response.
- [ ] 16/32-step drum grid with per-lane hits and accent.
- [ ] Flam, probability and per-step variation where CPU permits.
- [ ] Mute/solo and performance fill.
- [ ] Original factory kits and immediately useful demo patterns.
- [ ] Native/WASM golden render tests for representative voices.

Hardware pages from canonical manifest:

```text
KIT  : VOICE / LEVEL / TUNE / DECAY
TONE : TONE / SNAPPY / ATTACK / COLOR
MIX  : BD / SD / HATS / PERC
SEQ  : STEP / ACCENT / FLAM / PROB
PERF : SWING / FILL / MUTE / PATTERN
```

## Milestone D — 808 BASS acid engine

- [ ] Monophonic saw/square oscillator with optional subtle sub layer.
- [ ] Resonant diode/ladder-inspired acid filter developed as original DSP.
- [ ] Envelope modulation and classic short decay workflow.
- [ ] True step accent affecting VCA/filter/drive.
- [ ] True slide/portamento without envelope retrigger.
- [ ] 16/32/64-step pattern lane.
- [ ] Per-step note / accent / slide / octave.
- [ ] Transpose, rotate, mutation and scale-lock performance functions.
- [ ] Original acid/bass factory patterns and patches.
- [ ] WASM and hardware use the identical engine.

Pages:

```text
OSC    : WAVE / TUNE / SUB / DRIVE
FILTER : CUTOFF / RESO / ENV MOD / ACCENT
ENV    : DECAY / SLIDE / GATE / ACC DECAY
SEQ    : NOTE / ACCENT / SLIDE / OCTAVE
PERF   : TEMPO / SWING / PATTERN / PLAY
```

## Milestone E — ALPHA poly synth

Create an original Alpha-Juno-era inspired synth, not a ROM/emulation copy.

- [ ] Six-voice initial polyphony; measure FM-1 CPU before increasing.
- [ ] DCO-style saw/pulse/sub/noise oscillator mix.
- [ ] PWM and LFO modulation.
- [ ] Resonant low-pass filter with key tracking and envelope amount.
- [ ] VCA envelope/velocity modes.
- [ ] ADSR plus optional extended Alpha-style envelope only if UI/CPU remain manageable.
- [ ] LFO rate/delay and DCO/VCF modulation depths.
- [ ] Characterful stereo chorus in virtual mode; resource-bounded hardware version.
- [ ] Chord memory / chord sequence support.
- [ ] Voice allocation / steal policy and sustain pedal.
- [ ] Original hoover/brass/pad/strings/bass/pluck factory bank.
- [ ] CPU stress test with six voices + chorus + the other workstation parts.

Pages:

```text
DCO    : SAW / PULSE / SUB / NOISE
VCF    : CUTOFF / RESO / ENV / KEYTRACK
VCA    : LEVEL / ENV MODE / VELOCITY / PAN
ENV    : ATTACK / DECAY / SUSTAIN / RELEASE
LFO    : RATE / DELAY / DCO MOD / VCF MOD
CHORUS : MODE / RATE / DEPTH / MIX
SEQ    : CHORD / GATE / PATTERN / PLAY
```

## Milestone F — Shared sequencer / song workflow

- [ ] One sample-clock master transport.
- [ ] Independent pattern length per part.
- [ ] Pattern start remains phase-coherent across all parts.
- [ ] MINI note lane.
- [ ] DRUM lane grid.
- [ ] BASS acid lane with accent/slide.
- [ ] ALPHA poly/chord lane.
- [ ] Pair-preserving swing globally, optional per-part offset later.
- [ ] Probability and microtiming where deterministic on hardware.
- [ ] Parameter locks / motion lanes using shared parameter identifiers.
- [ ] Pattern chains and Scene/song arrangement.
- [ ] Record live keyboard input into selected melodic part.

## Milestone G — Mixer / FX / Scenes

- [ ] Four-part mixer with level, mute and optional pan.
- [ ] Global delay.
- [ ] Global resource-bounded reverb/ambience.
- [ ] Master drive/limiter.
- [ ] Scene stores four presets/kits, patterns, mixer, FX and clock.
- [ ] Scene recall is atomic at a safe audio boundary.
- [ ] 12+ factory demo scenes designed as regression tests.
- [ ] Do not add another full synth instance; expand musical range through the four dedicated parts.

## Milestone H — Web editor + WASM virtual FM-1

Two views over the same state:

### VIRTUAL

- [ ] Pixel-identical 240×240 native UI rendered from WASM/native display commands.
- [ ] Simulated FM-1 keyboard, buttons, encoder presses and rotations.
- [ ] Same selected part/page/focus/HOLD behavior as hardware.
- [ ] Native C DSP for all four parts in AudioWorklet.
- [ ] Same master transport and sequencer core.
- [ ] CPU/load diagnostics and deterministic test capture.

### EDITOR

Inspired by Melodee's device/editor model:

- [ ] Part strip: MINI / DRUM / BASS / ALPHA.
- [ ] Descriptor-driven parameter groups; no duplicate manually-maintained UI schema.
- [ ] Large drum grid and bassline sequence editor.
- [ ] Poly/chord editor for ALPHA.
- [ ] Full MINI editor using existing parameters.
- [ ] Mixer / FX / Scene editor.
- [ ] Hardware connection mode and virtual mode use the same React components/state model.
- [ ] Hardware live sync via SysEx/USB-MIDI once native protocol is implemented.
- [ ] Capability/version handshake so editor can adapt to firmware revisions.
- [ ] Import/export workstation project JSON.
- [ ] WAV capture from virtual mode for regression testing.

## Milestone I — Presets / demos / regression content

Every implemented feature gets musical test material immediately.

- [ ] MINI: retain and curate current best factory sounds/patterns.
- [ ] 808 DRUM: at least 8 kits and 24 patterns: electro, hip-hop, techno, house, break, minimal, calibration.
- [ ] 808 BASS: at least 24 acid/bassline patterns across multiple scales and slide/accent stress cases.
- [ ] ALPHA: at least 32 original presets including hoover-like, brass, pads, strings, plucks, basses and calibration patches.
- [ ] At least 12 full four-part demo Scenes.
- [ ] Each engine has a calibration preset/pattern designed for DSP regression tests.
- [ ] Golden audio hashes/statistics for stable deterministic renders where appropriate.

## Milestone J — Hardware bring-up / release safety

Pinned Felucca HAL stays the hardware basis until a better proven target layer exists.

- [x] Diagnostic image with raw controls and LCD.
- [x] Core audio budget image.
- [x] Real JieLi compile/link workflow.
- [x] Flash writes disabled.
- [x] No `.fwsc` release packaging.
- [ ] Verify real button/encoder mapping on physical FM-1.
- [ ] Replace old dual-MINI Studio stress image with full four-engine workstation stress image.
- [ ] Measure worst-case MINI + 808 DRUM + 808 BASS + six-voice ALPHA + FX.
- [ ] Define quality degradation policy if CPU budget is exceeded (polyphony/oversampling/chorus quality), never random underruns.
- [ ] Read-only identity validation.
- [ ] Validate stock V15 return/recovery path.
- [ ] Only then create a mapped hardware beta.
- [ ] Only after recovery validation consider `.fwsc` packaging.

## Immediate implementation order

1. Canonical manifest + generated hardware/web descriptors.
2. New workstation state/part selector; identical virtual and hardware navigation.
3. 808 BASS engine first — small CPU footprint, validates accent/slide sequencing model.
4. 808 DRUM core voices + grid.
5. ALPHA six-voice engine + chorus with explicit CPU budget measurement.
6. Replace transitional browser Studio layer with real four-part mixer.
7. Move all four native engines into the WASM AudioWorklet.
8. Compile the native 240×240 UI renderer to WASM/canvas.
9. Add shared descriptor-driven web editor and hardware SysEx synchronization.
10. Build four-part hardware stress diagnostic before any installable firmware.

## Current safety status

Existing target artifacts remain diagnostic/non-installable. The current `fm_studio` dual-MINI code is transitional and must not be treated as the final workstation architecture. Flash write APIs remain disabled and no `.fwsc` should be produced until the physical-device and recovery gates above are completed.
