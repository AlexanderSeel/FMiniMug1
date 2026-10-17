# FMiniMug1 Workstation Plan

## Product vision

Build a compact four-part performance workstation for the M-VAVE FM-1 around four distinct classic-inspired instruments:

1. **MINI** — the existing three-oscillator / ladder monophonic synth. Keep exactly one instance and preserve its character.
2. **808 DRUM** — an original analog drum-machine engine inspired by classic 808-style synthesis and sequencing.
3. **808 BASS** — an original acid/bassline monosynth with accent and slide behavior.
4. **ALPHA** — an original six-voice DCO/VCF/VCA poly synth inspired by Alpha-Juno-era architecture and performance controls.

The implementation uses original DSP, UI graphics, presets and patterns. Roland/Moog branding, ROMs and factory binary data are not copied.

## Non-negotiable architecture rules

- Hardware and virtual mode use the **same instrument/page/parameter model** generated from `shared/workstation.json`.
- Every normal page exposes exactly four primary controls because the FM-1 has four main encoders.
- WASM uses the same native C DSP/state/transport code as hardware wherever practical.
- One shared sample-clock transport drives workstation patterns.
- The main web UI is the **virtual FM-1 hardware surface**, not a separate Minimoog/DAW layout.
- Visible controls must either work or be explicitly marked unavailable; never present decorative controls as functional.
- Scenes store all four parts, mixer/FX targets, tempo/swing and pattern assignments.
- Preserve diagnostic-first FM-1 bring-up and never generate a flashable `.fwsc` until real-device/recovery gates are passed.
- Virtual beta releases may be installable on Windows before FM-1 firmware is declared installable; the two release states must stay explicit and separate.

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
- [x] Global MIXER / SCENE / CLOCK pages have working virtual state.
- [x] Native global FX page with delay / ambience / drive / master.
- [x] SAVE stores a local virtual snapshot; SCENE page exposes explicit SAVE/LOAD encoder-press actions.
- [x] MINI / DRUM / BASS / ALPHA SEQ pages map to real sample-clock lane state.
- [x] Virtual panel rebuilt around one 27-key FM-1 silicone keybed instead of a duplicated fake function-key row.
- [x] Physical left-control labels preserved as MASTER / SELECT / PRESETS / ALGORITHM.
- [x] Active browser surface consolidated to one implementation (`FM1WorkstationNext`); obsolete parallel surface removed.
- [x] Virtual-UI contract CI rejects duplicate surfaces, broken 27-key maps and Alpha-Dial/transport hook drift.
- [x] Compact PC-key hints displayed directly on the virtual 27-key bed without adding a second keyboard row.
- [ ] Compile the actual native 240×240 renderer to WASM/canvas for pixel-identical preview.
- [x] Mixer / master / FX / clock / transport / scene selection / ALPHA Dial selection, focus, Tone Modify amounts and Alpha patch readback use a compact pointer-free native indexed ABI.
- [x] Alpha Juno main screen uses explicit PARAMETER SELECT, VALUE, MOD RATE, MOD DEPTH, BRILLIANCE and ENV TIME buttons; turning ALPHA DIAL performs the selected action.
- [x] Virtual ALPHA Dial reads its parameter, three-state focus, macro and macro amounts from the native runtime when the page becomes active.
- [ ] Move remaining browser-owned patches, presets and sequencer data into shared/native C state.

## Milestone C — 808 DRUM engine 🚧

