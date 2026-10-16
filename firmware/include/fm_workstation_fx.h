#pragma once
#include <stdint.h>

#define FMW_FX_DELAY_BUFFER 8192u
#define FMW_FX_AMBIENCE_BUFFER 2048u

typedef enum {
  FMW_FX_DELAY = 0,
  FMW_FX_AMBIENCE = 1,
  FMW_FX_DRIVE = 2
} fmw_fx_param_t;

typedef struct {
  float sample_rate;
  float delay_mix;
  float ambience_mix;
  float drive;
  float delay_feedback;
  float ambience_feedback;
  uint16_t delay_samples;
  uint16_t delay_pos;
  uint16_t ambience_pos;
  int16_t delay_buffer[FMW_FX_DELAY_BUFFER];
  int16_t ambience_buffer[FMW_FX_AMBIENCE_BUFFER];
} fmw_fx_t;

void fmw_fx_init(fmw_fx_t *fx, float sample_rate);
void fmw_fx_set_param(fmw_fx_t *fx, fmw_fx_param_t param, float value);
float fmw_fx_process(fmw_fx_t *fx, float input);
