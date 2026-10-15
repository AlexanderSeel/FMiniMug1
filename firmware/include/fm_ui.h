#pragma once
#include <stdint.h>
#include "fm1_platform.h"
#include "fm_voice.h"

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
} fm_ui_state_t;

void fm_ui_init(fm_ui_state_t *ui);
void fm_ui_handle_input(fm_ui_state_t *ui, fm_patch_t *patch, const fm1_input_frame_t *input);
void fm_ui_render(const fm_ui_state_t *ui, const fm_patch_t *patch, const char *preset_name);
