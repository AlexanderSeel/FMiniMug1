# FMiniMug1 Felucca / JieLi target

This directory contains the first real M-VAVE FM-1 target adapter for FMiniMug1. It is intentionally a **diagnostic-first bring-up target**, not a release firmware and not a safe `.fwsc` package.

## What is implemented

- Felucca 24 MHz TIMER4 time base → `fm1_platform_millis()`.
- Felucca 11×6 matrix scan → raw 27-note and 14-button state/edges.
- All seven Felucca encoder deltas exposed in diagnostic mode.
- ALNK0/I2S double-buffer DMA at the native ~44.1176 kHz rate.
- 128-frame stereo DMA halves rendered directly from the ALNK0 IRQ.
- 24-bit left-justified output compatible with `fm_app_render_audio()`.
- IRQ-safe render timing statistics for every ALNK half-buffer.
- Autonomous 1×/2× oversampling CPU-budget diagnostic.
- ST7789-class 240×240 RGB565 display bring-up over Felucca's SPI HAL.
- Minimal target font sufficient for diagnostics and the initial synth UI.
- LED helpers through Felucca's matrix LED mapping.
- Diagnostic-first target `main()`.
- Minimal target bootstrap and freestanding libc subset.
- Real pi32v2 soft-float runtime (`libcompiler-rt.a`) linked for the synth/audio targets.
- Flash read/write disabled.
- MIDI transmit disabled until the native MIDI parser/transport is integrated.

Target source files are GPL-3.0-only because they are intended to build against Felucca's GPL-3.0-only HAL.

## Real-toolchain status

GitHub Actions now installs the JieLi pi32v2 toolchain through Felucca's toolchain bootstrap, checks out the pinned Felucca HAL revision `a53ecf428c29c780108fd70a31b71a32a6b5c313`, and successfully compiles/links three standalone target images:

| Target | Size | Purpose |
| --- | ---: | --- |
| `fminimug1-diag.bin` | 4,984 B | raw LCD/input bring-up |
| `fminimug1-audio-check.bin` | 10,272 B | autonomous DSP/ALNK timing test |
| `fminimug1-synth-check.bin` | 16,656 B | complete synth/runtime link verification with synthetic control IDs |

All three use `_start = 0x02000120`, stay inside Felucca's linker bounds, pass the no-chip-ROM-reference check, and are hashed in CI. None is packaged as `.fwsc` and none is currently declared safe to flash.

The full synth link check uses `pi32v2/lib/libcompiler-rt.a` for the compiler's software floating-point helpers. This is a deliberate, explicit dependency of the current float DSP implementation.

## Build locally

With a Felucca checkout and JieLi toolchain already installed:

```bash
export FELUCCA_SRC=/path/to/Felucca
export JIELI_TOOLCHAIN=/path/to/jieli/toolchain

# Raw input/display diagnostic
python3 scripts/build_felucca_diag.py

# Audio CPU-budget diagnostic
python3 scripts/build_felucca_diag.py --audio-check

# Complete synth link verification using synthetic control IDs
python3 scripts/build_felucca_diag.py --synth-check
```

