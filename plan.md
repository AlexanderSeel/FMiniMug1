# FMiniMug1 Workstation Plan

## Product vision

Build a compact four-part performance workstation for the M-VAVE FM-1 around four distinct classic-inspired instruments:

1. **MINI** — the existing three-oscillator / ladder monophonic synth. Keep exactly one instance and preserve its character.
2. **808 DRUM** — an original analog drum-machine engine inspired by classic 808-style synthesis and sequencing.
3. **808 BASS** — an original acid/bassline monosynth with accent and slide behavior.
4. **ALPHA** — an original six-voice DCO/VCF/VCA poly synth inspired by Alpha-Juno-era architecture and performance controls.

The implementation uses original DSP, UI graphics, presets and patterns. Roland/Moog branding, ROMs, factory presets and trade dress are not copied.

## Non-negotiable architecture rules

- Hardware and virtual mode use the **same instrument/page/parameter model** generated from `shared/workstation.json`.
- Every normal page exposes exactly four primary controls because the FM-1 has four main encoders.
- WASM uses the same native C DSP/state/transport code as hardware wherever practical.
- One shared sample-clock transport drives workstation patterns.
- Scenes store all four parts, mixer/FX targets, tempo/swing and pattern assignments.
- Preserve diagnostic-first FM-1 bring-up and never generate a flashable `.fwsc` until real-device/recovery gates are passed.

## Melodee inspiration

Use `keremimo/melodee` as workflow/reference inspiration only:

- part/track-centric selection;
- descriptor-driven pages and parameter metadata;
- one protocol/state model for hardware and editor;
- live editor updates without forcing device page changes;
- rich step data such as accent/slide/probability/motion;
- capability/version discovery rather than editor assumptions;
- compact hardware interaction with a richer browser editor.

Do not copy Melodee assets, fonts, visual trade dress or substantial source code.

## Milestone A — MINI foundation ✅ / maintenance

- [x] Native three-oscillator Mini-style voice.
- [x] PolyBLEP saw/pulse/square and integrated triangle.
- [x] Ladder-style nonlinear filter, drive, feedback and drift.
- [x] Independent filter/loudness contours.
- [x] Classic oscillator ranges, glide modes and decay-link switches.
- [x] Mono priority/retrigger/legato behavior.
- [x] Native sequencer and WASM AudioWorklet integration.
- [x] 240×240 native UI and Felucca target adapter.
- [x] Raw input and audio-budget diagnostics.
- [x] Real JieLi compile/link CI with flash writes disabled.
- [ ] Remove transitional dual-MINI Studio code after V2 mixer/runtime replaces it.
- [ ] Final filter/reference calibration and golden audio tests.

## Milestone B — Canonical workstation UI/state 🚧

Source of truth: `shared/workstation.json`.

- [x] Define MINI / 808 DRUM / 808 BASS / ALPHA parts.
- [x] Define hardware-safe four-control pages for every part.
- [x] Generate native C and TypeScript descriptors.
- [x] CI regenerates descriptors and fails on drift.
- [x] Native part/page/focus/HOLD state machine.
- [x] Native navigation parity tests.
- [x] Browser FM-1 shell driven by the same generated descriptors.
- [x] Simulated page buttons, HOLD and four encoders.
- [ ] Global pages: MIXER / FX / SCENE / CLOCK.
- [ ] Compile the actual native 240×240 renderer to WASM/canvas for pixel-identical preview.
- [ ] Replace remaining manually-maintained legacy editor page definitions with descriptors.

## Milestone C — 808 DRUM engine 🚧

- [x] Native synthesized BD.
- [x] Native synthesized SD.
- [x] CH / OH metallic/noise voices.
- [x] Clap multi-burst noise envelope.
- [x] Tom/conga style voice.
- [x] Cowbell dual-square metallic voice.
- [x] Rim voice.
- [x] Per-voice level / tune / decay / tone.
- [x] Global accent amount and drive.
- [x] Native host stability + simultaneous-hit stress tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] Browser FM-1 keyboard-pad audition.
- [x] 16-step hit/accent pattern representation and four demo patterns.
- [x] Virtual KIT/MIX/basic TONE/SEQ/PERF controls.
- [ ] Add cymbal and expanded tom/conga variants if FM-1 budget permits.
- [ ] Implement true snappy/attack/color parameters currently marked NEXT.
- [ ] Flam, probability and performance fill.
- [ ] Mute/solo.
- [ ] 8+ original kits / 24+ patterns.
- [ ] Golden native/WASM renders.

