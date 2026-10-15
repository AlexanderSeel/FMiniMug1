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

  /* Loudness contour. Existing parameter IDs 12..15 continue to address it. */
  float attack_s;
  float decay_s;
  float sustain;
  float release_s;

  /* Independent filter contour. */
  float filter_attack_s;
  float filter_decay_s;
  float filter_sustain;
  float filter_release_s;

  float glide_s;
  float mixer_drive;
  float filter_drive;
  float drift;
  float feedback;
  /* 0, 1, 2, 3 = off, 1/3, 2/3, full keyboard tracking. */
  uint8_t filter_keytrack;
  /* Oversample the oscillator/mixer/ladder path two times. */
  uint8_t oversample_2x;
  /* 0 = legato does not restart contours, 1 = every selected note retriggers. */
  uint8_t retrigger;
  /* FM_NOTE_LOW / FM_NOTE_HIGH / FM_NOTE_LAST. */
  uint8_t note_priority;
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
  uint64_t held_notes[2];
  uint16_t held_order[128];
  uint16_t note_serial;
  uint32_t rng;
} fm_voice_t;

void fm_voice_init(fm_voice_t *v, float sample_rate);
void fm_voice_set_patch(fm_voice_t *v, const fm_patch_t *patch);
void fm_voice_note_on(fm_voice_t *v, uint8_t midi_note, uint8_t velocity);
void fm_voice_note_off_note(fm_voice_t *v, uint8_t midi_note);
void fm_voice_note_off(fm_voice_t *v);
float fm_voice_process(fm_voice_t *v);
