#pragma once
#include <stdint.h>
#include "fm_workstation_seq.h"
#include "fm_workstation_state.h"
#include "fm_alpha.h"

#define FMW_RUNTIME_PART_COUNT 4u
#define FMW_RUNTIME_FX_COUNT 3u
#define FMW_RUNTIME_ALPHA_MODIFY_COUNT 4u
#define FMW_RUNTIME_ALPHA_PARAM_COUNT 30u

/* Stable numeric field IDs used by the pointer-free WASM runtime ABI. */
typedef enum {
  FMW_RUNTIME_FIELD_SCENE = 0,
  FMW_RUNTIME_FIELD_PLAYING = 1,
  FMW_RUNTIME_FIELD_MASTER = 2,
  FMW_RUNTIME_FIELD_PART_LEVEL = 3,
  FMW_RUNTIME_FIELD_FX = 4,
  FMW_RUNTIME_FIELD_CLOCK_LENGTH = 5,
  FMW_RUNTIME_FIELD_CLOCK_BPM = 6,
  FMW_RUNTIME_FIELD_CLOCK_SWING = 7,
  FMW_RUNTIME_FIELD_ALPHA_PARAM = 8,
  FMW_RUNTIME_FIELD_ALPHA_FOCUS = 9,
  FMW_RUNTIME_FIELD_ALPHA_MODIFY = 10,
  FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT = 11,
  FMW_RUNTIME_FIELD_ALPHA_PATCH_PARAM = 12
} fmw_runtime_field_t;

typedef enum {
  FMW_ALPHA_FOCUS_PARAM = 0,
  FMW_ALPHA_FOCUS_VALUE = 1,
  FMW_ALPHA_FOCUS_TONE_MODIFY = 2
} fmw_alpha_focus_t;

typedef enum {
  FMW_ALPHA_MODIFY_BRILLIANCE = 0,
  FMW_ALPHA_MODIFY_RATE = 1,
  FMW_ALPHA_MODIFY_DEPTH = 2,
  FMW_ALPHA_MODIFY_ENV_TIME = 3
} fmw_alpha_modify_t;

typedef struct {
  fmw_ui_state_t ui;
  fmw_seq_clock_config_t clock;
  float part_level[FMW_RUNTIME_PART_COUNT];
  float master_level;
  float fx[FMW_RUNTIME_FX_COUNT];
  uint8_t playing;
  uint8_t scene;
  uint8_t alpha_param;
  fmw_alpha_focus_t alpha_focus;
  fmw_alpha_modify_t alpha_modify;
  float alpha_modify_amount[FMW_RUNTIME_ALPHA_MODIFY_COUNT];
} fmw_runtime_t;

void fmw_runtime_init(fmw_runtime_t *state);
void fmw_runtime_set_part_level(fmw_runtime_t *state, uint8_t part, float value);
void fmw_runtime_set_master(fmw_runtime_t *state, float value);
void fmw_runtime_set_fx(fmw_runtime_t *state, uint8_t param, float value);
void fmw_runtime_set_clock(fmw_runtime_t *state, uint8_t length, uint16_t bpm, uint8_t swing);
void fmw_runtime_start(fmw_runtime_t *state);
void fmw_runtime_stop(fmw_runtime_t *state);
void fmw_runtime_toggle_play(fmw_runtime_t *state);
void fmw_runtime_set_scene(fmw_runtime_t *state, uint8_t scene);
void fmw_runtime_set_alpha_param(fmw_runtime_t *state, uint8_t param);
void fmw_runtime_step_alpha_param(fmw_runtime_t *state, int delta);
void fmw_runtime_set_alpha_focus(fmw_runtime_t *state, fmw_alpha_focus_t focus);
void fmw_runtime_set_alpha_modify(fmw_runtime_t *state, uint8_t modify);
void fmw_runtime_step_alpha_modify(fmw_runtime_t *state, int delta);
void fmw_runtime_set_alpha_modify_amount(fmw_runtime_t *state, uint8_t modify, float amount);
int fmw_runtime_set_value(fmw_runtime_t *state, fmw_runtime_field_t field, uint8_t index, float value);
float fmw_runtime_get_value(const fmw_runtime_t *state, fmw_runtime_field_t field, uint8_t index);
void fmw_runtime_apply_alpha_modify(fmw_runtime_t *state, fma_t *alpha, int delta);
float fmw_runtime_get_alpha_param(const fma_t *alpha, uint8_t param);
