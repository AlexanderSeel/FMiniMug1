#include "fm_workstation_seq.h"
#include "fm_bass808.h"
#include "fm_drum808.h"
#include "fm_alpha.h"
#include <stdint.h>
#include <string.h>

/* Reuse the existing MINI wrapper inside the same WASM instance. */
void fmm_init(float sample_rate);
void fmm_reset(void);
void fmm_set_param(int id, float value);
void fmm_note_on(int note, int velocity);
void fmm_note_off_note(int note);
void fmm_note_off(void);
uintptr_t fmm_render(int frames);

#define FMW_PATTERN_STEPS 64
#define FMW_BASS_ACCENT 1u
#define FMW_BASS_SLIDE 2u

typedef struct {
  int8_t note;
  uint8_t flags;
  uint8_t velocity;
  uint8_t gate;
} fmw_bass_step_t;

typedef struct {
  uint16_t hits;
  uint16_t accents;
} fmw_drum_step_t;

static fmb808_t bass;
static fmd808_t drums;
static fma_t alpha;
static fmw_seq_clock_t clock_state;
static fmw_bass_step_t bass_steps[FMW_PATTERN_STEPS];
static fmw_drum_step_t drum_steps[FMW_PATTERN_STEPS];
static float output[128];
static float mini_level = 0.72f;
static float bass_level = 0.38f;
static float drum_level = 0.42f;
static float alpha_level = 0.62f;
static uint32_t bass_gate_left;
static uint8_t current_step;
static int initialized;

static void clear_patterns(void) {
  for (int i = 0; i < FMW_PATTERN_STEPS; ++i) {
    bass_steps[i].note = -1;
    bass_steps[i].flags = 0u;
    bass_steps[i].velocity = 108u;
    bass_steps[i].gate = 72u;
    drum_steps[i].hits = 0u;
    drum_steps[i].accents = 0u;
  }
}

static void step_event(uint8_t step, void *user) {
  (void)user;
  current_step = step;
  const fmw_drum_step_t *drum = &drum_steps[step];
  for (uint8_t voice = 0u; voice < FMD808_VOICE_COUNT; ++voice) {
    const uint16_t mask = (uint16_t)(1u << voice);
    if (drum->hits & mask) {
      fmd808_trigger(&drums, (fmd808_voice_id_t)voice, 112u, (drum->accents & mask) ? 1u : 0u);
    }
  }

  const fmw_bass_step_t *bass_step = &bass_steps[step];
  const uint8_t next_index = (uint8_t)((step + 1u) % clock_state.config.length);
  const fmw_bass_step_t *next = &bass_steps[next_index];
  if (bass_step->note < 0) {
    fmb808_note_off(&bass);
    bass_gate_left = 0u;
    return;
  }

  const uint8_t accent = (bass_step->flags & FMW_BASS_ACCENT) ? 1u : 0u;
  const uint8_t slide = (bass_step->flags & FMW_BASS_SLIDE) ? 1u : 0u;
  fmb808_note_on(&bass, (uint8_t)bass_step->note, accent, slide);
  if (next->flags & FMW_BASS_SLIDE) {
    bass_gate_left = 0u; /* Hold through into the target slide step. */
  } else {
    const uint32_t duration = clock_state.step_samples ? clock_state.step_samples : 1u;
    bass_gate_left = (duration * (uint32_t)(bass_step->gate ? bass_step->gate : 1u)) / 100u;
    if (!bass_gate_left) bass_gate_left = 1u;
  }
}

__attribute__((visibility("default")))
void fmw_wasm_init(float sample_rate) {
  fmm_init(sample_rate);
  fmb808_init(&bass, sample_rate);
  fmd808_init(&drums, sample_rate);
  fma_init(&alpha, sample_rate);
  fmw_seq_clock_init(&clock_state, sample_rate);
  clear_patterns();
  bass_gate_left = 0u;
  current_step = 0u;
  initialized = 1;
}

static void ensure_init(void) {
  if (!initialized) fmw_wasm_init(48000.0f);
}

__attribute__((visibility("default")))
void fmw_wasm_reset(void) {
  const float sr = clock_state.sample_rate > 1000.0f ? clock_state.sample_rate : 48000.0f;
  fmw_wasm_init(sr);
}

__attribute__((visibility("default")))
void fmw_wasm_set_level(int part, float value) {
  ensure_init();
  if (value < 0.0f) value = 0.0f;
  if (value > 1.25f) value = 1.25f;
  if (part == 0) mini_level = value;
  else if (part == 1) drum_level = value;
  else if (part == 2) bass_level = value;
  else if (part == 3) alpha_level = value;
}

__attribute__((visibility("default")))
void fmw_wasm_mini_param(int id, float value) { ensure_init(); fmm_set_param(id, value); }
__attribute__((visibility("default")))
void fmw_wasm_mini_note_on(int note, int velocity) { ensure_init(); fmm_note_on(note, velocity); }
__attribute__((visibility("default")))
void fmw_wasm_mini_note_off(int note) { ensure_init(); fmm_note_off_note(note); }

