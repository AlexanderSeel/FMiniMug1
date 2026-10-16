#include "fm_workstation_seq.h"
#include "fm_workstation_fx.h"
#include "fm_workstation_runtime.h"
#include "fm_bass808.h"
#include "fm_drum808.h"
#include "fm_alpha.h"
#include <stdint.h>
#include <string.h>

void fmm_init(float sample_rate);
void fmm_reset(void);
void fmm_set_param(int id, float value);
void fmm_note_on(int note, int velocity);
void fmm_note_off_note(int note);
void fmm_note_off(void);
uintptr_t fmm_render(int frames);

#define FMW_PATTERN_STEPS 64
#define FMW_ALPHA_NOTES 4
#define FMW_BASS_ACCENT 1u
#define FMW_BASS_SLIDE 2u

typedef struct { int8_t note; uint8_t velocity; uint16_t gate; } fmw_mini_step_t;
typedef struct { int8_t note; uint8_t flags; uint8_t velocity; uint8_t gate; } fmw_bass_step_t;
typedef struct { uint16_t hits; uint16_t accents; } fmw_drum_step_t;
typedef struct { int8_t note[FMW_ALPHA_NOTES]; uint8_t velocity; uint16_t gate; } fmw_alpha_step_t;

static fmb808_t bass;
static fmd808_t drums;
static fma_t alpha;
static fmw_fx_t fx;
static fmw_seq_clock_t clock_state;
static fmw_runtime_t runtime_state;
static fmw_mini_step_t mini_steps[FMW_PATTERN_STEPS];
static fmw_bass_step_t bass_steps[FMW_PATTERN_STEPS];
static fmw_drum_step_t drum_steps[FMW_PATTERN_STEPS];
static fmw_alpha_step_t alpha_steps[FMW_PATTERN_STEPS];
static float output[128];
static uint32_t mini_gate_left;
static uint32_t bass_gate_left;
static uint32_t alpha_gate_left;
static int8_t mini_seq_note = -1;
static uint8_t current_step;
static int initialized;

static uint32_t gate_samples(uint16_t gate_percent) {
  const uint32_t duration = clock_state.step_samples ? clock_state.step_samples : 1u;
  uint32_t result = (duration * (uint32_t)(gate_percent ? gate_percent : 1u)) / 100u;
  if (!result) result = 1u;
  return result;
}

static void mini_seq_off(void) {
  if (mini_seq_note >= 0) { fmm_note_off_note(mini_seq_note); mini_seq_note = -1; }
  mini_gate_left = 0u;
}

static void alpha_seq_off(void) { fma_all_notes_off(&alpha); alpha_gate_left = 0u; }

static void clear_patterns(void) {
  for (int i = 0; i < FMW_PATTERN_STEPS; ++i) {
    mini_steps[i].note = -1;
    mini_steps[i].velocity = 100u;
    mini_steps[i].gate = 90u;
    bass_steps[i].note = -1;
    bass_steps[i].flags = 0u;
    bass_steps[i].velocity = 108u;
    bass_steps[i].gate = 72u;
    drum_steps[i].hits = 0u;
    drum_steps[i].accents = 0u;
    for (int n = 0; n < FMW_ALPHA_NOTES; ++n) alpha_steps[i].note[n] = -1;
    alpha_steps[i].velocity = 92u;
    alpha_steps[i].gate = 90u;
  }
}

