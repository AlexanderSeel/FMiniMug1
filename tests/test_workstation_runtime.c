#include "fm_workstation_runtime.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>

static int nearf(float a, float b) { return fabsf(a - b) < 0.0001f; }

int main(void) {
  fmw_runtime_t state;
  fmw_runtime_init(&state);

  assert(state.ui.part == FMW_PART_MINI);
  assert(state.clock.length == 16u);
  assert(state.clock.bpm == 100u);
  assert(state.clock.swing == 0u);
  assert(nearf(state.part_level[FMW_PART_MINI], 0.72f));
  assert(nearf(state.part_level[FMW_PART_DRUM808], 0.42f));
  assert(nearf(state.part_level[FMW_PART_BASS808], 0.38f));
  assert(nearf(state.part_level[FMW_PART_ALPHA], 0.62f));
  assert(nearf(state.master_level, 0.72f));
  assert(state.playing == 0u);
  assert(state.alpha_param == 9u);
  assert(state.alpha_focus == FMW_ALPHA_FOCUS_PARAM);
  assert(state.alpha_modify == FMW_ALPHA_MODIFY_BRILLIANCE);

  fmw_runtime_set_part_level(&state, FMW_PART_ALPHA, 2.0f);
  assert(nearf(state.part_level[FMW_PART_ALPHA], 1.25f));
  fmw_runtime_set_part_level(&state, FMW_PART_ALPHA, -1.0f);
  assert(nearf(state.part_level[FMW_PART_ALPHA], 0.0f));
  fmw_runtime_set_master(&state, 4.0f);
  assert(nearf(state.master_level, 1.2f));

  fmw_runtime_set_fx(&state, 0u, 2.0f);
  fmw_runtime_set_fx(&state, 1u, -1.0f);
  fmw_runtime_set_fx(&state, 2u, 8.0f);
  assert(nearf(state.fx[0], 0.8f));
  assert(nearf(state.fx[1], 0.0f));
  assert(nearf(state.fx[2], 3.0f));

  fmw_runtime_set_clock(&state, 0u, 20u, 99u);
  assert(state.clock.length == 1u);
  assert(state.clock.bpm == 40u);
  assert(state.clock.swing == 75u);
  fmw_runtime_set_clock(&state, 99u, 999u, 10u);
  assert(state.clock.length == 64u);
  assert(state.clock.bpm == 300u);
  assert(state.clock.swing == 10u);

  fmw_runtime_start(&state);
  assert(state.playing == 1u);
  fmw_runtime_toggle_play(&state);
  assert(state.playing == 0u);
  fmw_runtime_toggle_play(&state);
  assert(state.playing == 1u);
  fmw_runtime_stop(&state);
  assert(state.playing == 0u);

  fmw_runtime_set_scene(&state, 7u);
  assert(state.scene == 7u);

  fmw_runtime_set_alpha_param(&state, 29u);
  fmw_runtime_step_alpha_param(&state, 1);
  assert(state.alpha_param == 0u);
  fmw_runtime_step_alpha_param(&state, -1);
  assert(state.alpha_param == 29u);
  fmw_runtime_set_alpha_focus(&state, FMW_ALPHA_FOCUS_VALUE);
  assert(state.alpha_focus == FMW_ALPHA_FOCUS_VALUE);
  fmw_runtime_set_alpha_focus(&state, FMW_ALPHA_FOCUS_TONE_MODIFY);
  assert(state.alpha_focus == FMW_ALPHA_FOCUS_TONE_MODIFY);
  fmw_runtime_set_alpha_focus(&state, FMW_ALPHA_FOCUS_PARAM);
  assert(state.alpha_focus == FMW_ALPHA_FOCUS_PARAM);

  fmw_runtime_set_alpha_modify(&state, FMW_ALPHA_MODIFY_ENV_TIME);
  fmw_runtime_step_alpha_modify(&state, 1);
  assert(state.alpha_modify == FMW_ALPHA_MODIFY_BRILLIANCE);
  fmw_runtime_step_alpha_modify(&state, -1);
  assert(state.alpha_modify == FMW_ALPHA_MODIFY_ENV_TIME);
  fmw_runtime_set_alpha_modify_amount(&state, FMW_ALPHA_MODIFY_DEPTH, 5.0f);
  assert(nearf(state.alpha_modify_amount[FMW_ALPHA_MODIFY_DEPTH], 1.0f));
  fmw_runtime_set_alpha_modify_amount(&state, FMW_ALPHA_MODIFY_DEPTH, -5.0f);
  assert(nearf(state.alpha_modify_amount[FMW_ALPHA_MODIFY_DEPTH], -1.0f));

  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_SCENE, 0u, 3.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_PLAYING, 0u, 1.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_MASTER, 0u, 0.35f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_PART_LEVEL, FMW_PART_DRUM808, 0.25f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_FX, 1u, 0.4f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_CLOCK_LENGTH, 0u, 32.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_CLOCK_BPM, 0u, 128.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_CLOCK_SWING, 0u, 18.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_PARAM, 0u, 17.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_FOCUS, 0u, 1.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_FOCUS, 0u, 2.0f));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_MODIFY, 0u, FMW_ALPHA_MODIFY_DEPTH));
  assert(fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT, FMW_ALPHA_MODIFY_DEPTH, 0.625f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_SCENE, 0u), 3.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_PLAYING, 0u), 1.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_MASTER, 0u), 0.35f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_PART_LEVEL, FMW_PART_DRUM808), 0.25f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_FX, 1u), 0.4f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_CLOCK_LENGTH, 0u), 32.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_CLOCK_BPM, 0u), 128.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_CLOCK_SWING, 0u), 18.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_ALPHA_PARAM, 0u), 17.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_ALPHA_FOCUS, 0u), 2.0f));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_ALPHA_MODIFY, 0u), FMW_ALPHA_MODIFY_DEPTH));
  assert(nearf(fmw_runtime_get_value(&state, FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT, FMW_ALPHA_MODIFY_DEPTH), 0.625f));
  assert(!fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_PARAM, 0u, FMW_RUNTIME_ALPHA_PARAM_COUNT));
  assert(!fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_FOCUS, 0u, 1.5f));
  assert(!fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_FOCUS, 0u, 3.0f));
  assert(!fmw_runtime_set_value(&state, FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT, FMW_RUNTIME_ALPHA_MODIFY_COUNT, 0.5f));
  assert(!fmw_runtime_set_value(&state, (fmw_runtime_field_t)99, 0u, 0.0f));

  fma_t alpha = {0};
  alpha.patch.cutoff_hz = 1000.0f; alpha.patch.hpf_cutoff_hz = 100.0f; alpha.patch.resonance = 0.5f;
  fmw_runtime_set_alpha_modify(&state, FMW_ALPHA_MODIFY_BRILLIANCE);
  fmw_runtime_apply_alpha_modify(&state, &alpha, 1);
  assert(nearf(alpha.patch.cutoff_hz, 1280.0f));
  assert(nearf(alpha.patch.hpf_cutoff_hz, 135.0f));
  assert(nearf(alpha.patch.resonance, 0.512f));
  assert(nearf(state.alpha_modify_amount[FMW_ALPHA_MODIFY_BRILLIANCE], 0.125f));
  assert(nearf(fmw_runtime_get_alpha_param(&alpha, 4u), 1280.0f));
  alpha.patch.cutoff_hz = 11900.0f; alpha.patch.hpf_cutoff_hz = 1590.0f; alpha.patch.resonance = 0.94f;
  fmw_runtime_apply_alpha_modify(&state, &alpha, 4);
  assert(nearf(alpha.patch.cutoff_hz, 12000.0f));
  assert(nearf(alpha.patch.hpf_cutoff_hz, 1600.0f));
  assert(nearf(alpha.patch.resonance, 0.95f));
  assert(nearf(state.alpha_modify_amount[FMW_ALPHA_MODIFY_BRILLIANCE], 0.625f));

  alpha.patch.lfo_rate_hz = 0.38f; alpha.patch.pwm_rate_hz = 0.3f;
  fmw_runtime_set_alpha_modify(&state, FMW_ALPHA_MODIFY_RATE);
  fmw_runtime_apply_alpha_modify(&state, &alpha, 1);
  assert(nearf(alpha.patch.lfo_rate_hz, 0.48f));
  assert(nearf(alpha.patch.pwm_rate_hz, 0.4f));
  alpha.patch.lfo_dco_amount = 0.06f; alpha.patch.lfo_vcf_amount_hz = 120.0f; alpha.patch.pwm_depth = 0.12f;
  fmw_runtime_set_alpha_modify(&state, FMW_ALPHA_MODIFY_DEPTH);
  fmw_runtime_apply_alpha_modify(&state, &alpha, 1);
  assert(nearf(alpha.patch.lfo_dco_amount, 0.08f));
  assert(nearf(alpha.patch.lfo_vcf_amount_hz, 150.0f));
  assert(nearf(alpha.patch.pwm_depth, 0.135f));
  alpha.patch.attack_s = 0.018f; alpha.patch.decay_s = 0.42f; alpha.patch.release_s = 0.48f;
  fmw_runtime_set_alpha_modify(&state, FMW_ALPHA_MODIFY_ENV_TIME);
  fmw_runtime_apply_alpha_modify(&state, &alpha, 1);
  assert(nearf(alpha.patch.attack_s, 0.043f));
  assert(nearf(alpha.patch.decay_s, 0.47f));
  assert(nearf(alpha.patch.release_s, 0.54f));

  puts("workstation runtime state and indexed ABI tests passed");
  return 0;
}
