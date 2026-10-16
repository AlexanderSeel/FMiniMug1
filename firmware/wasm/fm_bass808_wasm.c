#include "fm_bass808.h"
#include <stdint.h>

static fmb808_t bass;
static float bass_output[128];
static int bass_initialized;

static void ensure_init(void) {
  if (!bass_initialized) {
    fmb808_init(&bass, 48000.0f);
    bass_initialized = 1;
  }
}

__attribute__((visibility("default")))
void fmb808_wasm_init(float sample_rate) {
  fmb808_init(&bass, sample_rate);
  bass_initialized = 1;
}

__attribute__((visibility("default")))
void fmb808_wasm_reset(void) {
  const float sr = bass.sample_rate > 1000.0f ? bass.sample_rate : 48000.0f;
  fmb808_init(&bass, sr);
  bass_initialized = 1;
}

__attribute__((visibility("default")))
void fmb808_wasm_set_param(int id, float value) {
  ensure_init();
  switch ((fmb808_param_id_t)id) {
    case FMB808_PARAM_WAVE: bass.patch.wave = value >= 0.5f ? FMB808_SQUARE : FMB808_SAW; break;
    case FMB808_PARAM_TUNE: bass.patch.tune_semitones = value; break;
    case FMB808_PARAM_SUB: bass.patch.sub_level = value; break;
    case FMB808_PARAM_DRIVE: bass.patch.drive = value; break;
    case FMB808_PARAM_CUTOFF: bass.patch.cutoff_hz = value; break;
    case FMB808_PARAM_RESONANCE: bass.patch.resonance = value; break;
    case FMB808_PARAM_ENV_MOD: bass.patch.env_mod_hz = value; break;
    case FMB808_PARAM_DECAY: bass.patch.decay_s = value; break;
    case FMB808_PARAM_SLIDE: bass.patch.slide_s = value; break;
    case FMB808_PARAM_ACCENT: bass.patch.accent_amount = value; break;
    case FMB808_PARAM_ACCENT_DECAY: bass.patch.accent_decay_s = value; break;
    case FMB808_PARAM_COUNT: break;
  }
}

__attribute__((visibility("default")))
void fmb808_wasm_note_on(int note, int accent, int slide) {
  ensure_init();
  if (note < 0) note = 0;
  if (note > 127) note = 127;
  fmb808_note_on(&bass, (uint8_t)note, accent ? 1u : 0u, slide ? 1u : 0u);
}

__attribute__((visibility("default")))
void fmb808_wasm_note_off(void) {
  ensure_init();
  fmb808_note_off(&bass);
}

__attribute__((visibility("default")))
uintptr_t fmb808_wasm_render(int frames) {
  ensure_init();
  if (frames < 0) frames = 0;
  if (frames > 128) frames = 128;
  for (int i = 0; i < frames; ++i) bass_output[i] = fmb808_process(&bass);
  return (uintptr_t)bass_output;
}