static void step_event(uint8_t step, void *user) {
  (void)user;
  current_step = step;
  const fmw_drum_step_t *drum = &drum_steps[step];
  for (uint8_t voice = 0u; voice < FMD808_VOICE_COUNT; ++voice) {
    const uint16_t mask = (uint16_t)(1u << voice);
    if (drum->hits & mask) fmd808_trigger(&drums, (fmd808_voice_id_t)voice, 112u, (drum->accents & mask) ? 1u : 0u);
  }

  const fmw_mini_step_t *mini_step = &mini_steps[step];
  if (mini_step->note >= 0) {
    mini_seq_off();
    fmm_note_on((uint8_t)mini_step->note, mini_step->velocity);
    mini_seq_note = mini_step->note;
    mini_gate_left = gate_samples(mini_step->gate);
  }

  const fmw_bass_step_t *bass_step = &bass_steps[step];
  const uint8_t next_index = (uint8_t)((step + 1u) % clock_state.config.length);
  const fmw_bass_step_t *next = &bass_steps[next_index];
  if (bass_step->note < 0) {
    fmb808_note_off(&bass);
    bass_gate_left = 0u;
  } else {
    const uint8_t accent = (bass_step->flags & FMW_BASS_ACCENT) ? 1u : 0u;
    const uint8_t slide = (bass_step->flags & FMW_BASS_SLIDE) ? 1u : 0u;
    fmb808_note_on(&bass, (uint8_t)bass_step->note, accent, slide);
    bass_gate_left = (next->flags & FMW_BASS_SLIDE) ? 0u : gate_samples(bass_step->gate);
  }

  const fmw_alpha_step_t *alpha_step = &alpha_steps[step];
  uint8_t alpha_has_note = 0u;
  for (int n = 0; n < FMW_ALPHA_NOTES; ++n) if (alpha_step->note[n] >= 0) { alpha_has_note = 1u; break; }
  if (alpha_has_note) {
    alpha_seq_off();
    for (int n = 0; n < FMW_ALPHA_NOTES; ++n) if (alpha_step->note[n] >= 0) fma_note_on(&alpha, (uint8_t)alpha_step->note[n], alpha_step->velocity);
    alpha_gate_left = gate_samples(alpha_step->gate);
  }
}

__attribute__((visibility("default"))) void fmw_wasm_init(float sample_rate) {
  fmm_init(sample_rate);
  fmb808_init(&bass, sample_rate);
  fmd808_init(&drums, sample_rate);
  fma_init(&alpha, sample_rate);
  fmw_fx_init(&fx, sample_rate);
  fmw_seq_clock_init(&clock_state, sample_rate);
  fmw_runtime_init(&runtime_state);
  fmw_seq_clock_configure(&clock_state, &runtime_state.clock);
  fmw_fx_set_param(&fx, FMW_FX_DELAY, runtime_state.fx[FMW_FX_DELAY]);
  fmw_fx_set_param(&fx, FMW_FX_AMBIENCE, runtime_state.fx[FMW_FX_AMBIENCE]);
  fmw_fx_set_param(&fx, FMW_FX_DRIVE, runtime_state.fx[FMW_FX_DRIVE]);
  clear_patterns();
  mini_gate_left = bass_gate_left = alpha_gate_left = 0u;
  mini_seq_note = -1;
  current_step = 0u;
  initialized = 1;
}
static void ensure_init(void) { if (!initialized) fmw_wasm_init(48000.0f); }
__attribute__((visibility("default"))) void fmw_wasm_reset(void) { const float sr = clock_state.sample_rate > 1000.0f ? clock_state.sample_rate : 48000.0f; fmw_wasm_init(sr); }

__attribute__((visibility("default"))) void fmw_wasm_set_level(int part, float value) {
  ensure_init();
  if (part >= 0 && part < (int)FMW_RUNTIME_PART_COUNT) fmw_runtime_set_part_level(&runtime_state, (uint8_t)part, value);
  else if (part == (int)FMW_RUNTIME_PART_COUNT) fmw_runtime_set_master(&runtime_state, value);
}
__attribute__((visibility("default"))) void fmw_wasm_set_fx(int param, float value) {
  ensure_init();
  if (param >= (int)FMW_FX_DELAY && param <= (int)FMW_FX_DRIVE) {
    fmw_runtime_set_fx(&runtime_state, (uint8_t)param, value);
    fmw_fx_set_param(&fx, (fmw_fx_param_t)param, runtime_state.fx[param]);
  }
}
__attribute__((visibility("default"))) void fmw_wasm_mini_param(int id, float value) { ensure_init(); fmm_set_param(id, value); }
__attribute__((visibility("default"))) void fmw_wasm_mini_note_on(int note, int velocity) { ensure_init(); fmm_note_on(note, velocity); }
__attribute__((visibility("default"))) void fmw_wasm_mini_note_off(int note) { ensure_init(); fmm_note_off_note(note); }