## Milestone D — 808 BASS acid engine 🚧

- [x] Native saw/square oscillator.
- [x] Optional sub layer and drive.
- [x] Resonant original acid-style filter.
- [x] Envelope modulation and decay workflow.
- [x] Accent affects filter/drive/output character.
- [x] True slide retargeting without envelope retrigger.
- [x] Native accent/slide/stability tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] Virtual OSC/FILTER/ENV controls.
- [x] Editable 16-step note/accent/slide/octave view.
- [x] 6 original test presets.
- [x] 4 original acid/bassline patterns.
- [x] Pattern PLAY/STOP and live audition in virtual UI.
- [ ] 32/64-step editing and pattern paging.
- [ ] Transpose / rotate / mutation / scale lock.
- [ ] 24+ factory patterns.
- [ ] Golden native/WASM renders.

## Milestone E — ALPHA poly synth 🚧

- [x] Six-voice native polyphony with deterministic voice stealing.
- [x] DCO-style saw / pulse / sub / noise mix.
- [x] Resonant low-pass filter with envelope amount/keytrack.
- [x] VCA envelope/velocity modes.
- [x] ADSR.
- [x] LFO rate/delay with DCO/VCF modulation.
- [x] Resource-bounded chorus modes OFF / I / II.
- [x] Native polyphony/envelope/chorus stability tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] DCO/VCF/VCA/ENV/LFO/CHORUS virtual pages.
- [x] Six-key polyphonic virtual hardware test.
- [x] 8 original initial presets including strings/brass/pads/keys/hoover-like tests.
- [x] Real JieLi full-load image can link with six ALPHA voices + chorus and the other V2 engines.
- [ ] PWM.
- [ ] Sustain pedal / chord memory / chord sequencer.
- [ ] Stereo/pan implementation after workstation mixer becomes stereo.
- [ ] 32+ original factory presets.
- [ ] Real-device CPU measurement with six voices + chorus.

## Milestone F — Shared sequencer / song workflow 🚧

- [x] Portable native workstation sample-clock core.
- [x] Pair-preserving global swing in the new clock.
- [x] Clock timing regression tests.
- [x] Unified WASM workstation renderer owns one sample-clock instance.
- [x] Native-clock drum lane bitmask triggering in unified WASM.
- [x] Native-clock bass note/accent/slide/gate lane in unified WASM.
- [x] Browser exposes native current-step metering from the render loop.
- [ ] Migrate the FM-1 hardware runtime from legacy `fm_seq`/Studio transport to the V2 workstation clock.
- [ ] MINI sequence lane in unified workstation transport.
- [ ] ALPHA poly/chord lane.
- [ ] Independent pattern length per part while remaining phase coherent.
- [ ] Probability / microtiming.
- [ ] Parameter locks / motion lanes.
- [ ] Pattern chains / song arrangement.
- [ ] Live record into selected melodic part.

## Milestone G — Mixer / FX / Scenes 🚧

- [x] Unified WASM mixer can render MINI + 808 DRUM + 808 BASS + ALPHA in one AudioWorklet instance.
- [x] Per-part level API in unified native/WASM mixer.
- [x] First 5 V2 demo scenes defined as regression material.
- [x] Browser NATIVE CLOCK scene transport for BASS + DRUM with ALPHA patch loading.
- [ ] MINI patch/pattern loading inside V2 scenes instead of descriptive target only.
- [ ] ALPHA chord/pattern playback inside scenes.
- [ ] Four-part hardware mixer runtime.
- [ ] Global delay.
- [ ] Resource-bounded reverb/ambience.
- [ ] Master drive/limiter.
- [ ] Atomic scene recall at an audio-safe boundary.
- [ ] 12+ full factory scenes.

## Milestone H — Web editor + WASM virtual FM-1 🚧

### Virtual

