#pragma once
#include <stdint.h>
#include "fm_seq.h"
#include "fm_ui.h"
#include "fm_voice.h"

typedef struct {
  fm_voice_t voice;
  fm_seq_t sequencer;
  fm_ui_state_t ui;
  int8_t octave_shift;
  uint8_t sequence_loaded;
  uint8_t last_playing;
  uint8_t key_midi[27];
  uint32_t key_down;
  uint32_t last_ui_ms;
} fm_app_t;

/* Initializes the portable runtime and the platform boundary. */
void fm_app_init(fm_app_t *app, float sample_rate);

/* Install a sequence without starting it. The UI PLAY state controls transport. */
void fm_app_set_sequence(fm_app_t *app, const fm_seq_pattern_t *pattern);

/* Process one main-loop iteration: input edges, transport, audio and UI. */
void fm_app_tick(fm_app_t *app, const char *preset_name);

/* Exposed for deterministic host tests and interrupt-driven target adapters. */
void fm_app_handle_input(fm_app_t *app, const fm1_input_frame_t *input);
void fm_app_render_audio(fm_app_t *app, fm1_audio_block_t *block);
