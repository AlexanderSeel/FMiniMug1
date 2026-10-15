# FMiniMug1

FMiniMug1 is an open-source, Minimoog-inspired virtual-analog synthesizer project for the M-VAVE FM-1.

The goal is not to clone Moog branding or proprietary artwork. It is to translate the classic three-oscillator + mixer + transistor-ladder workflow to the FM-1's 240×240 display, keyboard, encoders and buttons, while adding a matching browser controller/emulator, original classic-style patches, performance sequences and a recovery-first installation path.

> **Status:** active prototype. The portable native DSP and 240×240 UI state machine are implemented and host-tested; the browser controller/emulator is runnable; the real JieLi/Felucca-backed FM-1 platform adapter and safe `.fwsc` package are the next hardware milestones.

## Implemented now

- Portable native monophonic engine with three oscillators.
- PolyBLEP saw/square/pulse generation and corrected triangle generation.
- Nonlinear mixer, feedback path and nonlinear four-stage ladder-style filter.
- Optional 2× oscillator/mixer/filter oversampling.
- Resonance compensation and bounded high-resonance stress testing.
- Glide, velocity, analog drift and filter keyboard tracking.
- OSC3 keyboard-control-off and low-frequency mode foundation.
- Portable six-page 240×240 FM-1 UI renderer.
- OSC / MIX / FILTER / CONTOUR / MOD / SEQ-PERF pages.
- Four encoder mappings, HOLD fine mode and encoder-press FOCUS mode.
- Abstract FM-1 platform API for display, controls, LEDs, audio, flash and MIDI.
- Browser controller/emulator with Web Audio, Web MIDI connection, keyboard play and sequence playback.
- **32 original classic-style patches** across bass, lead, brass, keys, sequence, SFX, drone and percussion categories.
- **12 selectable sequences** spanning Berlin-school, funk, prog, motorik, electro, slow/ambient and demonstration patterns.
- Native DSP stability tests and UI interaction tests in CI.
- Production browser build in CI.

## Product direction

- Three band-limited oscillators with classic ranges, fine/coarse detune and OSC3 modulation behavior.
- Noise + external/feedback source in a nonlinear mixer.
- Calibrated nonlinear 4-pole ladder filter with resonance, keyboard tracking and contour amount.
- Separate filter and loudness contour behavior closer to the classic instrument.
- Glide, legato/retrigger modes and note-priority options.
- Analog-character controls: drift, component spread, mixer drive, filter drive and asymmetry.
- 240×240 hardware UI inspired by the information hierarchy of a Minimoog panel rather than copying its artwork.
- Browser controller with the same parameter/page model as hardware.
- Native DSP/UI compiled to WASM as the long-term canonical browser emulator.
- 64+ original patches and 32+ sequences.
- Web/CLI installer and verified return-to-stock/recovery workflows.

## Repository layout

```text
firmware/            portable synth engine, UI and FM-1 platform boundary
tests/               host DSP/UI tests
web/                 React browser controller + current Web Audio emulator
docs/                FM-1/Felucca port and architecture notes
installer/           installer/recovery integration notes
.github/workflows/   CI
```

## Browser emulator / controller

```bash
cd web
npm install
npm run dev
```

The web app currently provides:

1. **Emulator mode** – Web Audio approximation of the FMiniMug1 signal path, playable from the computer/on-screen keyboard.
2. **FM-1 controller groundwork** – Web MIDI connection and the same six panel sections used by the native UI model.
3. **Patch browser** – 32 original parameter sets.
4. **Sequence browser** – 12 selectable 16-step musical/demo patterns.

The next audio-parity step is to replace the browser's Biquad/Web Audio approximation with the native DSP compiled to AudioWorklet/WASM.

## Hardware direction

Felucca 1.6.1 demonstrates that the FM-1 supports an installable `.fwsc` package, Web-MIDI installer, browser emulator, flash-backed state, USB MIDI/audio and a complete native FM-1 HAL/build pipeline. Its HAL also documents the FM-1's ALNK0/I2S audio path and 11×6 input matrix with 27 note keys, 14 buttons and seven encoders.

FMiniMug1 keeps all such hardware specifics behind `firmware/include/fm1_platform.h`. The port order and concrete mapping are documented in `docs/FELUCCA_PORT.md`.

Because Felucca is GPL-3.0-only, any copied/adapted Felucca implementation must preserve its GPL licence and attribution requirements. The portable synth/UI code is deliberately separated from that adapter layer.

## UI model

The 240×240 hardware UI uses six pages:

- **OSC** – oscillator levels/ranges/waves/tuning and glide.
- **MIX** – mixer drive, feedback and oscillator fine tuning.
- **FILTER** – cutoff, emphasis, contour amount and filter drive.
- **CONTOUR** – attack, decay, sustain and release.
- **MOD** – drift, filter keyboard tracking and OSC3 modulation behavior.
- **SEQ/PERF** – tempo, pattern, preset and transport.

The four FM-1 encoders always correspond to the four visible controls. Holding the modifier enables fine adjustment. Pressing an encoder enters **FOCUS** mode, where one parameter occupies most of the screen for fast performance editing.

## Factory sound bank

FMiniMug1's bank contains original parameter sets that recreate recognizable *types* of classic monophonic analog sounds rather than copying commercial preset data. Examples include **Round Bass 70**, **P-Funk Snap**, **Lucky Lead**, **Prog Arena Lead**, **Soft Brass**, **Berlin Sequence**, **Clav Bite**, **Space Whistle**, **Dark Drone**, **Percussive Zap** and **Init Classic**.

The original Minimoog Model D did not have preset memory, so references to “famous Minimoog presets” in this project mean recreated patch styles associated with classic playing/recording techniques—not copied factory presets.

## Testing

CI currently verifies:

```text
web production build
portable C DSP compilation
DSP finite/bounded-output stress tests
portable 240×240 UI compilation
UI interaction/mapping tests
```

See `firmware/README.md` for local host-test commands.

## Safety

Custom firmware can brick hardware. The repository intentionally does **not** yet publish a development `.fwsc` as safe to flash. Before the first hardware beta the project must validate target linker/package bounds, device identity checks, package-size checks, SHA-256 manifests, return-to-official-V15 and FM-1-transporter recovery on a real test unit.

## Credits

- M-VAVE/FM-1 are trademarks of their respective owners.
- Minimoog/Moog are trademarks of Moog Music / their respective owners. FMiniMug1 is not affiliated with or endorsed by Moog.
- Felucca by Hügelton Instruments is an important technical reference for the FM-1 platform.

See `plan.md` for milestones and implementation status.
