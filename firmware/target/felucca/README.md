# FMiniMug1 Felucca / JieLi target

This directory contains the first real M-VAVE FM-1 target adapter for FMiniMug1. It is intentionally a **diagnostic-first bring-up target**, not a release firmware and not a safe `.fwsc` package.

## What is implemented

- Felucca 24 MHz TIMER4 time base → `fm1_platform_millis()`.
- Felucca 11×6 matrix scan → raw 27-note and 14-button state/edges.
- All seven Felucca encoder deltas exposed in diagnostic mode.
- ALNK0/I2S double-buffer DMA at the native ~44.1176 kHz rate.
- 128-frame stereo DMA halves rendered directly from the ALNK0 IRQ.
- 24-bit left-justified output compatible with `fm_app_render_audio()`.
- ST7789-class 240×240 RGB565 display bring-up over Felucca's SPI HAL.
- Minimal target font sufficient for diagnostics and the initial synth UI.
- LED helpers through Felucca's matrix LED mapping.
- Diagnostic-first target `main()`.
- Flash read/write disabled.
- MIDI transmit disabled until the native MIDI parser/transport is integrated.

Target source files are GPL-3.0-only because they are intended to build against Felucca's GPL-3.0-only HAL.

## Default build mode: raw diagnostic

`fm1_target_main.c` defaults to:

```c
#define FMM_TARGET_DIAGNOSTIC 1
```

The target initializes only time, matrix input and LCD, then continuously shows:

- current 27-bit note field
- note press edges
- note release edges
- current raw 14-bit button field
- raw button press edges
- raw encoder deltas 0–6

No audio is started in the default diagnostic mode. No flash operation is available.

## Required Felucca pieces

The adapter expects these Felucca HAL files to be available on the target include path/build:

```text
firmware/hal/fm1_audio.h
firmware/hal/fm1_input.h
firmware/hal/fm1_lcd_hw.h
firmware/hal/fm1_time.h
firmware/hal/fm1_gpio.h
firmware/hal/fm1_irq.h
firmware/hal/fm1_cc.h
firmware/hal/fm1_isr.S
```

`fm1_isr.S` must provide the `isr_alnk0` assembly wrapper. The adapter provides the C handler symbol `fm1_alnk0_irq()` that the wrapper calls.

Portable FMiniMug1 files used by the target:

```text
firmware/src/fm_voice.c
firmware/src/fm_seq.c
firmware/src/fm_ui.c
firmware/src/fm_app.c
firmware/src/fm_diag.c
```

and headers under `firmware/include/`.

## First-device procedure

Do not start by enabling the normal synth mode. The first hardware build should stay in diagnostic mode and record the following table while physically operating every control:

| Semantic control | Raw button/encoder ID | Verified |
| --- | ---: | :---: |
| OCT DOWN | | ☐ |
| OCT UP | | ☐ |
| PAGE LEFT | | ☐ |
| PAGE RIGHT | | ☐ |
| PRESET | | ☐ |
| PATTERN | | ☐ |
| PLAY | | ☐ |
| HOLD | | ☐ |
| ENCODER 1 press | | ☐ |
| ENCODER 2 press | | ☐ |
| ENCODER 3 press | | ☐ |
| ENCODER 4 press | | ☐ |
| ENCODER 1 rotation | | ☐ |
| ENCODER 2 rotation | | ☐ |
| ENCODER 3 rotation | | ☐ |
| ENCODER 4 rotation | | ☐ |

Also verify:

- note bit 0 is the physical F3 key expected by the Felucca HAL;
- all 27 note bits are unique and ordered;
- every note produces one press edge and one release edge;
- each encoder produces + steps clockwise and − steps counter-clockwise;
- no button or encoder operation causes a second unrelated raw bit to toggle.

## Enabling synth mode after mapping verification

The target deliberately refuses to compile the normal synth entry point unless `FMM_BUTTON_MAP_VERIFIED` is defined.

A real mapped build must define all of these with values captured from the diagnostic screen:

```text
FMM_BTN_RAW_OCT_DOWN
FMM_BTN_RAW_OCT_UP
FMM_BTN_RAW_PAGE_LEFT
FMM_BTN_RAW_PAGE_RIGHT
FMM_BTN_RAW_PRESET
FMM_BTN_RAW_PATTERN
FMM_BTN_RAW_PLAY
FMM_BTN_RAW_HOLD
FMM_BTN_RAW_ENC1
FMM_BTN_RAW_ENC2
FMM_BTN_RAW_ENC3
FMM_BTN_RAW_ENC4
FMM_ENC_RAW_1
FMM_ENC_RAW_2
FMM_ENC_RAW_3
FMM_ENC_RAW_4
```

Then build with:

```text
FMM_TARGET_DIAGNOSTIC=0
FMM_BUTTON_MAP_VERIFIED=1
```

The adapter converts raw button/encoder IDs into the semantic `fm1_platform.h` ordering before the portable application sees them. This prevents the synth from silently depending on an assumed matrix layout.

The synthetic values used by GitHub Actions exist **only** to compile-check this code path and are not FM-1 hardware mappings.

## Audio mode

Normal synth mode initializes `fm_app_t` at `24,000,000 / 544 ≈ 44,117.647 Hz` and registers `fm_app_render_audio()` as the ALNK0 half-buffer renderer.

Audio rendering occurs in `fm1_alnk0_irq()`, not in the LCD/input main loop. This is deliberate: display SPI activity must not delay audio until the next main-loop iteration.

Initial DMA geometry:

```text
128 frames / half
2 channels
int32 words
24-bit PCM left-justified
```

This should be measured on real hardware before changing oversampling or increasing UI work.

## Flash safety

Both of these currently return failure unconditionally:

```c
fm1_platform_flash_read(...)
fm1_platform_flash_write(...)
```

and:

```c
fm1_felucca_flash_write_enabled() == 0
```

Do not replace this gate simply to produce a package. Flash support comes after:

1. diagnostic LCD/input verification,
2. audio underrun/click test,
3. normal runtime smoke test,
4. linker/firmware-region validation,
5. read-only device identity validation,
6. known-good stock V15 return path,
7. FM-1-transporter recovery validation.

Only then should `.fwsc` packaging become part of the target build.

## CI

The normal CI does not pretend to compile the JieLi SDK. Instead it compile-checks these target sources with small Felucca HAL stubs under `tests/felucca_stub/`.

CI compiles both:

- the default raw diagnostic branch;
- a synthetic `FMM_BUTTON_MAP_VERIFIED` branch to exercise semantic mapping code.

The latter is only a structural test and does not certify any physical FM-1 mapping.
