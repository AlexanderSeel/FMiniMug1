#include "fm_workstation_state.h"
#include <string.h>

static uint8_t page_count_for(fmw_part_id_t part) {
  if ((unsigned)part >= FMW_PART_COUNT) return 1u;
  return FMW_PARTS[(unsigned)part].page_count ? FMW_PARTS[(unsigned)part].page_count : 1u;
}

void fmw_ui_state_init(fmw_ui_state_t *state) {
  memset(state, 0, sizeof(*state));
  state->part = FMW_PART_MINI;
  state->focus_encoder = 0xffu;
}

void fmw_ui_select_part(fmw_ui_state_t *state, fmw_part_id_t part) {
  if (!state || (unsigned)part >= FMW_PART_COUNT) return;
  state->part = part;
  state->global_mode = 0u;
  state->focus_encoder = 0xffu;
}

void fmw_ui_next_part(fmw_ui_state_t *state, int delta) {
  if (!state || delta == 0) return;
  int next = (int)state->part + (delta > 0 ? 1 : -1);
  if (next < 0) next = FMW_PART_COUNT - 1;
  if (next >= FMW_PART_COUNT) next = 0;
  fmw_ui_select_part(state, (fmw_part_id_t)next);
}

void fmw_ui_next_page(fmw_ui_state_t *state, int delta) {
  if (!state || delta == 0) return;
  if (state->global_mode) {
    int next = (int)state->global_page + (delta > 0 ? 1 : -1);
    if (next < 0) next = 3;
    if (next > 3) next = 0;
    state->global_page = (uint8_t)next;
    state->focus_encoder = 0xffu;
    return;
  }
  const uint8_t count = page_count_for(state->part);
  int next = (int)state->page[(unsigned)state->part] + (delta > 0 ? 1 : -1);
  if (next < 0) next = (int)count - 1;
  if (next >= (int)count) next = 0;
  state->page[(unsigned)state->part] = (uint8_t)next;
  state->focus_encoder = 0xffu;
}

void fmw_ui_set_hold(fmw_ui_state_t *state, int hold) {
  if (!state) return;
  state->hold = hold ? 1u : 0u;
}

void fmw_ui_toggle_focus(fmw_ui_state_t *state, uint8_t encoder) {
  if (!state || encoder > 3u) return;
  state->focus_encoder = state->focus_encoder == encoder ? 0xffu : encoder;
}

const fmw_part_desc_t *fmw_ui_part_desc(const fmw_ui_state_t *state) {
  if (!state || state->global_mode || (unsigned)state->part >= FMW_PART_COUNT) return 0;
  return &FMW_PARTS[(unsigned)state->part];
}

const fmw_page_desc_t *fmw_ui_page_desc(const fmw_ui_state_t *state) {
  const fmw_part_desc_t *part = fmw_ui_part_desc(state);
  if (!part) return 0;
  uint8_t page = state->page[(unsigned)state->part];
  if (page >= part->page_count) page = 0u;
  return &part->pages[page];
}
