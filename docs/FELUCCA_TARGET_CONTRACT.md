# Felucca target adapter contract

This document freezes the boundary for the first real M-VAVE FM-1 bring-up. The goal is to implement `firmware/include/fm1_platform.h` on top of the proven Felucca/JieLi hardware layer while keeping all FMiniMug1 synth, UI, held-note and sequencer logic in portable code.

## Safety boundary

The first target build is a **bring-up build**, not an installer release.

It may initialize display, input scanning, LEDs, audio output and MIDI. It must not erase/write firmware flash, publish an `.fwsc` as safe, or add an automatic installer path. `fm1_platform_flash_write()` must return failure until the package bounds, identity checks, recovery workflow and real-device smoke test have all been completed.

## Source/licence boundary

Felucca is GPL-3.0-only. If target code copies, adapts, links or incorporates Felucca implementation code, the resulting distribution must preserve the applicable GPL source/licence/attribution obligations. Keep portable FMiniMug1 modules separated from the target adapter so this dependency is explicit.

## Current Felucca hardware facts used by the adapter

### Audio

Felucca's FM-1 audio HAL exposes ALNK0/I2S DMA using an interleaved stereo buffer with 24-bit samples left-justified in 32-bit words. Its public HAL uses `fm1_audio_init(...)` plus pending/ack/free-half helpers around the double-buffered DMA path.

FMiniMug1 already produces exactly that sample representation through `fm_app_render_audio()` and `fm1_audio_block_t`.

Target mapping:

```text
Felucca ALNK0 free half
        ↓
fm1_platform_audio_acquire()
        ↓
fm_app_render_audio()
        ↓
interleaved L/R signed 24-bit left-justified words
        ↓
fm1_platform_audio_submit()
        ↓
Felucca ALNK0 acknowledge / next half
```

The target adapter must not allocate or copy audio in the real-time path if the DMA half-buffer can be exposed directly as `fm1_audio_block_t.samples`.

### Input

The current Felucca FM-1 input HAL documents:

- 11 × 6 scanned matrix
- 27 note keys
- 14 buttons
- 7 encoders
- note state represented as a 27-bit field
- button state represented separately
- encoder movement available as signed deltas/state

The first real-device build should boot directly to `fm_diag_render_input()` and verify every physical control before the synth UI trusts button IDs.

Required platform-frame mapping:

```text
Felucca current notes       → fm1_input_frame_t.notes
new note edges              → note_pressed
released note edges         → note_released
Felucca current buttons     → buttons
new button edges            → button_pressed
released button edges       → button_released
seven encoder deltas        → encoder_delta[0..6]
```

Do not infer the semantic names of all 14 buttons from matrix position. Record them from the diagnostic screen on a real unit, then freeze the mapping in the adapter.

### Display

Felucca drives the FM-1's 240 × 240 RGB565 LCD through its SPI/LCD HAL and ST7789-style panel command layer. FMiniMug1 deliberately asks for only five primitives:

```text
lcd_begin
lcd_fill
lcd_rect
lcd_text
lcd_present
```

The target adapter may implement these by adapting Felucca's LCD implementation or by a small FMiniMug1 renderer over the same low-level HAL. Do not make the portable UI aware of SPI commands, display offsets or panel initialization.

For the first bring-up target, correctness is more important than batching sophistication. After the diagnostic and synth screens are correct on hardware, optimize rectangle/text batching if LCD traffic competes with audio timing.

### Time, LEDs and MIDI

- `fm1_platform_millis()` should use the same monotonic target tick source used by the Felucca firmware runtime.
- note/button LED calls should be mapped only after physical LED indices are verified.
- `fm1_platform_midi_send()` may initially be a no-op during display/audio bring-up, then bind to Felucca USB/TRS MIDI after the native receive parser exists.

## First target implementation layout

Recommended target-only files:

```text
firmware/target/felucca/
  fm1_platform_felucca.c     # implements fm1_platform.h
  fm1_lcd_bridge.c           # RGB565/text bridge if required
  fm1_target_main.c          # selects diagnostic or synth runtime
  README.md                  # exact Felucca revision/toolchain instructions
```

Portable files used unchanged:

```text
firmware/src/fm_voice.c
firmware/src/fm_seq.c
firmware/src/fm_ui.c
firmware/src/fm_app.c
firmware/src/fm_diag.c
```

## Bring-up gates

A target build may advance only in this order:

1. **Display diagnostic** — boot, clear screen, text/rectangles stable for repeated refreshes.
2. **Input diagnostic** — verify 27 keys, 14 buttons and seven encoders using raw IDs.
3. **Audio diagnostic** — fixed bounded tone, then FMiniMug1 voice, with no underruns/clicks.
4. **Runtime integration** — `fm_app_tick()`/interrupt equivalent, octave-safe releases and mono priority verified.
5. **MIDI** — note input and parameter protocol.
6. **Read-only flash identification** — inspect identity/layout without erase/write.
7. **Packaging/recovery** — only after linker/package bounds and return-to-stock recovery are proven on a sacrificial/test unit.

No step in 1–5 requires a firmware flash-write API in FMiniMug1 itself.
