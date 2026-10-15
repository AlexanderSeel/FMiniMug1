# FM-1 firmware target

This directory contains the portable synth/UI core and the boundary for the real M-VAVE FM-1 target.

## Current state

`include/fm_voice.h` + `src/fm_voice.c` now implement a portable monophonic virtual-analog voice with:

- three oscillators;
- PolyBLEP-corrected saw/square/pulse generation;
- triangle generated from the corrected square;
- independent level/coarse/fine tuning, keyboard tracking and OSC3 low-frequency mode;
- glide and deterministic slow drift;
- nonlinear mixer + feedback;
- nonlinear four-stage ladder-style filter;
- resonance compensation;
- filter keyboard tracking at off / 1/3 / 2/3 / full;
- attack/decay/sustain/release contour state;
- optional 2× oversampling around oscillator/mixer/filter processing;
- bounded sample output and host stability tests.

`include/fm_ui.h` + `src/fm_ui.c` implement the shared 240×240 UI state machine:

- OSC, MIX, FILTER, CONTOUR, MOD and SEQ/PERF pages;
- four visible encoder assignments per page;
- HOLD fine adjustment;
- encoder-press FOCUS mode;
- preset/pattern/transport state;
- portable RGB565 drawing primitives through `fm1_platform.h`.

## Platform boundary

`include/fm1_platform.h` is the only interface the application layer should use for FM-1 hardware services. It covers:

- 27 note keys, buttons and seven encoder deltas;
- double-buffer-friendly stereo audio blocks;
- 240×240 LCD drawing;
- note/button LEDs;
- monotonic time;
- flash read/write;
- MIDI output.

The actual JieLi/Felucca-backed implementation is deliberately not mixed into the synth core. Host tests and a future WASM target provide alternate implementations of the same boundary.

See `../docs/FELUCCA_PORT.md` for the concrete port order and mapping to Felucca's proven FM-1 HAL concepts.

## Felucca platform integration

The FM-1-facing implementation should be adapted from Felucca's proven platform pieces:

- JieLi AC79/WL82 startup/linker/build path;
- ALNK0/I2S audio DMA and external codec initialization;
- FM-1 LCD;
- 11×6 key/button/encoder matrix and LED scanning;
- USB MIDI and TRS MIDI;
- USB audio;
- flash storage;
- loader / update entry;
- `.fwsc` packaging and identity/size checks;
- host/WASM stubs for UI/DSP tests.

Felucca source is GPL-3.0-only. If implementation code is copied or adapted, FMiniMug1 must remain GPL-compatible and preserve the relevant copyright/licence notices.

## Audio goals

- 48 kHz hardware processing baseline;
- 2× oversampling around oscillator + nonlinear mixer + ladder where the target CPU budget allows;
- self-oscillating resonance without unstable blow-ups;
- calibrated low-frequency compensation at high emphasis;
- deterministic drift for regression tests;
- no allocations in the audio callback;
- fixed or bounded CPU cost per sample;
- golden audio renders for every factory patch before beta.

## Tests

From the repository root on a host with a C compiler:

```bash
mkdir -p build
cc -std=c11 -Wall -Wextra -Werror -Ifirmware/include \
  firmware/src/fm_voice.c tests/test_dsp.c -lm -o build/test_dsp
./build/test_dsp

cc -std=c11 -Wall -Wextra -Werror -Ifirmware/include \
  firmware/src/fm_voice.c firmware/src/fm_ui.c tests/test_ui.c -lm -o build/test_ui
./build/test_ui
```

CI runs both suites plus the production browser build.

## Hardware safety

The current repository still does **not** produce a hardware-safe `.fwsc`. Do not flash portable/host artifacts to an FM-1. Boot/linker/package work comes only after display, controls and audio have been integrated through the real target HAL and recovery has been verified on a test device.
