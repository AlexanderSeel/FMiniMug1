# FMiniMug1

FMiniMug1 is an open-source, Minimoog-inspired virtual-analog synthesizer project for the M-VAVE FM-1.

The goal is not to clone Moog branding or proprietary artwork. It is to translate the classic three-oscillator + mixer + transistor-ladder workflow to the FM-1's 240×240 display, keyboard, encoders and buttons, while adding a matching browser controller/emulator, original classic-style patches, performance sequences and a recovery-first installation path.

> **Status:** active prototype. The portable native DSP, sample-clock sequencer, application runtime and 240×240 UI are implemented and host-tested. The browser runs the same C DSP/sequencer through WebAssembly + AudioWorklet. A read-only hardware diagnostic layer is ready for the first Felucca/JieLi target adapter. No `.fwsc` is published as safe to flash yet.

## Implemented now

- Portable native monophonic engine with three oscillators.
- PolyBLEP saw/square/pulse generation and corrected triangle generation.
- Classic per-oscillator 32'/16'/8'/4'/2' range selectors.
- Nonlinear mixer, feedback path and nonlinear four-stage ladder-style filter.
- Optional 2× oscillator/mixer/filter oversampling.
- Resonance compensation and bounded high-resonance stress testing.
- Independent filter and loudness ADSR contours.
- Glide, velocity, deterministic analog drift and filter keyboard tracking.
- Low/high/last held-note priority with correct fallback when a key is released.
- Single-trigger legato and selected-note retrigger modes.
- OSC3 keyboard-control-off and low-frequency mode foundation.
- Portable 1–64 step sample-clock sequencer with swing, gate, velocity, transpose, accent, tie and slide flags.
- Portable firmware application runtime binding physical note edges, octave switching, UI, sequencer and stereo 24-bit audio blocks.
- Portable six-page 240×240 FM-1 UI renderer.
- OSC / MIX / FILTER / CONTOUR / MOD / SEQ-PERF pages.
- HOLD secondary layer for oscillator ranges, filter contour, note priority and retrigger.
- Encoder-press FOCUS mode plus compact filter/contour visualizations.
- Abstract FM-1 platform API for display, controls, LEDs, audio, flash and MIDI.
- Raw hardware diagnostic screen for 27 notes, 14 buttons and seven encoders.
- Native C DSP + sequencer browser ABI compiled by Emscripten to `fminimug1.wasm`.
- AudioWorklet rendering native DSP and native sequence timing in 128-frame real-time blocks.
- Automatic Web Audio fallback when WASM/AudioWorklet is unavailable.
- Browser oscillator-range, dual-contour, retrigger and note-priority controls.
- Browser oscilloscope, spectrum display and peak/RMS meters with active-engine indicator.
- Web MIDI connection groundwork, overlapping keyboard play and sequence playback.
- **32 original classic-style patches** across bass, lead, brass, keys, sequence, SFX, drone and percussion categories.
- **12 selectable sequences** spanning Berlin-school, funk, prog, motorik, electro, slow/ambient and demonstration patterns.
- Native DSP, sequencer, UI and portable application-runtime tests in CI.
- Production browser + native WASM build in CI.

## Product direction

- Calibrate the nonlinear 4-pole ladder model and self-oscillation behavior against reference renders.
- Add classic decay/release switch behavior and constant-time/constant-rate glide choices.
- Extend analog character with component spread, calibration error and filter asymmetry.
- Add the scrolling 16-step hardware viewport for 64-step patterns.
- Compile the native 240×240 renderer to browser canvas for pixel-identical hardware preview.
- Expand to 64+ original patches and 32+ sequences.
- Implement the real Felucca-backed FM-1 adapter in safe bring-up stages: display → raw input → audio → runtime → MIDI → read-only flash identity.
- Add Web/CLI installer only after verified package bounds and return-to-stock/recovery workflows.

## Repository layout

```text
firmware/            portable synth engine, sequencer, app runtime, UI, diagnostics, WASM ABI and platform boundary
tests/               host DSP/sequencer/UI/application tests
scripts/             native/WASM build helpers
web/                 React browser controller + AudioWorklet/WASM emulator
docs/                FM-1/Felucca port, target contract and architecture notes
installer/           installer/recovery integration notes
.github/workflows/   CI
```

## Browser emulator / controller

For the lightweight development UI, Web Audio fallback works without Emscripten:

```bash
cd web
npm install
npm run dev
```

For the canonical native-DSP emulator install Emscripten (`emcc`) and run:

```bash
cd web
npm install
npm run dev:native
```

A production build always builds the native DSP first:

```bash
cd web
npm run build
```

The browser currently provides:

