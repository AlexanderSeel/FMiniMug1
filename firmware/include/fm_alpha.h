#pragma once
#include <stdint.h>

#define FMA_POLYPHONY 6
#define FMA_CHORUS_BUFFER 1024

typedef enum {
  FMA_ENV_OFF = 0,
  FMA_ENV_ATTACK,
  FMA_ENV_DECAY,
  FMA_ENV_SUSTAIN,
  FMA_ENV_RELEASE
} fma_env_stage_t;

typedef struct {
  float saw_level;
  float pulse_level;
  float sub_level;
  float noise_level;
  float cutoff_hz;
  float resonance;
  float env_amount_hz;
  float keytrack;
  float level;
  uint8_t gate_vca;
  float velocity_amount;
  float attack_s;
  float decay_s;
  float sustain;
  float release_s;
  float lfo_rate_hz;
  float lfo_delay_s;
  float lfo_dco_amount;
  float lfo_vcf_amount_hz;
  uint8_t chorus_mode;
  float chorus_rate_hz;
  float chorus_depth;
  float chorus_mix;
  float pulse_width;
  float pwm_depth;
  float pwm_rate_hz;
  float hpf_cutoff_hz;
  int8_t dco_range_semitones;
  float dco_env_amount;
} fma_patch_t;

typedef struct {
  float phase;
  float sub_phase;
  float filter1;
  float filter2;
  float hpf_state;
  float hpf_input;
  float env;
  float velocity;
  uint32_t age;
  uint8_t note;
  uint8_t gate;
  uint8_t env_stage;
} fma_voice_t;

typedef struct {
  float sample_rate;
  fma_patch_t patch;
  fma_voice_t voices[FMA_POLYPHONY];
  float lfo_phase;
  float pwm_phase;
  float lfo_age_s;
  float chorus_phase;
  float chorus_buffer[FMA_CHORUS_BUFFER];
  uint16_t chorus_write;
  uint32_t noise_state;
  uint32_t age_counter;
} fma_t;

void fma_init(fma_t *synth, float sample_rate);
void fma_set_patch(fma_t *synth, const fma_patch_t *patch);
void fma_note_on(fma_t *synth, uint8_t midi_note, uint8_t velocity);
void fma_note_off(fma_t *synth, uint8_t midi_note);
void fma_all_notes_off(fma_t *synth);
float fma_process(fma_t *synth);