- [x] Native C DSP for MINI, 808 DRUM, 808 BASS and ALPHA compiled into one WASM binary.
- [x] Individual AudioWorklet modes for engine isolation tests.
- [x] Unified `workstation` AudioWorklet mode for four-part mixing and native sample-clock testing.
- [x] Same part/page/focus/HOLD descriptor contract as hardware.
- [x] Virtual controls for DRUM/BASS/ALPHA core parameters.
- [x] Native-clock scene test strip with step/peak telemetry.
- [ ] Pixel-identical native 240×240 UI rendered to WASM/canvas.
- [ ] Route all virtual hardware controls exclusively through unified workstation state/audio instead of transitional individual engine controllers.
- [ ] Deterministic WAV capture / regression render.

### Editor

- [x] Part strip and hardware-oriented virtual shell.
- [x] Basic drum grid and bass sequence editing.
- [ ] Descriptor-driven full editor panels.
- [ ] Large drum sequencer editor.
- [ ] Full bassline editor.
- [ ] Alpha poly/chord editor.
- [ ] Mixer / FX / Scene editor.
- [ ] Hardware live sync via SysEx/USB-MIDI.
- [ ] Capability/version handshake.
- [ ] Project import/export.

## Milestone I — Presets / demos / regression content 🚧

- [x] Existing MINI factory content retained.
- [x] 4 initial 808 DRUM demo patterns.
- [x] 6 initial 808 BASS presets.
- [x] 4 initial 808 BASS accent/slide patterns.
- [x] 8 initial ALPHA presets.
- [x] 5 initial full V2 scene definitions.
- [ ] 8+ drum kits / 24+ drum patterns.
- [ ] 24+ bass patterns.
- [ ] 32+ ALPHA presets.
- [ ] 12+ full four-part scenes.
- [ ] Per-engine calibration content and golden renders.

## Milestone J — Hardware bring-up / release safety 🚧

- [x] Raw control/LCD diagnostic image.
- [x] MINI audio budget diagnostic.
- [x] Real JieLi compile/link workflow.
- [x] Flash writes disabled.
- [x] No `.fwsc` generation.
- [x] V2 four-engine full-load **compile/link** stress image.
- [x] V2 stress image load: MINI 2× + 808 BASS + all 808 DRUM voices + six-voice ALPHA chorus.
- [x] V2 target image passes CI XIP/BSS/entry/safety checks and is published as NON-INSTALLABLE diagnostic artifact.
- [ ] Verify real button/encoder mapping on physical FM-1.
- [ ] Run `fminimug1-workstation-stress.bin` on real hardware and record LAST / MAX / OVER.
- [ ] Define quality degradation policy if `OVER` is nonzero (polyphony / MINI oversampling / chorus quality), never random underruns.
- [ ] Build mapped four-part hardware runtime after control IDs and CPU budget are verified.
- [ ] Read-only identity validation.
- [ ] Validate stock V15 return/recovery path.
- [ ] Only then create a mapped hardware beta.
- [ ] Only after recovery validation consider `.fwsc` packaging.

## Current real-target facts

Pinned Felucca HAL revision: `a53ecf428c29c780108fd70a31b71a32a6b5c313`.

The target workflow currently produces only non-installable diagnostics including:

```text
fminimug1-diag.bin
fminimug1-audio-check.bin
fminimug1-studio-stress.bin        # legacy regression
fminimug1-workstation-stress.bin   # V2 target load
fminimug1-synth-check.bin          # synthetic controls, do not use as mapped firmware
```

`fminimug1-workstation-stress.bin` is compiled with the real pi32v2 toolchain and includes the four target engines, but successful CI linking does **not** establish that real-time CPU budget is safe. On-device `OVER` must remain `0`.

## Immediate implementation order

1. Finish migration to the unified workstation WASM controller and native sample clock.
2. Add ALPHA chord lane and MINI lane to the shared transport.
3. Implement global mixer/FX/Scene state in native C.
4. Compile the native 240×240 renderer to WASM/canvas.
5. Verify physical FM-1 control IDs and run the V2 workstation stress image.
6. Tune quality/polyphony from measured FM-1 `MAX/OVER`, then build the first mapped hardware beta.
7. Only after recovery validation consider installable packaging.

## Current safety status

The new V2 architecture is now the active development path. Legacy dual-MINI Studio code remains only as a temporary regression path and should be removed after the V2 hardware mixer/runtime replaces it. Flash writes remain disabled and no `.fwsc` should be produced until physical-device control, CPU and recovery gates are complete.