1. **Native emulator mode** – `fm_voice.c` and `fm_seq.c` are compiled to WASM and rendered/clocked inside an AudioWorklet.
2. **Graceful fallback mode** – a Web Audio approximation remains available if the native module cannot be loaded; the UI clearly identifies which engine is active.
3. **DSP diagnostics** – waveform, frequency spectrum, peak and RMS monitoring for filter/resonance/drive tuning.
4. **Performance controls** – classic oscillator ranges, separate loudness/filter contours, note priority and single-trigger/retrigger behavior.
5. **FM-1 controller groundwork** – Web MIDI connection and the same six panel sections used by the native UI model.
6. **Patch browser** – 32 original parameter sets.
7. **Sequence browser** – 12 selectable musical/demo patterns using native sample-clock transport in WASM mode.

## Hardware direction

Felucca demonstrates that the FM-1 supports an installable `.fwsc` package, Web-MIDI installer, browser emulator, flash-backed state, USB MIDI/audio and a complete native FM-1 HAL/build pipeline. Its current hardware layer documents the FM-1's ALNK0/I2S audio path and 11×6 input matrix with 27 note keys, 14 buttons and seven encoders.

FMiniMug1 keeps all hardware specifics behind `firmware/include/fm1_platform.h`. `firmware/src/fm_app.c` now binds that platform boundary to the synth, sequencer and UI, so the real target adapter does not need to contain instrument logic.

The first target build should use `fm_diag_render_input()` to display raw notes/buttons/encoder deltas and verify physical IDs before normal UI mappings are trusted. See `docs/FELUCCA_PORT.md` and `docs/FELUCCA_TARGET_CONTRACT.md` for the safe bring-up order and exact adapter responsibilities.

Because Felucca is GPL-3.0-only, any copied/adapted/linking target implementation must preserve the applicable GPL licence, source and attribution requirements. Portable FMiniMug1 modules remain separated from that target dependency.

## UI model

The 240×240 hardware UI uses six pages:

- **OSC** – oscillator levels and glide; HOLD selects each oscillator's 32'/16'/8'/4'/2' range.
- **MIX** – mixer drive, feedback and oscillator fine tuning.
- **FILTER** – cutoff, emphasis, contour amount and filter drive, plus a compact response graph.
- **CONTOUR** – loudness ADSR normally; HOLD edits the independent filter ADSR and switches the graph accordingly.
- **MOD** – drift, filter keyboard tracking and OSC3 modulation behavior; HOLD exposes LOW/HIGH/LAST priority and single-trigger/retrigger.
- **SEQ/PERF** – tempo, pattern, preset and transport.

The four FM-1 encoders always correspond to the four visible controls. Pressing an encoder enters **FOCUS** mode, where one parameter occupies most of the screen for fast performance editing.

## Factory sound bank

FMiniMug1's bank contains original parameter sets that recreate recognizable *types* of classic monophonic analog sounds rather than copying commercial preset data. Examples include **Round Bass 70**, **P-Funk Snap**, **Lucky Lead**, **Prog Arena Lead**, **Soft Brass**, **Berlin Sequence**, **Clav Bite**, **Space Whistle**, **Dark Drone**, **Percussive Zap** and **Init Classic**.

The original Minimoog Model D did not have preset memory, so references to “famous Minimoog presets” in this project mean recreated patch styles associated with classic playing/recording techniques—not copied factory presets.

## Testing

CI currently verifies:

```text
shared/generated native + browser parameter protocol consistency
native WASM generation with Emscripten
web production build including worklet/WASM assets
portable C DSP, sequencer, UI, application runtime and diagnostic compilation
DSP finite/bounded-output stress tests
octave-range and independent-contour behavior
low/high/last held-note priority and retrigger behavior
sample-clock sequencer timing/swing/tie behavior
portable 240×240 UI interaction/mapping tests
physical-key octave-safe release and app-runtime audio/transport integration
```

See `firmware/README.md` for local host-test commands.

## Safety

Custom firmware can brick hardware. The repository intentionally does **not** yet publish a development `.fwsc` as safe to flash. The first target implementation is explicitly bring-up/read-only with respect to flash writes. Before the first hardware beta the project must validate target linker/package bounds, device identity checks, package-size checks, SHA-256 manifests, return-to-official-V15 and FM-1-transporter recovery on a real test unit.

## Credits

- M-VAVE/FM-1 are trademarks of their respective owners.
- Minimoog/Moog are trademarks of Moog Music / their respective owners. FMiniMug1 is not affiliated with or endorsed by Moog.
- Felucca by Hügelton Instruments is an important technical reference for the FM-1 platform.