__attribute__((visibility("default"))) void fmw_wasm_bass_param(int id, float value) {
  ensure_init();
  switch (id) {
    case 0: bass.patch.wave = value >= 0.5f ? FMB808_SQUARE : FMB808_SAW; break;
    case 1: bass.patch.tune_semitones = value; break;
    case 2: bass.patch.sub_level = value; break;
    case 3: bass.patch.drive = value; break;
    case 4: bass.patch.cutoff_hz = value; break;
    case 5: bass.patch.resonance = value; break;
    case 6: bass.patch.env_mod_hz = value; break;
    case 7: bass.patch.decay_s = value; break;
    case 8: bass.patch.slide_s = value; break;
    case 9: bass.patch.accent_amount = value; break;
    case 10: bass.patch.accent_decay_s = value; break;
    default: break;
  }
}
__attribute__((visibility("default"))) void fmw_wasm_bass_note_on(int note, int accent, int slide) { ensure_init(); if (note < 0) note = 0; if (note > 127) note = 127; bass_gate_left = 0u; fmb808_note_on(&bass, (uint8_t)note, accent ? 1u : 0u, slide ? 1u : 0u); }
__attribute__((visibility("default"))) void fmw_wasm_bass_note_off(void) { ensure_init(); bass_gate_left = 0u; fmb808_note_off(&bass); }

__attribute__((visibility("default"))) void fmw_wasm_drum_voice_param(int voice, int param, float value) {
  ensure_init(); if (voice < 0 || voice >= FMD808_VOICE_COUNT) return;
  if (param == 0) drums.kit.level[voice] = value; else if (param == 1) drums.kit.tune[voice] = value; else if (param == 2) drums.kit.decay[voice] = value; else if (param == 3) drums.kit.tone[voice] = value;
}
__attribute__((visibility("default"))) void fmw_wasm_drum_global_param(int param, float value) { ensure_init(); if (param == 0) drums.kit.accent_amount = value; else if (param == 1) drums.kit.drive = value; }
__attribute__((visibility("default"))) void fmw_wasm_drum_trigger(int voice, int velocity, int accent) { ensure_init(); if (voice < 0 || voice >= FMD808_VOICE_COUNT) return; if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127; fmd808_trigger(&drums, (fmd808_voice_id_t)voice, (uint8_t)velocity, accent ? 1u : 0u); }

__attribute__((visibility("default"))) void fmw_wasm_alpha_param(int id, float value) {
  ensure_init();
  switch (id) {
    case 0: alpha.patch.saw_level = value; break;
    case 1: alpha.patch.pulse_level = value; break;
    case 2: alpha.patch.sub_level = value; break;
    case 3: alpha.patch.noise_level = value; break;
    case 4: alpha.patch.cutoff_hz = value; break;
    case 5: alpha.patch.resonance = value; break;
    case 6: alpha.patch.env_amount_hz = value; break;
    case 7: alpha.patch.keytrack = value; break;
    case 8: alpha.patch.level = value; break;
    case 9: alpha.patch.gate_vca = value >= 0.5f ? 1u : 0u; break;
    case 10: alpha.patch.velocity_amount = value; break;
    case 11: break;
    case 12: alpha.patch.attack_s = value; break;
    case 13: alpha.patch.decay_s = value; break;
    case 14: alpha.patch.sustain = value; break;
    case 15: alpha.patch.release_s = value; break;
    case 16: alpha.patch.lfo_rate_hz = value; break;
    case 17: alpha.patch.lfo_delay_s = value; break;
    case 18: alpha.patch.lfo_dco_amount = value; break;
    case 19: alpha.patch.lfo_vcf_amount_hz = value; break;
    case 20: alpha.patch.chorus_mode = value < 0.5f ? 0u : (value < 1.5f ? 1u : 2u); break;
    case 21: alpha.patch.chorus_rate_hz = value; break;
    case 22: alpha.patch.chorus_depth = value; break;
    case 23: alpha.patch.chorus_mix = value; break;
    case 24: alpha.patch.pulse_width = value; break;
    case 25: alpha.patch.pwm_depth = value; break;
    case 26: alpha.patch.pwm_rate_hz = value; break;
    case 27: alpha.patch.hpf_cutoff_hz = value; break;
    case 28: alpha.patch.dco_range_semitones = (int8_t)value; break;
    case 29: alpha.patch.dco_env_amount = value; break;
    default: break;
  }
}
__attribute__((visibility("default"))) void fmw_wasm_alpha_note_on(int note, int velocity) { ensure_init(); if (note < 0) note = 0; if (note > 127) note = 127; if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127; fma_note_on(&alpha, (uint8_t)note, (uint8_t)velocity); }
__attribute__((visibility("default"))) void fmw_wasm_alpha_note_off(int note) { ensure_init(); if (note < 0) note = 0; if (note > 127) note = 127; fma_note_off(&alpha, (uint8_t)note); }

