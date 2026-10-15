# FMiniMug1 Studio 2.0

FMiniMug1 2.0 extends the classic three-oscillator / nonlinear mixer / ladder-filter instrument into a compact modern performance workstation without replacing its core character.

## Character rule

Every major expansion must preserve one of these paths as the audible identity anchor:

```text
3 OSC -> nonlinear mixer -> ladder filter -> filter contour -> loudness contour
```

or, for future sample/drum voices, deliberately route material through the same mixer/filter/drive vocabulary where musically useful.

The project should not drift into a generic workstation with an unrelated collection of engines.

## Target architecture

```text
                       PERFORMANCE
                  macros / scenes / morph
                            |
          +-----------------+-----------------+
          |                                   |
      SYNTH A                           SYNTH B
   FMiniMug core                     FMiniMug core
          |                                   |
          +-----------------+-----------------+
                            |
                         MIX BUS
                            |
        +-------------------+-------------------+
        |                                       |
     DRUM BUS                              SAMPLE LAYER
  analog-style voices                 optional ladder source
        |                                       |
        +-------------------+-------------------+
                            |
                   INSERT / SEND FX
                delay / reverb / chorus
                            |
                       MASTER GLUE
```

## Development order

### Phase A — scene/test foundation ✅ / 🚧

- [x] Expand browser sequence schema with optional swing, velocity, transpose and native flags.
- [x] Feed expressive sequence data into the native WASM sequencer.
- [x] Correct Web Audio fallback transport to 16th-note timing.
- [x] Add fallback swing, rests and per-step transpose.
- [x] Add eight 2.0 demo patches.
- [x] Add eight expressive demo patterns.
- [x] Add four analog-drum pattern blueprints.
- [x] Add eight Studio scenes combining Synth A, future Synth B, drums, FX character and macros.
- [x] Scene selector loads the currently playable Synth-A patch + sequence immediately.
- [ ] Store the complete scene state in one canonical schema shared by browser/native persistence.

### Phase B — real dual synth

- [ ] Two independent `fm_voice_t` instances: Synth A and Synth B.
- [ ] Independent patch, note, sequence and macro state.
- [ ] Shared output mixer with A/B balance.
- [ ] Modes: SINGLE, LAYER, SPLIT, DUO, UNISON, SEQ-A + LIVE-B.
- [ ] CPU-quality policy: allow per-instance 1x/2x oversampling decisions within a hard target budget.
- [ ] Scene selection restores both engines atomically.

### Phase C — musical sequencer expansion

- [ ] True slide behavior: slide changes pitch without envelope retrigger and uses dedicated slide time.
- [ ] Accent destinations: VCA, filter contour, mixer/filter drive.
- [ ] Parameter locks per step.
- [ ] Up to four motion-recording lanes.
- [ ] Probability and conditional triggers.
- [ ] Ratchets / repeats.
- [ ] Micro timing.
- [ ] Pattern chaining / song mode.

### Phase D — analog drum engine

Eight compact voices:

```text
BD / SD / CH / OH / CLAP / TOM / PERC / NOISE-FX
```

Initial voice goals:

- BD: tune, decay, pitch sweep, click, drive.
- SD: body tune, noise, snap, decay, drive.
- Hats: metallic/noise balance, HP filter, tone, decay.
- Clap: spread, noise tone, decay.
- Tom: pitch, bend, decay, drive.
- Perc/FX: pitch, simple FM, noise, decay, drive.

The demo drum patterns in `web/src/demo.ts` are the initial musical regression set.

### Phase E — FX architecture

Per-synth insert slot(s):

- saturation / overdrive
- chorus
- phaser
- flanger
- bit reduction
- compressor / EQ
- ring modulation / frequency shift where CPU permits

Send A — delay:

- stereo
- ping-pong
- tape
- BBD-style
- multi-tap
- sync / feedback / filter / drive / wow-flutter / ducking

Send B — reverb:

- room
- plate
- spring-inspired
- hall
- dark space

Master:

- tape/saturation
- bus compression
- tilt EQ
- limiter
- width

### Phase F — modulation and performance

- [ ] LFO1 classic shapes.
- [ ] LFO2 modern/free/sync/random/step shapes.
- [ ] Eight-slot modulation matrix.
- [ ] Four patch/scene macros.
- [ ] Character macro / modes: CLEAN, CLASSIC, AGED, HOT, BROKEN.
- [ ] A/B morph and later four-corner XY morph.
- [ ] Scale lock, chord memory and arpeggiator.
- [ ] 3-note paraphonic mode using OSC1/2/3 before the common ladder filter.

### Phase G — sample layer and looping

- [ ] Optional sample source added to the classic mixer path.
- [ ] start/end/tune/loop/reverse/root-note controls.
- [ ] sample through FMiniMug drive/filter/contours.
- [ ] simple performance looper only after synth/drum/FX timing is stable.

## Demo/test bank

The 2.0 demo bank is deliberately small and targeted. Every scene should expose a specific engine behavior instead of only sounding pleasant.

| Scene | Primary purpose | Synth A | Future Synth B | Pattern | Drum blueprint |
| --- | --- | --- | --- | --- | --- |
| Neon Basement | accent + slide + swing | Neon Mono Bass | Glass Ladder Lead | Neon Slide 01 | Analog Drive 01 |
| Berlin Afterhours | 32-step playback + drift | Aged Berlin Bass | Broken Satellite | Berlin Motion 32 | Berlin Pulse Kit |
| Rubber Funk Lab | swing + rests + short gates | P-Funk Snap | Orbit Pluck | Funk Lock Test | Broken Funk Kit |
| Arena Circuit | ties + lead envelopes | Hot Circuit Lead | Midnight Brass | Prog Tie Lines | Analog Drive 01 |
| Motorik Wire | timing/accent stability | Motorik Mono | Clean Lab Init | Motorik Accent | Berlin Pulse Kit |
| Orbit Plucks | fast envelopes + transpose | Orbit Pluck | Neon Mono Bass | Orbit Ratchet Proxy | Analog Drive 01 |
| Dark Satellite | long envelopes + drift/resonance | Broken Satellite | Cosmic Drone | Dark Space 24 | Slow Machine Kit |
| Calibration Bench | exposed slide/glide regression | Clean Lab Init | Init Classic | Slide Calibration | Berlin Pulse Kit |

## Content policy

Demo presets, patterns and scenes are original FMiniMug1 data. They may evoke recognizable analog production styles but must not copy commercial preset banks, copyrighted patch sheets, factory demo sequences or branded artwork.

## Hardware UI direction

The expanded hardware top-level should eventually become:

```text
SYNTH A | SYNTH B | DRUM | SEQ | FX | PERF
```

The existing four-encoder + HOLD + FOCUS interaction model remains. New complexity should be placed behind pages/scenes/macros rather than turning the 240×240 UI into a dense DAW screen.
