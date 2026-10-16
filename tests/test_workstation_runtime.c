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
  fmw_runtime_toggle_alpha_focus(&state);
  assert(state.alpha_focus == FMW_ALPHA_FOCUS_VALUE);
  fmw_runtime_toggle_alpha_focus(&state);
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

  puts("workstation runtime state tests passed");
  return 0;
}
