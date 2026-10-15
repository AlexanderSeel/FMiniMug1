#pragma once
#include <stdint.h>
#include "fm1_platform.h"
#include "fm_voice.h"
#include "fm_seq.h"

typedef enum {
  FM_UI_OSC = 0,
  FM_UI_MIX,
  FM_UI_FILTER,
  FM_UI_CONTOUR,
  FM_UI_MOD,
  FM_UI_SEQ,
  FM_UI_PAGE_COUNT
} fm_ui_page_t;

typedef struct {
  fm_ui_page_t page;
  int8_t focus_encoder; /* -1 = normal page, 0..3 = FOCUS */
  uint8_t hold;
  uint8_t preset_index;
  uint8_t pattern_index;
  uint8_t playing;
  uint16_t tempo_bpm;

  /* 16-step window over the native 1..64 step pattern. While playing the
   * window follows the current step; while stopped encoder 2 selects page 1..4. */
  uint8_t seq_window;
  uint8_t seq_length;
  uint8_t seq_step;
  int8_t seq_notes[16];
  uint8_t seq_flags[16];
} fm_ui_state_t;

void fm_ui_init(fm_ui_state_t *ui);
void fm_ui_handle_input(fm_ui_state_t *ui, fm_patch_t *patch, const fm1_input_frame_t *input);
void fm_ui_set_sequence_view(fm_ui_state_t *ui, const fm_seq_pattern_t *pattern, uint8_t current_step);
void fm_ui_render(const fm_ui_state_t *ui, const fm_patch_t *patch, const char *preset_name);
