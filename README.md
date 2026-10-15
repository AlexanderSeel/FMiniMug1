# FMiniMug1

FMiniMug1 is an open-source, Minimoog-inspired virtual-analog synthesizer project for the M-VAVE FM-1.

The goal is not to clone Moog branding or proprietary artwork. It is to translate the classic three-oscillator + mixer + transistor-ladder + dual-envelope workflow to the FM-1's 240×240 display, keyboard, encoders and buttons, while adding a matching browser controller/emulator, original classic-style presets, performance sequences and a safe installation path.

> **Status:** foundation / first implementation batch. The browser emulator is intended to become the reference UI/interaction model; the native FM-1 firmware port follows the Felucca-compatible hardware/build path.

## Product goals

- Three band-limited oscillators: triangle, saw, saw/triangle, square and pulse families
- Classic oscillator ranges plus fine/coarse detune, oscillator 3 keyboard-control off and low-frequency mode
- Noise + external/feedback source in a nonlinear mixer
- Nonlinear 4-pole ladder filter with resonance, keyboard tracking and envelope amount
- Separate contour generators for filter and loudness
- Glide, legato/retrigger modes, pitch/mod wheel equivalents and performance hold
- Analog-character controls: drift, component spread, mixer drive, filter drive and feedback
- 240×240 hardware UI inspired by the information hierarchy of a Minimoog panel
- Browser controller with the same page/state model as hardware
- Browser audio emulator for auditioning patches without an FM-1
- Web-MIDI bridge for live editing when connected to an FM-1
- Original factory preset bank covering famous *types* of classic Minimoog sounds without copying proprietary preset data
- 16/32/64-step monophonic sequencer with accent, glide/tie, gate and per-step transpose
- Web/CLI installer path and recovery-first packaging workflow based on Felucca's proven FM-1 tooling concepts

## Repository layout

```text
firmware/            native synth engine + FM-1 integration target
shared/              preset/sequence schemas shared with tools/web
web/                 React browser controller + emulator
installer/           installer/recovery integration notes and scripts
scripts/             build helpers
.github/workflows/   CI
```

## Browser emulator / controller

```bash
cd web
npm install
npm run dev
```

The web app runs in two modes:

1. **Emulator** – uses Web Audio to approximate the FMiniMug1 signal path and lets you play with the computer keyboard/on-screen keys.
2. **FM-1 Controller** – uses Web MIDI in Chrome/Edge to send parameter edits, note events, preset changes and sequencer transport to compatible FMiniMug1 firmware.

## Hardware direction

Felucca demonstrates that the FM-1 can support an installable `.fwsc` package, Web-MIDI installer, browser emulator, flash-backed presets/projects, USB MIDI/audio and a complete native FM-1 HAL/build pipeline. FMiniMug1 is intentionally architected to reuse/port that proven platform layer rather than inventing a second unsafe flashing mechanism.

Because Felucca is GPL-3.0-only, any direct reuse of Felucca GPL implementation code must keep the resulting derivative GPL-compatible and preserve attribution/licence requirements. This repository currently starts with original application code and explicit integration boundaries; licensing must be reviewed before importing Felucca source files.

## UI model

The 240×240 hardware UI is organized as six dense but readable pages:

- **OSC** – oscillator ranges, waveforms, tuning, OSC3 control
- **MIX** – oscillator/noise levels, feedback/external source, mixer drive
- **FILTER** – cutoff, emphasis, contour amount, key tracking, filter drive
- **CONTOUR** – filter/loudness attack, decay, sustain + decay/release switch
- **MOD** – source, destination, depth, wheel amount, drift/spread
- **SEQ/PERF** – preset, tempo, pattern, step grid and performance macros

The four FM-1 encoders always map left-to-right to the four highlighted controls visible on screen. HOLD/SHIFT layers expose fine adjustment and secondary functions. Web and hardware use the same state names and page ordering.

## Factory sound bank

The included factory bank uses original parameter values and descriptive names such as **Round Bass 70**, **Lucky Lead**, **Berlin Sequence**, **Funk Taurus**, **Soft Brass**, **Space Whistle**, **Prog Lead**, **Rubber Bass**, **Dark Drone**, and **Vintage Keys**. These are stylistic references, not copies of commercial preset cartridges, patch books or copyrighted data.

## Safety

Custom firmware can brick hardware. The release process must validate package size/identity, preserve a tested return-to-stock route, publish hashes, and keep recovery documentation next to every downloadable build. Do not flash development artifacts to valuable hardware until the package/loader compatibility checks in `plan.md` are complete.

## Credits

- M-VAVE/FM-1 are trademarks of their respective owners.
- Minimoog/Moog are trademarks of Moog Music / their respective owners. FMiniMug1 is not affiliated with or endorsed by Moog.
- Felucca by Hügelton Instruments is an important technical reference for the FM-1 platform.

See `plan.md` for milestones and implementation status.
