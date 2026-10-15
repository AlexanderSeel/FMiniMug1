# FM-1 firmware target

This directory contains the portable synth core and the boundary for the real FM-1 target.

## Current state

`include/fm_voice.h` + `src/fm_voice.c` implement the first portable monophonic voice prototype: three oscillators, nonlinear mixer/feedback, dual contour state, glide/drift and a four-stage resonant low-pass structure. The oscillator generation is intentionally still a simple reference implementation; the hardware milestone replaces it with band-limited PolyBLEP/minBLEP oscillators and calibrates the ladder model against reference renders before release.

## Felucca platform integration

The FM-1-facing implementation should be adapted from Felucca's proven platform concepts:

- JieLi AC79/WL82 startup/linker/build path
- FM-1 LCD, keys and four encoders
- USB MIDI and TRS MIDI
- USB audio
- flash storage
- loader / update entry
- `.fwsc` packaging and identity/size checks
- host/WASM stubs for UI/DSP tests

Do not copy GPL implementation code into a differently licensed project. If Felucca source is imported directly, keep FMiniMug1 GPL-compatible and preserve attribution/license notices.

## Audio goals

- 48 kHz internal processing baseline
- 2× oversampling around mixer + ladder when CPU budget allows
- self-oscillating resonance without unstable blow-ups
- controllable bass compensation
- deterministic drift for regression tests
- no allocations in the audio callback
- fixed or bounded CPU cost per sample

## Proposed platform API

```c
void fm1_platform_init(void);
void fm1_audio_set_callback(void (*cb)(int16_t *out, uint32_t frames));
void fm1_display_present(const uint16_t *rgb565_240x240);
uint32_t fm1_controls_poll(void);
void fm1_midi_send(const uint8_t *data, uint32_t size);
bool fm1_flash_read(uint32_t slot, void *dst, uint32_t size);
bool fm1_flash_write(uint32_t slot, const void *src, uint32_t size);
```

The application/UI/DSP must not depend on JieLi SDK headers directly. Only the platform implementation may do so; this keeps host tests and WASM emulation practical.