__attribute__((visibility("default")))
void fmw_wasm_bass_param(int id, float value) {
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

__attribute__((visibility("default")))
void fmw_wasm_drum_voice_param(int voice, int param, float value) {
  ensure_init();
  if (voice < 0 || voice >= FMD808_VOICE_COUNT) return;
  if (param == 0) drums.kit.level[voice] = value;
  else if (param == 1) drums.kit.tune[voice] = value;
  else if (param == 2) drums.kit.decay[voice] = value;
  else if (param == 3) drums.kit.tone[voice] = value;
}

__attribute__((visibility("default")))
void fmw_wasm_drum_global_param(int param, float value) {
  ensure_init();
  if (param == 0) drums.kit.accent_amount = value;
  else if (param == 1) drums.kit.drive = value;
}

__attribute__((visibility("default")))
void fmw_wasm_drum_trigger(int voice, int velocity, int accent) {
  ensure_init();
  if (voice < 0 || voice >= FMD808_VOICE_COUNT) return;
  if (velocity < 1) velocity = 1;
  if (velocity > 127) velocity = 127;
  fmd808_trigger(&drums, (fmd808_voice_id_t)voice, (uint8_t)velocity, accent ? 1u : 0u);
}

__attribute__((visibility("default")))
void fmw_wasm_alpha_param(int id, float value) {
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
    default: break;
  }
}

__attribute__((visibility("default")))
void fmw_wasm_alpha_note_on(int note, int velocity) {
  ensure_init();
  if (note < 0) note = 0; if (note > 127) note = 127;
  if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127;
  fma_note_on(&alpha, (uint8_t)note, (uint8_t)velocity);
}

__attribute__((visibility("default")))
void fmw_wasm_alpha_note_off(int note) {
  ensure_init();
  if (note < 0) note = 0; if (note > 127) note = 127;
  fma_note_off(&alpha, (uint8_t)note);
}

__attribute__((visibility("default")))
void fmw_wasm_seq_meta(int length, int bpm, int swing) {
  ensure_init();
  fmw_seq_clock_config_t cfg;
  cfg.length = (uint8_t)(length < 1 ? 1 : (length > FMW_PATTERN_STEPS ? FMW_PATTERN_STEPS : length));
  cfg.bpm = (uint16_t)(bpm < 40 ? 40 : (bpm > 300 ? 300 : bpm));
  cfg.swing = (uint8_t)(swing < 0 ? 0 : (swing > 75 ? 75 : swing));
  fmw_seq_clock_configure(&clock_state, &cfg);
}

__attribute__((visibility("default")))
void fmw_wasm_seq_bass_step(int index, int note, int flags, int velocity, int gate) {
  ensure_init();
  if (index < 0 || index >= FMW_PATTERN_STEPS) return;
  if (note < -1) note = -1; if (note > 127) note = 127;
  if (velocity < 1) velocity = 1; if (velocity > 127) velocity = 127;
  if (gate < 1) gate = 1; if (gate > 100) gate = 100;
  bass_steps[index].note = (int8_t)note;
  bass_steps[index].flags = (uint8_t)flags;
  bass_steps[index].velocity = (uint8_t)velocity;
  bass_steps[index].gate = (uint8_t)gate;
}

__attribute__((visibility("default")))
void fmw_wasm_seq_drum_step(int index, int hits, int accents) {
  ensure_init();
  if (index < 0 || index >= FMW_PATTERN_STEPS) return;
  drum_steps[index].hits = (uint16_t)hits;
  drum_steps[index].accents = (uint16_t)accents;
}

__attribute__((visibility("default"))) void fmw_wasm_seq_start(void) { ensure_init(); fmw_seq_clock_start(&clock_state); }
__attribute__((visibility("default"))) void fmw_wasm_seq_stop(void) { ensure_init(); fmw_seq_clock_stop(&clock_state); fmb808_note_off(&bass); bass_gate_left = 0u; }
__attribute__((visibility("default"))) int fmw_wasm_seq_step(void) { return (int)current_step; }

__attribute__((visibility("default")))
uintptr_t fmw_wasm_render(int frames) {
  ensure_init();
  if (frames < 0) frames = 0;
  if (frames > 128) frames = 128;
  const uintptr_t mini_ptr = fmm_render(frames);
  const float *mini = (const float *)mini_ptr;
  for (int i = 0; i < frames; ++i) {
    fmw_seq_clock_process(&clock_state, 1u, step_event, 0);
    if (bass_gate_left) {
      --bass_gate_left;
      if (!bass_gate_left) fmb808_note_off(&bass);
    }
    float sample = mini[i] * mini_level;
    sample += fmd808_process(&drums) * drum_level;
    sample += fmb808_process(&bass) * bass_level;
    sample += fma_process(&alpha) * alpha_level;
    if (sample > 1.0f) sample = 1.0f;
    if (sample < -1.0f) sample = -1.0f;
    output[i] = sample;
  }
  return (uintptr_t)output;
}
