#include "fm_workstation_seq.h"
#include <string.h>

static uint32_t compute_step_samples(const fmw_seq_clock_t *clock, uint8_t step) {
  const uint16_t bpm = clock->config.bpm < 40u ? 40u : (clock->config.bpm > 300u ? 300u : clock->config.bpm);
  const float base = clock->sample_rate * 15.0f / (float)bpm; /* sixteenth note */
  const float swing = (float)(clock->config.swing > 75u ? 75u : clock->config.swing) / 200.0f;
  const float factor = (step & 1u) ? (1.0f - swing) : (1.0f + swing);
  const float samples = base * factor;
  return samples < 1.0f ? 1u : (uint32_t)(samples + 0.5f);
}

void fmw_seq_clock_init(fmw_seq_clock_t *clock, float sample_rate) {
  memset(clock, 0, sizeof(*clock));
  clock->sample_rate = sample_rate > 1000.0f ? sample_rate : 48000.0f;
  clock->config.bpm = 120u;
  clock->config.swing = 0u;
  clock->config.length = 16u;
  clock->step_samples = compute_step_samples(clock, 0u);
}

void fmw_seq_clock_configure(fmw_seq_clock_t *clock, const fmw_seq_clock_config_t *config) {
  if (!clock || !config) return;
  clock->config = *config;
  if (clock->config.bpm < 40u) clock->config.bpm = 40u;
  if (clock->config.bpm > 300u) clock->config.bpm = 300u;
  if (clock->config.swing > 75u) clock->config.swing = 75u;
  if (clock->config.length < 1u) clock->config.length = 1u;
  if (clock->config.length > FMW_SEQ_MAX_STEPS) clock->config.length = FMW_SEQ_MAX_STEPS;
  clock->step_samples = compute_step_samples(clock, clock->step);
  if (clock->samples_left > clock->step_samples) clock->samples_left = clock->step_samples;
}

void fmw_seq_clock_start(fmw_seq_clock_t *clock) {
  if (!clock) return;
  clock->running = 1u;
  clock->step = 0u;
  clock->step_samples = compute_step_samples(clock, 0u);
  clock->samples_left = 0u; /* emit step zero on the first processed sample */
}

void fmw_seq_clock_stop(fmw_seq_clock_t *clock) {
  if (!clock) return;
  clock->running = 0u;
}

void fmw_seq_clock_reset(fmw_seq_clock_t *clock) {
  if (!clock) return;
  clock->step = 0u;
  clock->step_samples = compute_step_samples(clock, 0u);
  clock->samples_left = 0u;
}

void fmw_seq_clock_process(fmw_seq_clock_t *clock, uint32_t frames, fmw_seq_step_cb callback, void *user) {
  if (!clock || !clock->running || !frames) return;
  for (uint32_t i = 0u; i < frames; ++i) {
    if (clock->samples_left == 0u) {
      /* Clients may use step_samples to derive a gate for the current swung
       * step, so publish the exact current duration before the callback. */
      clock->step_samples = compute_step_samples(clock, clock->step);
      if (callback) callback(clock->step, user);
      clock->samples_left = clock->step_samples;
      clock->step = (uint8_t)((clock->step + 1u) % clock->config.length);
    }
    --clock->samples_left;
  }
}
