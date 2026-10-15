#pragma once
#include <stdint.h>
#include "fm1_platform.h"
#include "fm_voice.h"

typedef enum {
  FM_STUDIO_LAYER = 0,
  FM_STUDIO_DRUM,
  FM_STUDIO_FX,
  FM_STUDIO_PAGE_COUNT
} fm_studio_page_t;

typedef struct {
  fm_voice_t voice_b;
  fm_studio_page_t page;
  uint8_t active;
  uint8_t layer_enabled;
  uint8_t drums_enabled;
  uint8_t character;
  float sample_rate;
  float layer_level;
  float drum_level;
  float delay_mix;
  float delay_feedback;
  float drive;
  float kick_tone;
  float hat_tone;
  uint16_t tempo_bpm;
  uint8_t drum_step;
  float kick_phase;
  float kick_env;
  float snare_env;
  float hat_env;
  uint32_t noise_state;
  int16_t delay_buffer[2048];
  uint16_t delay_pos;
} fm_studio_t;

void fm_studio_init(fm_studio_t *studio, float sample_rate);
int fm_studio_handle_input(fm_studio_t *studio, const fm1_input_frame_t *input);
void fm_studio_note_on(fm_studio_t *studio, uint8_t note, uint8_t velocity);
void fm_studio_note_off(fm_studio_t *studio, uint8_t note);
void fm_studio_trigger_step(fm_studio_t *studio, uint8_t step_index);
float fm_studio_process(fm_studio_t *studio, float synth_a);
void fm_studio_render(const fm_studio_t *studio);