- [x] Native synthesized BD / SD / CH / OH / clap / tom / cowbell / rim.
- [x] Per-voice level / tune / decay / tone for all 8 native voices.
- [x] Global accent amount and drive.
- [x] Native host stability + simultaneous-hit stress tests.
- [x] Native C engine exported to WASM/AudioWorklet.
- [x] Browser FM-1 keyboard-pad audition through the unified workstation WASM instance.
- [x] 16-step hit/accent pattern representation.
- [x] 4 energetic regression patterns + 4 calmer/spacious demo patterns.
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
- [x] Live audition uses the same unified workstation WASM instance as every other part.
- [x] Virtual OSC/FILTER/ENV controls.
- [x] Editable 16-step note/accent/slide/gate state.
- [x] Native sample-clock sequence setters allow live STEP / NOTE / ACCENT / SLIDE editing while running.
- [x] 6 original test presets.
- [x] 4 energetic acid/bassline patterns + 4 calmer/spacious demo patterns.
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
- [x] Native PWM / pulse width / PWM rate-depth.
- [x] Native HPF, DCO range and DCO envelope pitch modulation.
- [x] Dedicated ALPHA DIAL main page with parameter navigation and live value editing.
- [x] Alpha Juno PARAMETER SELECT and VALUE modes are explicitly selected; ALPHA DIAL clicks and unrelated encoders no longer change modes.
- [x] Four direct Tone Modify mode buttons match the Alpha Juno control names and order: MOD RATE / MOD DEPTH / BRILLIANCE / ENV TIME.
- [x] Active Virtual-FM1 path exposes Alpha Dial focus, Tone Modify and preset navigation through real DSP parameters.
- [x] Alpha Dial and Tone Modify selection/focus/amount state mirrors the portable native runtime and supports native readback.
- [x] BRILLIANCE / MOD RATE / MOD DEPTH / ENV TIME transformations execute in portable C; virtual mode reads the affected parameters and macro amount back from native state.
- [x] 8 original initial presets.
- [x] 128 Alpha-Juno-style factory-bank positions/names mapped onto original modeled DSP patches (no Roland ROM/SysEx bundled).
- [x] Real JieLi full-load image can link with six ALPHA voices + chorus and the other V2 engines.
- [x] Native-clock four-note ALPHA chord lane with editable STEP / CHORD / GATE / PLAY.
- [x] ALPHA transport no longer depends on browser-held chord notes.
- [ ] Optional user-supplied SysEx import/conversion for closer factory-patch translation.
- [ ] Sustain pedal / richer chord memory.
- [ ] Stereo/pan implementation after workstation mixer becomes stereo.
- [ ] Real-device CPU measurement with six voices + chorus.

## Milestone F — Shared sequencer / song workflow 🚧

- [x] Portable native workstation sample-clock core with pair-preserving global swing and regression tests.
- [x] Unified WASM workstation renderer owns one sample-clock instance.
- [x] Native-clock MINI note/velocity/gate lane in unified WASM.
- [x] Native-clock drum lane bitmask triggering in unified WASM.
- [x] Native-clock bass note/accent/slide/gate lane in unified WASM.
- [x] Native-clock ALPHA four-note chord/velocity/gate lane in unified WASM.
- [x] Browser exposes native current-step metering from the render loop.
- [x] Public unified-WASM setters for metadata and all four part lanes.
- [x] Virtual FM-1 edits all four lane types directly in native runtime while transport runs.
- [x] 16-step display strip shows active steps, edit cursor and native playhead for all sequenced parts.
- [x] MINI and ALPHA can use gates longer than one step for held quarter-note/chord material without JS timers.
- [ ] Migrate the FM-1 hardware runtime from legacy `fm_seq`/Studio transport to the V2 workstation clock.
- [ ] Independent pattern length per part while remaining phase coherent.
- [ ] Probability / microtiming / parameter locks / motion lanes.
- [ ] Pattern chains / song arrangement.
- [ ] Live record into selected melodic part.

## Milestone G — Mixer / FX / Scenes 🚧

- [x] Unified WASM mixer renders MINI + 808 DRUM + 808 BASS + ALPHA in one AudioWorklet instance.
- [x] Per-part level API and working virtual global MIXER page.
- [x] Portable bounded-memory workstation delay / ambience / drive block.
- [x] FX block uses fixed int16 delay memory to reduce RAM cost.
- [x] FX stability and wet-tail regression tests.
- [x] Working virtual FX page wired into the native WASM mix.
- [x] First 5 V2 demo scenes defined as regression material.
- [x] Default V2 scenes retuned to calmer sparse patterns for easier musical testing.
- [x] Scene selection can be changed from FM-1-style controls and reloaded during transport.
- [x] Shared BPM/swing controls update native sequence metadata.
- [x] Scene changes seed MINI and ALPHA lane material as well as BASS/DRUM patterns.
- [x] Virtual local snapshot SAVE/LOAD includes all four sequencer lanes.
- [ ] Four-part hardware mixer runtime.
- [ ] Port resource-bounded FX into the mapped FM-1 hardware runtime after RAM/CPU budget validation.
- [ ] Atomic scene recall at an audio-safe boundary.
- [ ] Scene commit boundary must include selected scene, clock, levels, master, FX, four engine patches and sequence lanes; avoid bulk audio-state mutation from the UI thread.
- [ ] 12+ full factory scenes.

