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
- The main web UI is the **virtual FM-1 hardware surface**, not a separate Minimoog/DAW layout.
- Visible controls must either work or be explicitly marked unavailable; never present decorative controls as functional.
- Scenes store all four parts, mixer/FX targets, tempo/swing and pattern assignments.
- Preserve diagnostic-first FM-1 bring-up and never generate a flashable `.fwsc` until real-device/recovery gates are passed.

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
- [x] Four physical-style encoder interactions: drag/wheel rotate, click encoder-press.
- [x] PC-keyboard + pointer/touch audition through the selected part.
- [x] Correct FM-1 OCT− / OCT+ keyboard-octave behavior in virtual mode.
- [x] Remove fake parameter labels that had no matching engine implementation.
- [x] Global MIXER / SCENE / CLOCK pages have working virtual state; unsupported FX controls show N/A.
- [x] SAVE stores a local virtual snapshot; SCENE page exposes explicit SAVE/LOAD encoder-press actions.
- [ ] Compile the actual native 240×240 renderer to WASM/canvas for pixel-identical preview.
- [ ] Move remaining browser-only global state into shared/native C state.

## Milestone C — 808 DRUM engine 🚧

- [x] Native synthesized BD / SD / CH / OH / clap / tom / cowbell / rim.
- [x] Per-voice level / tune / decay / tone for all 8 native voices.
- [x] Global accent amount and drive.
- [x] Native host stability + simultaneous-hit stress tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] Browser FM-1 keyboard-pad audition through the unified workstation WASM instance.
- [x] 16-step hit/accent pattern representation and four demo patterns.
- [x] Virtual KIT / TONE / MIX / SEQ / PERF pages wired to real implemented controls.
- [x] Native live step editing for STEP / HIT / ACCENT / VOICE.
- [x] Group mixer controls for BD / SD / HATS / PERC.
- [x] Performance fill and part mute in virtual mode.
- [ ] Add cymbal and expanded tom/conga variants if FM-1 budget permits.
- [ ] Mute/solo state in native workstation runtime rather than browser-only part level.
- [ ] 8+ original kits / 24+ patterns.
- [ ] Golden native/WASM renders.

## Milestone D — 808 BASS acid engine 🚧

- [x] Native saw/square oscillator, sub, drive and resonant filter.
- [x] Envelope modulation, accent and true slide retargeting without envelope retrigger.
- [x] Native accent/slide/stability tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] Live audition now uses the same unified workstation WASM instance as every other part.
- [x] Virtual OSC/FILTER/ENV controls.
- [x] Editable 16-step note/accent/slide/gate state.
- [x] Native sample-clock sequence setters allow live STEP / NOTE / ACCENT / SLIDE editing while running.
- [x] 6 original test presets and 4 original acid/bassline patterns.
- [x] PERF page controls shared tempo / swing / scene / play.
- [ ] 32/64-step editing and pattern paging.
- [ ] Transpose / rotate / mutation / scale lock.
- [ ] 24+ factory patterns.
- [ ] Golden native/WASM renders.

## Milestone E — ALPHA poly synth 🚧

- [x] Six-voice native polyphony with deterministic voice stealing.
- [x] DCO-style saw / pulse / sub / noise mix.
- [x] Resonant low-pass filter with envelope amount/keytrack.
- [x] VCA envelope/velocity modes, ADSR and LFO modulation.
- [x] Resource-bounded chorus modes OFF / I / II.
- [x] Native polyphony/envelope/chorus stability tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] DCO/VCF/VCA/ENV/LFO/CHORUS virtual pages.
- [x] Six-key polyphonic virtual hardware test through the unified workstation instance.
- [x] 8 original initial presets.
- [x] Real JieLi full-load image can link with six ALPHA voices + chorus and the other V2 engines.
- [x] Virtual chord selection/performance controls exist for scene testing.
- [ ] Native sample-clock ALPHA chord lane; current chord performance remains browser-controlled.
- [ ] PWM.
- [ ] Sustain pedal / chord memory.
- [ ] Stereo/pan implementation after workstation mixer becomes stereo.
- [ ] 32+ original factory presets.
- [ ] Real-device CPU measurement with six voices + chorus.

## Milestone F — Shared sequencer / song workflow 🚧