__attribute__((visibility("default"))) void fmw_wasm_seq_meta(int length, int bpm, int swing) {
  ensure_init();
  if (length < 1) length = 1; if (length > FMW_PATTERN_STEPS) length = FMW_PATTERN_STEPS;
  if (bpm < 40) bpm = 40; if (bpm > 300) bpm = 300;
  if (swing < 0) swing = 0; if (swing > 75) swing = 75;
  fmw_runtime_set_clock(&runtime_state, (uint8_t)length, (uint16_t)bpm, (uint8_t)swing);
  fmw_seq_clock_configure(&clock_state, &runtime_state.clock);
}
__attribute__((visibility("default"))) void fmw_wasm_seq_mini_step(int index, int note, int velocity, int gate) {
  ensure_init(); if (index < 0 || index >= FMW_PATTERN_STEPS) return; if (note < -1) note = -1; if (note > 127) note = 127; if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127; if (gate < 1) gate = 1; if (gate > 400) gate = 400;
  mini_steps[index].note = (int8_t)note; mini_steps[index].velocity = (uint8_t)velocity; mini_steps[index].gate = (uint16_t)gate;
}
__attribute__((visibility("default"))) void fmw_wasm_seq_bass_step(int index, int note, int flags, int velocity, int gate) {
  ensure_init(); if (index < 0 || index >= FMW_PATTERN_STEPS) return; if (note < -1) note = -1; if (note > 127) note = 127; if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127; if (gate < 1) gate = 1; if (gate > 100) gate = 100;
  bass_steps[index].note = (int8_t)note; bass_steps[index].flags = (uint8_t)flags; bass_steps[index].velocity = (uint8_t)velocity; bass_steps[index].gate = (uint8_t)gate;
}
__attribute__((visibility("default"))) void fmw_wasm_seq_drum_step(int index, int hits, int accents) { ensure_init(); if (index < 0 || index >= FMW_PATTERN_STEPS) return; drum_steps[index].hits = (uint16_t)hits; drum_steps[index].accents = (uint16_t)accents; }
__attribute__((visibility("default"))) void fmw_wasm_seq_alpha_step(int index, int note0, int note1, int note2, int note3, int velocity, int gate) {
  ensure_init(); if (index < 0 || index >= FMW_PATTERN_STEPS) return; const int notes[FMW_ALPHA_NOTES] = {note0,note1,note2,note3};
  for (int n = 0; n < FMW_ALPHA_NOTES; ++n) { int note = notes[n]; if (note < -1) note = -1; if (note > 127) note = 127; alpha_steps[index].note[n] = (int8_t)note; }
  if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127; if (gate < 1) gate = 1; if (gate > 400) gate = 400; alpha_steps[index].velocity = (uint8_t)velocity; alpha_steps[index].gate = (uint16_t)gate;
}
__attribute__((visibility("default"))) void fmw_wasm_seq_start(void) { ensure_init(); fmw_runtime_start(&runtime_state); fmw_seq_clock_start(&clock_state); }
__attribute__((visibility("default"))) void fmw_wasm_seq_stop(void) { ensure_init(); fmw_runtime_stop(&runtime_state); fmw_seq_clock_stop(&clock_state); mini_seq_off(); fmb808_note_off(&bass); bass_gate_left = 0u; alpha_seq_off(); }
__attribute__((visibility("default"))) int fmw_wasm_seq_step(void) { return (int)current_step; }

__attribute__((visibility("default"))) uintptr_t fmw_wasm_render(int frames) {
  ensure_init(); if (frames < 0) frames = 0; if (frames > 128) frames = 128; const uintptr_t mini_ptr = fmm_render(frames); const float *mini = (const float *)mini_ptr;
  for (int i = 0; i < frames; ++i) {
    fmw_seq_clock_process(&clock_state, 1u, step_event, 0);
    if (mini_gate_left && !--mini_gate_left) mini_seq_off();
    if (bass_gate_left && !--bass_gate_left) fmb808_note_off(&bass);
    if (alpha_gate_left && !--alpha_gate_left) alpha_seq_off();
    float sample = mini[i] * runtime_state.part_level[FMW_PART_MINI];
    sample += fmd808_process(&drums) * runtime_state.part_level[FMW_PART_DRUM808];
    sample += fmb808_process(&bass) * runtime_state.part_level[FMW_PART_BASS808];
    sample += fma_process(&alpha) * runtime_state.part_level[FMW_PART_ALPHA];
    output[i] = fmw_fx_process(&fx, sample) * runtime_state.master_level;
  }
  return (uintptr_t)output;
}
