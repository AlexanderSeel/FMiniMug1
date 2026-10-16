#pragma once
#include <stdint.h>

#define FMW_SEQ_MAX_STEPS 64u

typedef struct {
  uint16_t bpm;
  uint8_t swing;
  uint8_t length;
} fmw_seq_clock_config_t;

typedef struct {
  float sample_rate;
  fmw_seq_clock_config_t config;
  uint32_t samples_left;
  uint32_t step_samples;
  uint8_t step;
  uint8_t running;
} fmw_seq_clock_t;

typedef void (*fmw_seq_step_cb)(uint8_t step, void *user);

void fmw_seq_clock_init(fmw_seq_clock_t *clock, float sample_rate);
void fmw_seq_clock_configure(fmw_seq_clock_t *clock, const fmw_seq_clock_config_t *config);
void fmw_seq_clock_start(fmw_seq_clock_t *clock);
void fmw_seq_clock_stop(fmw_seq_clock_t *clock);
void fmw_seq_clock_reset(fmw_seq_clock_t *clock);
void fmw_seq_clock_process(fmw_seq_clock_t *clock, uint32_t frames, fmw_seq_step_cb callback, void *user);
