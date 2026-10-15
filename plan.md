# FMiniMug1 Implementation Plan

## Vision
Build a performance-first, Minimoog-inspired monophonic synthesizer for the M-VAVE FM-1 with a matching 240×240 hardware UI, browser controller, emulator, safe installer path, original factory presets and musical sequences.

## Milestone 0 — Foundation ✅
- [x] Define product scope and legal/trademark boundaries.
- [x] Define 6-page hardware UI model shared with the web app.
- [x] Define original preset and sequence schemas.
- [x] Create browser controller/emulator application shell.
- [x] Add Web MIDI transport abstraction.
- [x] Add native firmware engine API and DSP module boundaries.
- [x] Document Felucca-compatible installer/build integration strategy.

## Milestone 1 — Browser reference synth 🚧
- [x] Three oscillator Web Audio voice.
- [x] Mixer, noise source, drive and feedback approximation.
- [x] Resonant 4-pole low-pass approximation.
- [x] Filter and amp contours.
- [x] Glide/legato behavior.
- [x] On-screen keyboard and PC keyboard performance.
- [x] Factory patch browser.
- [x] Sequence browser + step playback.
- [ ] Replace browser filter approximation with AudioWorklet/WASM ladder matching native DSP equations.
- [ ] Add anti-aliased oscillator worklet matching firmware.
- [ ] Add oscilloscope + spectrum diagnostics.
- [ ] Golden-render audio regression tests for every factory patch.

## Milestone 2 — 240×240 FM-1 UI
- [ ] Port Felucca-compatible display/HAL integration behind `fm1_platform.h`.
- [ ] OSC page.
- [ ] MIX page.
- [ ] FILTER page with live cutoff/resonance response graph.
- [ ] CONTOUR page with dual envelope graphs.
- [ ] MOD page.
- [ ] SEQ/PERF page with 16-step viewport and scrolling 64-step patterns.
- [ ] FOCUS mode: one large parameter + encoder fine mode.
- [ ] HOLD layers for oscillator range, waveform, fine tune, key tracking and performance actions.
- [ ] Make browser controller use the exact same page ordering, labels and parameter IDs.

## Milestone 3 — Native DSP engine
- [ ] PolyBLEP/minBLEP band-limited saw/pulse oscillators; triangle from integrated square with correction.
- [ ] Oscillator 1/2/3 range switches equivalent to 32'…2' behavior.
- [ ] OSC3 keyboard-control off + LO modulation range.
- [ ] Nonlinear mixer with per-source gain and soft saturation.
- [ ] 4-stage nonlinear ladder filter; compare Huovilainen-style and ZDF implementations.
- [ ] 2× oversampling option for mixer/filter path if FM-1 target budget permits.
- [ ] Resonance compensation and self-oscillation calibration.
- [ ] Filter keyboard tracking 0 / 1⁄3 / 2⁄3 / full variants.
- [ ] Separate filter and loudness contours with classic decay/release switch behavior.
- [ ] Glide constant-time/constant-rate options and classic legato priority modes.
- [ ] Analog model: drift, component spread, calibration error, mixer drive, filter asymmetry.
- [ ] CPU budget and golden render tests.

## Milestone 4 — Presets and sequences
- [x] Seed original factory bank: bass, lead, brass, drone, keys, SFX and sequence patches.
- [x] Seed demonstration sequences.
- [ ] Expand to 64+ original factory presets.
- [ ] Expand to 32+ sequences: Berlin, funk, prog, electro, soundtrack, educational oscillator/filter demos.
- [ ] User preset slots in flash.
- [ ] User sequence slots in flash.
- [ ] Import/export JSON through browser controller.
- [ ] MIDI program-change mapping.

## Milestone 5 — MIDI / controller protocol
- [x] Reserve manufacturer-neutral SysEx development namespace format in web layer.
- [ ] Finalize protocol only after native parser exists.
- [ ] Full patch dump/request.
- [ ] Parameter delta updates.
- [ ] Sequence dump/request.
- [ ] Transport start/stop/clock.
- [ ] Note input through USB and TRS MIDI.
- [ ] MIDI learn for performance macros.
- [ ] Browser live sync with connected hardware.

## Milestone 6 — Installer / packaging
- [ ] Reuse or adapt the proven Felucca `.fwsc` packaging path with GPL compliance if Felucca source is incorporated.
- [ ] Device identity and package-size validation before erase/write.
- [ ] Web MIDI installer in Chrome/Edge.
- [ ] CLI installer.
- [ ] Return-to-official-V15 workflow.
- [ ] Recovery guide using FM-1-transporter for non-booting hardware.
- [ ] SHA-256 manifests for every release.
- [ ] Refuse unknown FM-1 firmware identities by default.

## Milestone 7 — Browser emulator parity
- [ ] Compile the native DSP/UI core to WASM as the canonical emulator.
- [ ] Persist presets/sequences/settings in IndexedDB/local storage.
- [ ] Simulated 240×240 screen with physical button/encoder mappings.
- [ ] MIDI keyboard support.
- [ ] Audio/MIDI recorder and WAV export.
- [ ] Preset A/B compare.

## Milestone 8 — QA / release
- [ ] Host DSP tests.
- [ ] UI clipping/overlap snapshot tests at 240×240.
- [ ] Web unit tests.
- [ ] Production web build in CI.
- [ ] Native FM-1 build in CI or reproducible documented container environment.
- [ ] Real-device smoke test checklist.
- [ ] Beta release only after installer/recovery path has been verified on hardware.

## FM-1 control concept

### Normal layer
- Encoder 1–4: four highlighted page parameters.
- Left/right page buttons: previous/next panel section.
- Keyboard: notes / sequence transpose.
- Play: sequencer start/stop.
- Pattern: sequence selection.
- Preset: factory/user patch selection.

### HOLD layer
- Hold + Encoder: fine adjustment or secondary parameter.
- Hold + keyboard: instant oscillator range/wave assignments and performance macros.
- Hold + Play: tap tempo / clock source.
- Hold + Preset: save/copy/compare.
- Hold + Pattern: step record / clear / duplicate.

### FOCUS mode
Press an encoder to zoom one parameter to nearly full screen, show its graph/value/history and use the keyboard for coarse presets/ranges while the encoder provides fine control.

## Preset policy
Factory patches are original parameter sets inspired by recognizable categories of classic analog sounds. Do not copy proprietary preset books, commercial banks, artwork, logos, or patch sheets verbatim.

## Felucca integration notes
Felucca 1.6.1 proves this hardware can support `.fwsc` packaging, a Web MIDI installer, browser emulator, flash persistence, USB audio/MIDI, four-encoder UI, tests and a reproducible JieLi AC79 build path. FMiniMug1 should port only the platform pieces that are required, preserve GPL obligations for any GPL-derived implementation, and keep its synthesizer/UI application layer modular enough to test on host and WASM.