## Milestone H — Web editor + WASM virtual FM-1 🚧

### Virtual

- [x] Native C DSP for MINI, 808 DRUM, 808 BASS and ALPHA compiled into one WASM binary.
- [x] Unified `workstation` AudioWorklet mode for four-part mixing and native sample-clock testing.
- [x] Same part/page descriptor contract as hardware.
- [x] Virtual FM-1 is the only main browser surface; obsolete parallel FM-1 component removed.
- [x] Pointer/touch and PC keyboard play the currently selected part.
- [x] Encoders are controlled directly through React state, not DOM click bridges.
- [x] Audio failures are surfaced in UI with retry instead of failing silently.
- [x] Controls with no real engine implementation are disabled and display N/A.
- [x] Direct live native sequence editing is available for MINI / DRUM / BASS / ALPHA.
- [x] Web/WASM production build verifies the four-lane exports and AudioWorklet bundle.
- [x] Windows beta installer package installs the prebuilt WASM app without Emscripten/source checkout.
- [x] Installed beta launcher serves the app over localhost and creates desktop/start-menu shortcuts.
- [x] The editor, virtual-app download, hardware diagnostic download and hardware-test report live in one Device & Install view inside the workstation web app.
- [x] Beta build injects its exact release tag so in-app downloads point at the matching Windows installer and NON-INSTALLABLE hardware test ZIP.
- [x] Hardware test report saves locally and exports device/control notes plus CPU LAST / MAX / OVER and audio observations as JSON.
- [x] Refined virtual-device geometry keeps the FM-1 display/control/keybed proportions compact instead of using the oversized legacy web surface.
- [x] Lightweight Virtual-FM1 CI contract checks active surface, 27-key map, Alpha-Dial/Tone-Modify hooks, physical labels and transport hooks.
- [ ] Pixel-identical native 240×240 UI rendered to WASM/canvas.
- [ ] Deterministic WAV capture / regression render.
- [ ] Full browser E2E interaction tests for key-down/up, encoder turn/press, page navigation and transport.

### Editor

- [x] Part strip and hardware-oriented virtual shell.
- [x] Compact native step editing for all four parts.
- [ ] Descriptor-driven expanded editor panels around the hardware simulator.
- [ ] Large drum sequencer editor.
- [ ] Full bassline editor.
- [ ] Full MINI melodic lane editor.
- [ ] Alpha poly/chord editor.
- [ ] Mixer / FX / Scene editor.
- [ ] Hardware live sync via SysEx/USB-MIDI.
- [ ] Capability/version handshake.
- [ ] Project import/export.
- [ ] Hardware USB live sync and hardware installation remain gated on verified physical control mapping, identity checks and stock recovery validation.

## Milestone I — Presets / demos / regression content 🚧