- [x] Portable native workstation sample-clock core with pair-preserving global swing and regression tests.
- [x] Unified WASM workstation renderer owns one sample-clock instance.
- [x] Native-clock drum lane bitmask triggering in unified WASM.
- [x] Native-clock bass note/accent/slide/gate lane in unified WASM.
- [x] Browser exposes native current-step metering from the render loop.
- [x] Public unified-WASM setters for sequence metadata, bass steps and drum steps.
- [x] Virtual FM-1 edits BASS and DRUM step data directly in native runtime while transport runs.
- [x] 16-step display strip shows active steps, edit cursor and native playhead.
- [ ] Migrate the FM-1 hardware runtime from legacy `fm_seq`/Studio transport to the V2 workstation clock.
- [ ] MINI sequence lane in unified workstation transport.
- [ ] ALPHA poly/chord lane.
- [ ] Independent pattern length per part while remaining phase coherent.
- [ ] Probability / microtiming / parameter locks / motion lanes.
- [ ] Pattern chains / song arrangement.
- [ ] Live record into selected melodic part.

## Milestone G — Mixer / FX / Scenes 🚧

- [x] Unified WASM mixer renders MINI + 808 DRUM + 808 BASS + ALPHA in one AudioWorklet instance.
- [x] Per-part level API and working virtual global MIXER page.
- [x] First 5 V2 demo scenes defined as regression material.
- [x] Scene selection can be changed from FM-1-style controls and reloaded during transport.
- [x] Shared BPM/swing controls update native sequence metadata.
- [x] Virtual local snapshot SAVE/LOAD is available for iterative testing.
- [ ] MINI patch/pattern loading inside V2 scenes instead of descriptive target only.
- [ ] ALPHA chord/pattern playback inside native scene transport.
- [ ] Four-part hardware mixer runtime.
- [ ] Global delay.
- [ ] Resource-bounded reverb/ambience.
- [ ] Master drive/limiter.
- [ ] Atomic scene recall at an audio-safe boundary.
- [ ] 12+ full factory scenes.

## Milestone H — Web editor + WASM virtual FM-1 🚧

### Virtual

- [x] Native C DSP for MINI, 808 DRUM, 808 BASS and ALPHA compiled into one WASM binary.
- [x] Unified `workstation` AudioWorklet mode for four-part mixing and native sample-clock testing.
- [x] Same part/page descriptor contract as hardware.
- [x] Virtual FM-1 is the only main browser surface; old Minimoog editor is not rendered.
- [x] Pointer/touch and PC keyboard play the currently selected part.
- [x] Encoders are controlled directly through React state, not DOM click bridges.
- [x] Audio failures are surfaced in UI with retry instead of failing silently.
- [x] Controls with no real engine implementation are disabled and display N/A.
- [x] Direct live DRUM/BASS native sequence editing is available on the FM-1 display/pages.
- [ ] Pixel-identical native 240×240 UI rendered to WASM/canvas.
- [ ] Deterministic WAV capture / regression render.
- [ ] Browser interaction tests for key-down/up, encoder turn/press, page navigation and transport.

### Editor

- [x] Part strip and hardware-oriented virtual shell.
- [x] Basic drum grid and bass sequence editing.
- [ ] Descriptor-driven expanded editor panels around the hardware simulator.
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
- [x] Flash writes disabled and no `.fwsc` generation.
- [x] V2 four-engine full-load compile/link stress image.
- [x] V2 stress image load: MINI 2× + 808 BASS + all 808 DRUM voices + six-voice ALPHA chorus.
- [x] V2 target image passes CI XIP/BSS/entry/safety checks and is published as NON-INSTALLABLE diagnostic artifact.
- [ ] Verify real button/encoder mapping on physical FM-1.
- [ ] Run `fminimug1-workstation-stress.bin` on real hardware and record LAST / MAX / OVER.
- [ ] Define quality degradation policy if `OVER` is nonzero, never random underruns.
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

1. Finish the direct FM-1 virtual interaction audit and add browser interaction regression tests.
2. Add native ALPHA chord lane and MINI lane to the shared transport.
3. Move global mixer/scene state into native C and replace remaining browser-only state.
4. Implement resource-bounded global delay/ambience, keeping unsupported FX controls marked N/A until real.
5. Compile the native 240×240 renderer to WASM/canvas.
6. Verify physical FM-1 control IDs and run the V2 workstation stress image.
7. Tune quality/polyphony from measured FM-1 MAX/OVER, then build the first mapped hardware beta.
8. Only after recovery validation consider installable packaging.

## Current safety status

The new V2 architecture is the active development path. Legacy dual-MINI Studio code remains only as a temporary regression path and should be removed after the V2 hardware mixer/runtime replaces it. Flash writes remain disabled and no `.fwsc` should be produced until physical-device control, CPU and recovery gates are complete.
