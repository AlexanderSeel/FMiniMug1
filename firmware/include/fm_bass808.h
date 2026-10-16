#pragma once
#include <stdint.h>

typedef enum {
  FMB808_SAW = 0,
  FMB808_SQUARE = 1
} fmb808_wave_t;

typedef enum {
  FMB808_PARAM_WAVE = 0,
  FMB808_PARAM_TUNE,
  FMB808_PARAM_SUB,
  FMB808_PARAM_DRIVE,
  FMB808_PARAM_CUTOFF,
  FMB808_PARAM_RESONANCE,
  FMB808_PARAM_ENV_MOD,
  FMB808_PARAM_DECAY,
  FMB808_PARAM_SLIDE,
  FMB808_PARAM_ACCENT,
  FMB808_PARAM_ACCENT_DECAY,
  FMB808_PARAM_COUNT
} fmb808_param_id_t;

typedef struct {
  uint8_t wave;
  float tune_semitones;
  float sub_level;
  float drive;
  float cutoff_hz;
  float resonance;
  float env_mod_hz;
  float decay_s;
  float slide_s;
  float accent_amount;
  float accent_decay_s;
} fmb808_patch_t;

typedef struct {
  float sample_rate;
  fmb808_patch_t patch;
  float phase;
  float sub_phase;
  float current_freq;
  float target_freq;
  float env;
  float accent_env;
  float filter[4];
  float gate;
  uint8_t current_note;
  uint8_t sliding;
} fmb808_t;

void fmb808_init(fmb808_t *voice, float sample_rate);
void fmb808_set_patch(fmb808_t *voice, const fmb808_patch_t *patch);
/* slide!=0 retargets pitch without restarting the filter/accent envelopes. */
void fmb808_note_on(fmb808_t *voice, uint8_t midi_note, uint8_t accent, uint8_t slide);
void fmb808_note_off(fmb808_t *voice);
float fmb808_process(fmb808_t *voice);
