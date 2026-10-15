#pragma once
#include <stdint.h>

typedef enum { FM_WAVE_TRI, FM_WAVE_SAW, FM_WAVE_SQUARE, FM_WAVE_PULSE } fm_wave_t;
typedef struct { fm_wave_t wave; float level; float coarse_semitones; float fine_cents; uint8_t keyboard_track; uint8_t low_mode; } fm_osc_params_t;
typedef struct {
  fm_osc_params_t osc[3];
  float cutoff_hz, resonance, filter_env_amount;
  float attack_s, decay_s, sustain, release_s;
  float glide_s, mixer_drive, filter_drive, drift, feedback;
  uint8_t filter_keytrack;
} fm_patch_t;
typedef struct {
  float sample_rate;
  fm_patch_t patch;
  float phase[3], freq[3], target_freq[3], drift_state[3];
  float env_amp, env_filter;
  float ladder[4];
  float gate;
  uint32_t rng;
} fm_voice_t;
void fm_voice_init(fm_voice_t *v, float sample_rate);
void fm_voice_set_patch(fm_voice_t *v, const fm_patch_t *patch);
void fm_voice_note_on(fm_voice_t *v, uint8_t midi_note, uint8_t velocity);
void fm_voice_note_off(fm_voice_t *v);
float fm_voice_process(fm_voice_t *v);
