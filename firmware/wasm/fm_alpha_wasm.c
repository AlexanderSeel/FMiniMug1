#include "fm_alpha.h"
#include <stdint.h>

static fma_t alpha;
static float alpha_output[128];
static int alpha_initialized;

static void ensure_init(void) {
  if (!alpha_initialized) {
    fma_init(&alpha, 48000.0f);
    alpha_initialized = 1;
  }
}

__attribute__((visibility("default")))
void fma_wasm_init(float sample_rate) {
  fma_init(&alpha, sample_rate);
  alpha_initialized = 1;
}

__attribute__((visibility("default")))
void fma_wasm_reset(void) {
  const float sr = alpha.sample_rate > 1000.0f ? alpha.sample_rate : 48000.0f;
  fma_init(&alpha, sr);
  alpha_initialized = 1;
}

__attribute__((visibility("default")))
void fma_wasm_set_param(int id, float value) {
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
    case 11: break; /* PAN reserved until the workstation mixer becomes stereo. */
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
void fma_wasm_note_on(int note, int velocity) {
  ensure_init();
  if (note < 0) note = 0;
  if (note > 127) note = 127;
  if (velocity < 1) velocity = 1;
  if (velocity > 127) velocity = 127;
  fma_note_on(&alpha, (uint8_t)note, (uint8_t)velocity);
}

__attribute__((visibility("default")))
void fma_wasm_note_off(int note) {
  ensure_init();
  if (note < 0) note = 0;
  if (note > 127) note = 127;
  fma_note_off(&alpha, (uint8_t)note);
}

__attribute__((visibility("default")))
void fma_wasm_all_notes_off(void) {
  ensure_init();
  fma_all_notes_off(&alpha);
}

__attribute__((visibility("default")))
uintptr_t fma_wasm_render(int frames) {
  ensure_init();
  if (frames < 0) frames = 0;
  if (frames > 128) frames = 128;
  for (int i = 0; i < frames; ++i) alpha_output[i] = fma_process(&alpha);
  return (uintptr_t)alpha_output;
}
