# Felucca hardware port map

FMiniMug1 intentionally keeps its synthesizer, sequencer and UI state machine portable. The real M-VAVE FM-1 target is implemented behind `firmware/include/fm1_platform.h`.

Felucca 1.6.1 is the reference for the proven low-level FM-1 behavior. Felucca is GPL-3.0-only; any copied or adapted GPL implementation must retain its licence and attribution. This document describes integration points and does not copy Felucca source.

## Audio

Felucca's `firmware/hal/fm1_audio.h` drives ALNK0/I2S into the FM-1's external codec using a double-buffered DMA buffer. Its application fills the free half from the audio interrupt.

FMiniMug1 adapter responsibilities:

- allocate the stereo DMA buffer with the alignment required by the target;
- initialize the codec/ALNK0 through the Felucca-derived hardware layer;
- expose the free half as `fm1_audio_block_t`;
- render `fm_voice_process()` once per frame, convert float to signed 24-bit left-justified samples and write both channels;
- keep all synthesis allocation-free inside the audio path;
- acknowledge DMA interrupts only after the half-buffer is filled.

The first target should remain 48 kHz. `fm_patch_t.oversample_2x` oversamples only the oscillator/mixer/ladder path internally, not the hardware codec rate.

## Keys, buttons, encoders and LEDs

Felucca's `firmware/hal/fm1_input.h` documents an 11-column × 6-row diode matrix with 27 note keys, 14 buttons and seven encoders. It performs debouncing, encoder detent decoding and LED multiplexing.

The platform adapter should translate Felucca input state into one `fm1_input_frame_t` per main-loop iteration:

- `notes`, `note_pressed`, `note_released`: bits 0–26;
- `buttons`, `button_pressed`, `button_released`: FMiniMug1 logical button IDs;
- `encoder_delta[0..6]`: signed detent steps.

FMiniMug1 initially uses the first four logical encoders as the four on-screen parameter controls. Remaining hardware encoders can later be assigned to master/performance functions after the physical mapping is verified on a real unit.

The adapter is also responsible for mapping logical note/button LEDs back to Felucca's multiplexed LED arrays.

## LCD

Use the proven Felucca LCD initialization/transfer path, but keep all panel layout in `fm_ui.c`.

The UI assumes a 240×240 RGB565 target and only calls these primitives:

- begin frame;
- clear/fill;
- rectangle;
- text;
- present frame.

This deliberately prevents application code from depending on SPI/register details and lets the same layout be rendered by a host/WASM implementation.

## Flash

Reserve a dedicated FMiniMug1 flash region only after comparing the Felucca linker/package layout and the official V15 image map. Do not guess sectors on hardware.

Planned records:

1. settings + version/CRC;
2. user presets;
3. user sequences;
4. optional calibration data.

Every write path needs power-loss-safe versioning or two-slot journal semantics before it is enabled on hardware.

## MIDI and USB

The platform adapter will eventually expose:

- USB MIDI note/CC/SysEx input and output;
- TRS MIDI input;
- optional USB audio mirroring;
- installer/update transport.

The browser controller protocol stays outside the HAL. Hardware MIDI bytes are parsed by FMiniMug1 application code so host/WASM and hardware use the same protocol implementation.

## Boot, linker and package

Do not flash the current portable build. A real target requires the proven JieLi AC79/WL82 startup, linker, loader and package path.

Before the first hardware beta:

- build with the same JieLi toolchain/AC79 SDK combination used by the reference firmware;
- create the app and update loader separately;
- package an `.fwsc` with an FMiniMug1-specific identity;
- verify package bounds against a known official V15 reference image;
- refuse unknown device/package identities;
- provide SHA-256 hashes;
- verify return-to-official-V15 and FM-1-transporter recovery on a test unit.

## Port order

1. Bring up display only and render the six FMiniMug1 pages.
2. Bring up matrix scanning/encoders and verify every physical control against a diagnostic screen.
3. Bring up audio with a fixed sine, then route `fm_voice_process()`.
4. Add note scanning and monophonic note priority.
5. Add USB/TRS MIDI.
6. Add flash persistence only after the read-only target is stable.
7. Add loader/update/package last.

This order minimizes the chance that a UI or DSP mistake becomes a flashing/recovery problem.
