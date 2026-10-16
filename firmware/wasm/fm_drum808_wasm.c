#include "fm_drum808.h"
#include <stdint.h>

static fmd808_t drum;
static float drum_output[128];
static int drum_initialized;

static void ensure_init(void) {
  if (!drum_initialized) {
    fmd808_init(&drum, 48000.0f);
    drum_initialized = 1;
  }
}

__attribute__((visibility("default")))
void fmd808_wasm_init(float sample_rate) {
  fmd808_init(&drum, sample_rate);
  drum_initialized = 1;
}

__attribute__((visibility("default")))
void fmd808_wasm_reset(void) {
  const float sr = drum.sample_rate > 1000.0f ? drum.sample_rate : 48000.0f;
  fmd808_init(&drum, sr);
  drum_initialized = 1;
}

__attribute__((visibility("default")))
void fmd808_wasm_set_voice_param(int voice, int param, float value) {
  ensure_init();
  if (voice < 0 || voice >= FMD808_VOICE_COUNT) return;
  switch (param) {
    case 0: drum.kit.level[voice] = value; break;
    case 1: drum.kit.tune[voice] = value; break;
    case 2: drum.kit.decay[voice] = value; break;
    case 3: drum.kit.tone[voice] = value; break;
    default: break;
  }
}

__attribute__((visibility("default")))
void fmd808_wasm_set_global_param(int param, float value) {
  ensure_init();
  switch (param) {
    case 0: drum.kit.accent_amount = value; break;
    case 1: drum.kit.drive = value; break;
    default: break;
  }
}

__attribute__((visibility("default")))
void fmd808_wasm_trigger(int voice, int velocity, int accent) {
  ensure_init();
  if (voice < 0 || voice >= FMD808_VOICE_COUNT) return;
  if (velocity < 1) velocity = 1;
  if (velocity > 127) velocity = 127;
  fmd808_trigger(&drum, (fmd808_voice_id_t)voice, (uint8_t)velocity, accent ? 1u : 0u);
}

__attribute__((visibility("default")))
uintptr_t fmd808_wasm_render(int frames) {
  ensure_init();
  if (frames < 0) frames = 0;
  if (frames > 128) frames = 128;
  for (int i = 0; i < frames; ++i) drum_output[i] = fmd808_process(&drum);
  return (uintptr_t)drum_output;
}
