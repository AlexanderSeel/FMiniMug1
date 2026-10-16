#pragma once
#include <stdint.h>
#include "fm_workstation_ui.h"

typedef struct {
  fmw_part_id_t part;
  uint8_t page[FMW_PART_COUNT];
  uint8_t focus_encoder; /* 0..3 when focused, 0xff otherwise */
  uint8_t hold;
  uint8_t global_mode;
  uint8_t global_page;
} fmw_ui_state_t;

void fmw_ui_state_init(fmw_ui_state_t *state);
void fmw_ui_select_part(fmw_ui_state_t *state, fmw_part_id_t part);
void fmw_ui_next_part(fmw_ui_state_t *state, int delta);
void fmw_ui_next_page(fmw_ui_state_t *state, int delta);
void fmw_ui_set_hold(fmw_ui_state_t *state, int hold);
void fmw_ui_toggle_focus(fmw_ui_state_t *state, uint8_t encoder);
const fmw_part_desc_t *fmw_ui_part_desc(const fmw_ui_state_t *state);
const fmw_page_desc_t *fmw_ui_page_desc(const fmw_ui_state_t *state);
