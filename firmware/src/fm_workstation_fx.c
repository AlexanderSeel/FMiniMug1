#include "fm_workstation_fx.h"
#include <string.h>

static float clampf(float value, float lo, float hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

static float saturate(float value) {
  if (value >= 1.0f) return 1.0f;
  if (value <= -1.0f) return -1.0f;
  return value * (1.5f - 0.5f * value * value);
}

void fmw_fx_init(fmw_fx_t *fx, float sample_rate) {
  if (!fx) return;
  memset(fx, 0, sizeof(*fx));
  fx->sample_rate = sample_rate > 1000.0f ? sample_rate : 48000.0f;
  fx->delay_mix = 0.14f;
  fx->ambience_mix = 0.10f;
  fx->drive = 1.0f;
  fx->delay_feedback = 0.42f;
  fx->ambience_feedback = 0.72f;
  float delay_samples = fx->sample_rate * 0.155f;
  if (delay_samples < 1.0f) delay_samples = 1.0f;
  if (delay_samples > (float)(FMW_FX_DELAY_BUFFER - 1u)) delay_samples = (float)(FMW_FX_DELAY_BUFFER - 1u);
  fx->delay_samples = (uint16_t)delay_samples;
}

void fmw_fx_set_param(fmw_fx_t *fx, fmw_fx_param_t param, float value) {
  if (!fx) return;
  if (param == FMW_FX_DELAY) fx->delay_mix = clampf(value, 0.0f, 0.8f);
  else if (param == FMW_FX_AMBIENCE) fx->ambience_mix = clampf(value, 0.0f, 0.8f);
  else if (param == FMW_FX_DRIVE) fx->drive = clampf(value, 0.5f, 3.0f);
}

float fmw_fx_process(fmw_fx_t *fx, float input) {
  if (!fx) return input;

  uint16_t read = (uint16_t)((fx->delay_pos + FMW_FX_DELAY_BUFFER - fx->delay_samples) % FMW_FX_DELAY_BUFFER);
  float delayed = fx->delay_buffer[read];
  fx->delay_buffer[fx->delay_pos] = clampf(input + delayed * fx->delay_feedback, -2.0f, 2.0f);
  fx->delay_pos = (uint16_t)((fx->delay_pos + 1u) % FMW_FX_DELAY_BUFFER);

  float ambience = fx->ambience_buffer[fx->ambience_pos];
  float ambience_in = input * 0.32f + delayed * 0.18f;
  fx->ambience_buffer[fx->ambience_pos] = clampf(ambience_in + ambience * fx->ambience_feedback, -2.0f, 2.0f);
  fx->ambience_pos = (uint16_t)((fx->ambience_pos + 1u) % FMW_FX_AMBIENCE_BUFFER);

  float mixed = input + delayed * fx->delay_mix * 0.72f + ambience * fx->ambience_mix * 0.52f;
  return saturate(mixed * fx->drive);
}