- [x] Existing MINI factory content retained.
- [x] 8 808 DRUM demo/regression patterns (4 energetic + 4 calm).
- [x] 6 initial 808 BASS presets.
- [x] 8 808 BASS patterns (4 energetic + 4 calm).
- [x] 8 original ALPHA presets.
- [x] 128 modeled Alpha-Juno-style factory-bank positions/names without bundled factory binary data.
- [x] 5 full V2 scene definitions.
- [x] The default five V2 scenes now use calmer sparse demo material.
- [x] Scene-derived starter MINI and ALPHA lane material for the current five V2 scenes.
- [ ] 8+ drum kits / 24+ drum patterns.
- [ ] 24+ bass patterns.
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
- [x] Verified beta publisher is gated by successful FM-1 Target Diagnostic workflow for the exact commit.
- [x] Beta publisher ignores stale verified runs once `main` has moved, preventing an old build from consuming a new beta tag.
- [x] Beta release manifest distinguishes `virtual_installer=true` from `hardware_installable=false`.
- [x] Hardware diagnostic ZIP is checked to contain no `.fwsc` before prerelease publication.
- [ ] Verify real button/encoder mapping on physical FM-1.
- [ ] Run `fminimug1-workstation-stress.bin` on real hardware and record CPU LAST / MAX / OVER; require `OVER=0` and set quality policy from measured headroom.
- [ ] Define quality degradation policy if `OVER` is nonzero, never random underruns.
- [ ] Build mapped four-part hardware runtime only after physical control IDs and CPU headroom are verified.
- [ ] Port the four-lane workstation transport from the WASM integration layer into the mapped FM-1 runtime.
- [ ] Read-only identity validation.
- [ ] Validate stock V15 return/recovery path on a real FM-1.
- [ ] Only after physical controls, CPU `LAST / MAX / OVER`, identity and recovery gates pass, consider installable firmware.
- [ ] Only then consider `.fwsc` packaging and browser OTA installation.

## Milestone K — Beta distribution 🚧

- [x] One-shot `.release-beta` marker modeled after TheReFmB1rth.
- [x] `v0.3.0-beta.1`, `v0.3.0-beta.2` and `v0.3.0-beta.3` published as GitHub prereleases.
- [x] Windows installer script + double-click CMD wrapper.
- [x] Installer validates packaged SHA256 checksums before copying files.
- [x] Installer supports no-launch/no-shortcut options for automation and clean testing.
- [x] Release package contains prebuilt Vite/WASM app, installer, version, manifest and checksums.
- [x] Release also contains a separately named `hardware-diagnostics-NON-INSTALLABLE` ZIP from the exact verified target workflow.
- [x] GitHub prerelease creation is idempotent and tied to the exact verified commit SHA.
- [x] Windows GitHub Actions smoke test installs the package, serves it on localhost, verifies COOP/COEP + WASM MIME and rejects a tampered package.
- [x] `v0.3.0-beta.3` is the first release with the hardened checksum-verifying installer and verified Alpha-Dial/Tone-Modify workstation path.
- [x] `v0.3.0-beta.4` adds the self-contained Windows virtual installer and install/upgrade/uninstall smoke verification.
- [x] `v0.3.0-beta.5` published: same-app Device & Install view and first hardware diagnostic report flow; hardware images remain NON-INSTALLABLE.
- [ ] Validate the packaged Windows installer manually on a clean Windows user profile outside CI.
- [ ] Add signed/native desktop packaging later if the local-browser launcher proves useful enough.
- [ ] Add FM-1 browser OTA installer only after the mapped firmware/recovery gates are complete.

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

1. Add full browser E2E interaction tests around the now-single Virtual-FM1 and Device & Install views.
2. Move mixer/scene/transport lane state into a portable native workstation runtime shared by WASM and the future hardware runtime.
3. Add independent per-part pattern length/paging and then probability/motion data.
4. Compile the native 240×240 renderer to WASM/canvas.
5. Expand calm factory/demo content and add deterministic audio renders.
6. Use the first beta's in-app diagnostic download/report flow to collect physical FM-1 control IDs and real LAST/MAX/OVER/audio results.
7. Tune quality/polyphony from measured FM-1 MAX/OVER, then build the first mapped hardware beta.
8. Only after recovery validation consider installable FM-1 packaging / browser OTA.

## Current safety status

The new V2 architecture is the active development path. Legacy dual-MINI Studio code remains only as a temporary regression path and should be removed after the V2 hardware mixer/runtime replaces it. The Windows beta installer installs only the virtual WASM workstation. Its Device & Install view links the exact beta's Windows installer and hardware diagnostic ZIP and collects a local JSON hardware report. Flash writes remain disabled and no `.fwsc` should be produced until physical-device control, CPU and recovery gates are complete.