Output is written under `build/felucca-target/`. The builder deliberately stops at standalone `.elf` / `.bin` verification artifacts and never creates an `.fwsc`.

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
firmware/hal/fm1_sys.h
firmware/hal/fm1_cc.h
firmware/hal/fm1_isr.S
firmware/hal/fm1_vec.S
firmware/crt0.S
firmware/app.ld
```

`fm1_isr.S` provides the `isr_alnk0` assembly wrapper. The adapter provides `fm1_alnk0_irq()` and currently keeps `fm1_timer5_irq()` as a no-op because first bring-up uses the safe polled input scanner.

Portable FMiniMug1 files used by the full target are:

```text
firmware/src/fm_voice.c
firmware/src/fm_seq.c
firmware/src/fm_ui.c
firmware/src/fm_app.c
firmware/src/fm_diag.c
```

and headers under `firmware/include/`.

## First-device test order

The real-toolchain link succeeding does **not** prove that the images boot correctly on a physical FM-1. Hardware bring-up should stay in this order.

### 1. Raw display/input diagnostic

Start with the raw diagnostic and record this table while operating each physical control:

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
- each encoder produces positive steps clockwise and negative steps counter-clockwise;
- no button or encoder operation causes a second unrelated raw bit to toggle.

Do not enable normal synth mode until those IDs have been recorded.

### 2. Autonomous audio-budget diagnostic

This mode does **not** need the semantic button mapping. It starts a fixed stress patch and alternates the DSP between 1× and 2× oversampling every five seconds.

The ALNK DMA half-buffer is exactly 128 frames. With the FM-1's 24 MHz TIMER4 and 544 ticks per audio frame, one render window has:

```text
128 × 544 = 69,632 ticks
69,632 / 24,000,000 = 2.901333 ms
```

The screen displays:

- `LAST` — render ticks for the latest completed DMA half;
- `MAX` — worst render time in the current five-second mode window;
- `OVER` — count of renders exceeding 69,632 ticks;
- `IRQS` — number of measured ALNK half-buffer callbacks;
- a horizontal load bar with the 100% budget marker.

Timing stats are snapshotted/reset under Felucca's IRQ critical section so the main-loop display cannot observe a partially updated measurement.

**Acceptance requirement:** `OVER` must remain `0` for both modes. For deciding whether 2× should become the normal default, keep substantial additional headroom for MIDI, UI, sequencer and future modulation work rather than accepting a result merely because it is below 100%.

Also listen for clicks, repeated blocks, pitch instability or audio dropout while the LCD is refreshing. A zero `OVER` counter does not replace an audible smoke test.

### 3. Normal synth runtime

Only after the physical control IDs are verified should they be supplied as the semantic mapping macros and a normal synth target be built.

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
FMM_TARGET_AUDIO_DIAGNOSTIC=0
FMM_BUTTON_MAP_VERIFIED=1
```

The adapter converts raw button/encoder IDs into the semantic `fm1_platform.h` ordering before the portable application sees them. This prevents the synth from silently depending on an assumed matrix layout.

The synthetic values used by GitHub Actions exist **only** to compile/link-check this code path and are not FM-1 hardware mappings.

## Audio architecture

Normal synth mode initializes `fm_app_t` at `24,000,000 / 544 ≈ 44,117.647 Hz` and registers `fm_app_render_audio()` as the ALNK0 half-buffer renderer.

Audio rendering occurs in `fm1_alnk0_irq()`, not in the LCD/input main loop. This is deliberate: display SPI activity must not delay audio until the next main-loop iteration.

Initial DMA geometry:

```text
128 frames / half
2 channels
int32 words
24-bit PCM left-justified
```

The current DSP is floating point and therefore links the JieLi pi32v2 compiler runtime. The real audio-budget diagnostic exists specifically to determine whether that architecture has enough FM-1 CPU headroom before further DSP complexity is added.

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
2. audio timing/underrun/click test,
3. normal runtime smoke test,
4. linker/firmware-region validation,
5. read-only device identity validation,
6. known-good stock V15 return path,
7. FM-1-transporter recovery validation.

Only then should `.fwsc` packaging become part of the target build.

## CI

Normal host CI compile-checks the platform adapter with Felucca HAL stubs in raw-diagnostic, audio-diagnostic and synthetic mapped-synth configurations.

A separate FM-1 target workflow then uses the actual JieLi pi32v2 compiler/linker and pinned Felucca HAL to build all three target modes. It checks entry address, linker bounds, disassembly for forbidden chip-ROM references, hashes, safety metadata and confirms that no `.fwsc` exists.

These checks establish source/toolchain/linker compatibility. Real-device validation is still required before any image is treated as flashable firmware.
