#include "fm_workstation_runtime.h"
#include <string.h>

static float clampf(float value, float lo, float hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

static uint8_t wrap_u8(int value, uint8_t count) {
  int v;
  if (!count) return 0u;
  v = value % (int)count;
  if (v < 0) v += count;
  return (uint8_t)v;
}

void fmw_runtime_init(fmw_runtime_t *state) {
  if (!state) return;
  memset(state, 0, sizeof(*state));
  fmw_ui_state_init(&state->ui);
  state->clock.bpm = 100u;
  state->clock.swing = 0u;
  state->clock.length = 16u;
  state->part_level[FMW_PART_MINI] = 0.72f;
  state->part_level[FMW_PART_DRUM808] = 0.42f;
  state->part_level[FMW_PART_BASS808] = 0.38f;
  state->part_level[FMW_PART_ALPHA] = 0.62f;
  state->master_level = 0.72f;
  state->fx[0] = 0.12f;
  state->fx[1] = 0.12f;
  state->fx[2] = 1.0f;
  state->alpha_param = 9u;
  state->alpha_focus = FMW_ALPHA_FOCUS_PARAM;
  state->alpha_modify = FMW_ALPHA_MODIFY_BRILLIANCE;
}

void fmw_runtime_set_part_level(fmw_runtime_t *state, uint8_t part, float value) {
  if (!state || part >= FMW_RUNTIME_PART_COUNT) return;
  state->part_level[part] = clampf(value, 0.0f, 1.25f);
}

void fmw_runtime_set_master(fmw_runtime_t *state, float value) {
  if (!state) return;
  state->master_level = clampf(value, 0.0f, 1.2f);
}

void fmw_runtime_set_fx(fmw_runtime_t *state, uint8_t param, float value) {
  if (!state || param >= FMW_RUNTIME_FX_COUNT) return;
  if (param < 2u) state->fx[param] = clampf(value, 0.0f, 0.8f);
  else state->fx[param] = clampf(value, 0.5f, 3.0f);
}

void fmw_runtime_set_clock(fmw_runtime_t *state, uint8_t length, uint16_t bpm, uint8_t swing) {
  if (!state) return;
  if (length < 1u) length = 1u;
  if (length > FMW_SEQ_MAX_STEPS) length = FMW_SEQ_MAX_STEPS;
  if (bpm < 40u) bpm = 40u;
  if (bpm > 300u) bpm = 300u;
  if (swing > 75u) swing = 75u;
  state->clock.length = length;
  state->clock.bpm = bpm;
  state->clock.swing = swing;
}

void fmw_runtime_start(fmw_runtime_t *state) { if (state) state->playing = 1u; }
void fmw_runtime_stop(fmw_runtime_t *state) { if (state) state->playing = 0u; }
void fmw_runtime_toggle_play(fmw_runtime_t *state) { if (state) state->playing ^= 1u; }
void fmw_runtime_set_scene(fmw_runtime_t *state, uint8_t scene) { if (state) state->scene = scene; }

void fmw_runtime_set_alpha_param(fmw_runtime_t *state, uint8_t param) {
  if (!state) return;
  if (param >= FMW_RUNTIME_ALPHA_PARAM_COUNT) param = FMW_RUNTIME_ALPHA_PARAM_COUNT - 1u;
  state->alpha_param = param;
}

void fmw_runtime_step_alpha_param(fmw_runtime_t *state, int delta) {
  if (!state) return;
  state->alpha_param = wrap_u8((int)state->alpha_param + delta, FMW_RUNTIME_ALPHA_PARAM_COUNT);
}

void fmw_runtime_toggle_alpha_focus(fmw_runtime_t *state) {
  if (!state) return;
  state->alpha_focus = state->alpha_focus == FMW_ALPHA_FOCUS_PARAM ? FMW_ALPHA_FOCUS_VALUE : FMW_ALPHA_FOCUS_PARAM;
}

void fmw_runtime_set_alpha_modify(fmw_runtime_t *state, uint8_t modify) {
  if (!state) return;
  state->alpha_modify = (fmw_alpha_modify_t)(modify % FMW_RUNTIME_ALPHA_MODIFY_COUNT);
}

void fmw_runtime_step_alpha_modify(fmw_runtime_t *state, int delta) {
  if (!state) return;
  state->alpha_modify = (fmw_alpha_modify_t)wrap_u8((int)state->alpha_modify + delta, FMW_RUNTIME_ALPHA_MODIFY_COUNT);
}

void fmw_runtime_set_alpha_modify_amount(fmw_runtime_t *state, uint8_t modify, float amount) {
  if (!state || modify >= FMW_RUNTIME_ALPHA_MODIFY_COUNT) return;
  state->alpha_modify_amount[modify] = clampf(amount, -1.0f, 1.0f);
}

int fmw_runtime_set_value(fmw_runtime_t *state, fmw_runtime_field_t field, uint8_t index, float value) {
  if (!state || value != value) return 0;
  switch (field) {
    case FMW_RUNTIME_FIELD_SCENE:
      if (index != 0u || value < 0.0f || value > 255.0f) return 0;
      fmw_runtime_set_scene(state, (uint8_t)value);
      return 1;
    case FMW_RUNTIME_FIELD_PLAYING:
      if (index != 0u) return 0;
      if (value >= 0.5f) fmw_runtime_start(state); else fmw_runtime_stop(state);
      return 1;
    case FMW_RUNTIME_FIELD_MASTER:
      if (index != 0u) return 0;
      fmw_runtime_set_master(state, value);
      return 1;
    case FMW_RUNTIME_FIELD_PART_LEVEL:
      if (index >= FMW_RUNTIME_PART_COUNT) return 0;
      fmw_runtime_set_part_level(state, index, value);
      return 1;
    case FMW_RUNTIME_FIELD_FX:
      if (index >= FMW_RUNTIME_FX_COUNT) return 0;
      fmw_runtime_set_fx(state, index, value);
      return 1;
    case FMW_RUNTIME_FIELD_CLOCK_LENGTH:
      if (index != 0u || value < 1.0f || value > (float)FMW_SEQ_MAX_STEPS) return 0;
      fmw_runtime_set_clock(state, (uint8_t)value, state->clock.bpm, state->clock.swing);
      return 1;
    case FMW_RUNTIME_FIELD_CLOCK_BPM:
      if (index != 0u || value < 40.0f || value > 300.0f) return 0;
      fmw_runtime_set_clock(state, state->clock.length, (uint16_t)value, state->clock.swing);
      return 1;
    case FMW_RUNTIME_FIELD_CLOCK_SWING:
      if (index != 0u || value < 0.0f || value > 75.0f) return 0;
      fmw_runtime_set_clock(state, state->clock.length, state->clock.bpm, (uint8_t)value);
      return 1;
    case FMW_RUNTIME_FIELD_ALPHA_PARAM:
      if (index != 0u || value < 0.0f || value >= (float)FMW_RUNTIME_ALPHA_PARAM_COUNT) return 0;
      fmw_runtime_set_alpha_param(state, (uint8_t)value);
      return 1;
    case FMW_RUNTIME_FIELD_ALPHA_FOCUS:
      if (index != 0u) return 0;
      state->alpha_focus = value >= 0.5f ? FMW_ALPHA_FOCUS_VALUE : FMW_ALPHA_FOCUS_PARAM;
      return 1;
    case FMW_RUNTIME_FIELD_ALPHA_MODIFY:
      if (index != 0u || value < 0.0f || value >= (float)FMW_RUNTIME_ALPHA_MODIFY_COUNT) return 0;
      fmw_runtime_set_alpha_modify(state, (uint8_t)value);
      return 1;
    case FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT:
      if (index >= FMW_RUNTIME_ALPHA_MODIFY_COUNT) return 0;
      fmw_runtime_set_alpha_modify_amount(state, index, value);
      return 1;
    case FMW_RUNTIME_FIELD_ALPHA_PATCH_PARAM:
      return 0; /* Readback only; engine parameter writes go through their normal setters. */
    default:
      return 0;
  }
}

float fmw_runtime_get_value(const fmw_runtime_t *state, fmw_runtime_field_t field, uint8_t index) {
  if (!state) return 0.0f;
  switch (field) {
    case FMW_RUNTIME_FIELD_SCENE: return index == 0u ? (float)state->scene : 0.0f;
    case FMW_RUNTIME_FIELD_PLAYING: return index == 0u ? (float)state->playing : 0.0f;
    case FMW_RUNTIME_FIELD_MASTER: return index == 0u ? state->master_level : 0.0f;
    case FMW_RUNTIME_FIELD_PART_LEVEL: return index < FMW_RUNTIME_PART_COUNT ? state->part_level[index] : 0.0f;
    case FMW_RUNTIME_FIELD_FX: return index < FMW_RUNTIME_FX_COUNT ? state->fx[index] : 0.0f;
    case FMW_RUNTIME_FIELD_CLOCK_LENGTH: return index == 0u ? (float)state->clock.length : 0.0f;
    case FMW_RUNTIME_FIELD_CLOCK_BPM: return index == 0u ? (float)state->clock.bpm : 0.0f;
    case FMW_RUNTIME_FIELD_CLOCK_SWING: return index == 0u ? (float)state->clock.swing : 0.0f;
    case FMW_RUNTIME_FIELD_ALPHA_PARAM: return index == 0u ? (float)state->alpha_param : 0.0f;
    case FMW_RUNTIME_FIELD_ALPHA_FOCUS: return index == 0u ? (float)state->alpha_focus : 0.0f;
    case FMW_RUNTIME_FIELD_ALPHA_MODIFY: return index == 0u ? (float)state->alpha_modify : 0.0f;
    case FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT: return index < FMW_RUNTIME_ALPHA_MODIFY_COUNT ? state->alpha_modify_amount[index] : 0.0f;
    case FMW_RUNTIME_FIELD_ALPHA_PATCH_PARAM: return 0.0f;
    default: return 0.0f;
  }
}

void fmw_runtime_apply_alpha_modify(fmw_runtime_t *state, fma_t *alpha, int delta) {
  if (!state || !alpha || delta == 0) return;
  fma_patch_t *patch = &alpha->patch;
  switch (state->alpha_modify) {
    case FMW_ALPHA_MODIFY_BRILLIANCE:
      patch->cutoff_hz = clampf(patch->cutoff_hz + (float)delta * 280.0f, 45.0f, 12000.0f);
      patch->hpf_cutoff_hz = clampf(patch->hpf_cutoff_hz + (float)delta * 35.0f, 0.0f, 1600.0f);
      patch->resonance = clampf(patch->resonance + (float)delta * 0.012f, 0.0f, 0.95f);
      break;
    case FMW_ALPHA_MODIFY_RATE:
      patch->lfo_rate_hz = clampf(patch->lfo_rate_hz + (float)delta * 0.10f, 0.02f, 15.0f);
      patch->pwm_rate_hz = clampf(patch->pwm_rate_hz + (float)delta * 0.10f, 0.02f, 12.0f);
      break;
    case FMW_ALPHA_MODIFY_DEPTH:
      patch->lfo_dco_amount = clampf(patch->lfo_dco_amount + (float)delta * 0.02f, 0.0f, 2.0f);
      patch->lfo_vcf_amount_hz = clampf(patch->lfo_vcf_amount_hz + (float)delta * 30.0f, 0.0f, 2000.0f);
      patch->pwm_depth = clampf(patch->pwm_depth + (float)delta * 0.015f, 0.0f, 0.4f);
      break;
    case FMW_ALPHA_MODIFY_ENV_TIME:
      patch->attack_s = clampf(patch->attack_s + (float)delta * 0.025f, 0.001f, 4.0f);
      patch->decay_s = clampf(patch->decay_s + (float)delta * 0.05f, 0.01f, 5.0f);
      patch->release_s = clampf(patch->release_s + (float)delta * 0.06f, 0.01f, 6.0f);
      break;
    default:
      return;
  }
  const uint8_t selected = (uint8_t)state->alpha_modify;
  fmw_runtime_set_alpha_modify_amount(state, selected, state->alpha_modify_amount[selected] + (float)delta / 8.0f);
}

float fmw_runtime_get_alpha_param(const fma_t *alpha, uint8_t param) {
  if (!alpha) return 0.0f;
  const fma_patch_t *patch = &alpha->patch;
  switch (param) {
    case 0u: return patch->saw_level;
    case 1u: return patch->pulse_level;
    case 2u: return patch->sub_level;
    case 3u: return patch->noise_level;
    case 4u: return patch->cutoff_hz;
    case 5u: return patch->resonance;
    case 6u: return patch->env_amount_hz;
    case 7u: return patch->keytrack;
    case 8u: return patch->level;
    case 9u: return (float)patch->gate_vca;
    case 10u: return patch->velocity_amount;
    case 12u: return patch->attack_s;
    case 13u: return patch->decay_s;
    case 14u: return patch->sustain;
    case 15u: return patch->release_s;
    case 16u: return patch->lfo_rate_hz;
    case 17u: return patch->lfo_delay_s;
    case 18u: return patch->lfo_dco_amount;
    case 19u: return patch->lfo_vcf_amount_hz;
    case 20u: return (float)patch->chorus_mode;
    case 21u: return patch->chorus_rate_hz;
    case 22u: return patch->chorus_depth;
    case 23u: return patch->chorus_mix;
    case 24u: return patch->pulse_width;
    case 25u: return patch->pwm_depth;
    case 26u: return patch->pwm_rate_hz;
    case 27u: return patch->hpf_cutoff_hz;
    case 28u: return (float)patch->dco_range_semitones;
    case 29u: return patch->dco_env_amount;
    default: return 0.0f;
  }
}
