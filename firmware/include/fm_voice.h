#pragma once
#include <stdint.h>

typedef enum {
  FM_WAVE_TRI,
  FM_WAVE_SAW,
  FM_WAVE_SQUARE,
  FM_WAVE_PULSE
} fm_wave_t;

typedef enum {
  FM_RANGE_32 = 0,
  FM_RANGE_16,
  FM_RANGE_8,
  FM_RANGE_4,
  FM_RANGE_2
} fm_osc_range_t;

typedef enum {
  FM_NOTE_LOW = 0,
  FM_NOTE_HIGH,
  FM_NOTE_LAST
} fm_note_priority_t;

typedef enum {
  FM_GLIDE_TIME = 0,
  FM_GLIDE_RATE
} fm_glide_mode_t;

typedef enum {
  FM_ENV_ATTACK = 0,
  FM_ENV_DECAY,
  FM_ENV_SUSTAIN,
  FM_ENV_RELEASE
} fm_env_stage_t;

typedef struct {
  fm_wave_t wave;
  float level;
  float coarse_semitones;
  float fine_cents;
  uint8_t keyboard_track;
  uint8_t low_mode;
  uint8_t range;
} fm_osc_params_t;

typedef struct {
  fm_osc_params_t osc[3];
  float cutoff_hz;
  float resonance;
  float filter_env_amount;
  float attack_s;
  float decay_s;
  float sustain;
  float release_s;
  float filter_attack_s;
  float filter_decay_s;
  float filter_sustain;
  float filter_release_s;
  float glide_s;
  float mixer_drive;
  float filter_drive;
  float drift;
  float feedback;
  uint8_t filter_keytrack;
  uint8_t oversample_2x;
  uint8_t retrigger;
  uint8_t note_priority;
  /* When enabled, key release reuses the contour's DECAY time, matching the
   * classic decay-switch workflow. Disabled keeps the extended RELEASE time. */
  uint8_t amp_decay_switch;
  uint8_t filter_decay_switch;
  uint8_t glide_mode;
} fm_patch_t;

typedef struct {
  float sample_rate;
  fm_patch_t patch;
  float phase[3];
  float freq[3];
  float target_freq[3];
  float drift_state[3];
  float tri_state[3];
  float env_amp;
  float env_filter;
  float ladder[4];
  float gate;
  float velocity;
  uint8_t current_note;
  uint8_t env_amp_stage;
  uint8_t env_filter_stage;
  /* 4 x 32-bit instead of 2 x 64-bit avoids compiler-rt helpers on pi32v2. */
  uint32_t held_notes[4];
  uint16_t held_order[128];
  uint16_t note_serial;
  uint32_t rng;
  float amp_attack_k;
  float amp_decay_k;
  float amp_release_k;
  float filter_attack_k;
  float filter_decay_k;
  float filter_release_k;
  float glide_k;
  float glide_rate_k;
  float keytrack_ratio;
  float cache_attack_s;
  float cache_decay_s;
  float cache_release_s;
  float cache_filter_attack_s;
  float cache_filter_decay_s;
  float cache_filter_release_s;
  float cache_glide_s;
  uint8_t cache_keytrack;
  uint8_t cache_keynote;
  uint8_t cache_oversample;
  uint8_t cache_glide_mode;
} fm_voice_t;

void fm_voice_init(fm_voice_t *v, float sample_rate);
void fm_voice_set_patch(fm_voice_t *v, const fm_patch_t *patch);
void fm_voice_note_on(fm_voice_t *v, uint8_t midi_note, uint8_t velocity);
void fm_voice_note_off_note(fm_voice_t *v, uint8_t midi_note);
void fm_voice_note_off(fm_voice_t *v);
float fm_voice_process(fm_voice_t *v);
