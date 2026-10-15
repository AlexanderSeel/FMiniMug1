/* SPDX-License-Identifier: GPL-3.0-only
 * FMiniMug1 diagnostic-first target entry point for Felucca/JieLi FM-1 builds.
 */
#include "fm1_felucca_target.h"
#include "fm1_platform.h"
#include "fm_diag.h"
#include "fm_app.h"
#include <string.h>

#ifndef FMM_TARGET_DIAGNOSTIC
#define FMM_TARGET_DIAGNOSTIC 1
#endif

#if !FMM_TARGET_DIAGNOSTIC && !defined(FMM_BUTTON_MAP_VERIFIED)
#error "Normal synth target requires FMM_BUTTON_MAP_VERIFIED after real-device diagnostics"
#endif

#if FMM_TARGET_DIAGNOSTIC
static void run_diagnostic(void) {
  fm1_input_frame_t input;
  uint32_t last = 0u;
  fm1_platform_init();

  for (;;) {
    memset(&input, 0, sizeof(input));
    fm1_platform_poll_input(&input);
    const uint32_t now = fm1_platform_millis();
    if ((uint32_t)(now - last) >= 16u) {
      last = now;
      fm_diag_render_input(&input);
    }
  }
}
#else
static fm_app_t app;

static void render_audio_irq(fm1_audio_block_t *block, void *user) {
  fm_app_render_audio((fm_app_t *)user, block);
}

static void run_synth(void) {
  fm_app_init(&app, fmm_felucca_sample_rate());
  fm1_felucca_set_audio_renderer(render_audio_irq, &app);
  fm1_felucca_audio_start();

  for (;;) fm_app_tick(&app, "INIT CLASSIC");
}
#endif

int main(void) {
#if FMM_TARGET_DIAGNOSTIC
  run_diagnostic();
#else
  run_synth();
#endif
  return 0;
}
