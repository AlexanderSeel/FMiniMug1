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
#ifndef FMM_TARGET_AUDIO_DIAGNOSTIC
#define FMM_TARGET_AUDIO_DIAGNOSTIC 0
#endif

#if FMM_TARGET_DIAGNOSTIC && FMM_TARGET_AUDIO_DIAGNOSTIC
#error "Select raw-input diagnostic or audio diagnostic, not both"
#endif
#if !FMM_TARGET_DIAGNOSTIC && !FMM_TARGET_AUDIO_DIAGNOSTIC && !defined(FMM_BUTTON_MAP_VERIFIED)
#error "Normal synth target requires FMM_BUTTON_MAP_VERIFIED after real-device diagnostics"
#endif

static void u32_text(char *dst, unsigned size, uint32_t value) {
  char tmp[11];
  unsigned n = 0u;
  if (!size) return;
  do { tmp[n++] = (char)('0' + value % 10u); value /= 10u; } while (value && n < sizeof(tmp));
  unsigned p = 0u;
  while (n && p + 1u < size) dst[p++] = tmp[--n];
  dst[p] = 0;
}

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

#if FMM_TARGET_AUDIO_DIAGNOSTIC
static void render_audio_budget_screen(uint8_t oversample, const fm1_felucca_audio_stats_t *stats) {
  char value[12];
  uint32_t shown = stats->max_ticks;
  if (shown > FMM_AUDIO_HALF_BUDGET_TICKS * 2u) shown = FMM_AUDIO_HALF_BUDGET_TICKS * 2u;
  const int width = (int)((shown * 220u) / (FMM_AUDIO_HALF_BUDGET_TICKS * 2u));
  const uint16_t ok = 0x07E0u;
  const uint16_t warn = 0xF800u;
  const uint16_t accent = 0xFBE0u;

  fm1_platform_lcd_begin();
  fm1_platform_lcd_fill(0x0000u);
  fm1_platform_lcd_text(8, 8, "FMiniMug1 AUDIO BUDGET", accent);
  fm1_platform_lcd_text(8, 30, oversample ? "MODE: 2X OVERSAMPLE" : "MODE: 1X OVERSAMPLE", 0xFFFFu);
  fm1_platform_lcd_text(8, 54, "128 FRAMES = 69632 TICKS", 0x8410u);

  fm1_platform_lcd_text(8, 82, "LAST", 0xFFFFu);
  u32_text(value, sizeof(value), stats->last_ticks);
  fm1_platform_lcd_text(74, 82, value, 0xFFFFu);
  fm1_platform_lcd_text(8, 104, "MAX", 0xFFFFu);
  u32_text(value, sizeof(value), stats->max_ticks);
  fm1_platform_lcd_text(74, 104, value, stats->max_ticks > FMM_AUDIO_HALF_BUDGET_TICKS ? warn : ok);
  fm1_platform_lcd_text(8, 126, "OVER", 0xFFFFu);
  u32_text(value, sizeof(value), stats->over_budget_count);
  fm1_platform_lcd_text(74, 126, value, stats->over_budget_count ? warn : ok);
  fm1_platform_lcd_text(8, 148, "IRQS", 0xFFFFu);
  u32_text(value, sizeof(value), stats->irq_count);
  fm1_platform_lcd_text(74, 148, value, 0xFFFFu);

  fm1_platform_lcd_rect(8, 178, 220, 12, 0x2104u);
  if (width > 0) fm1_platform_lcd_rect(8, 178, width, 12, stats->max_ticks > FMM_AUDIO_HALF_BUDGET_TICKS ? warn : ok);
  fm1_platform_lcd_rect(118, 174, 2, 20, accent); /* 100% DMA budget marker */
  fm1_platform_lcd_text(8, 204, "AUTO SWITCH 1X/2X EACH 5S", 0x8410u);
  fm1_platform_lcd_text(8, 220, "OVER MUST STAY 0", stats->over_budget_count ? warn : ok);
  fm1_platform_lcd_present();
}

static void run_audio_diagnostic(void) {
  uint8_t oversample = 0u;
  uint32_t mode_started;
  uint32_t last_screen = 0u;
  fm1_felucca_audio_stats_t stats;

  fm_app_init(&app, fmm_felucca_sample_rate());
  app.voice.patch.oversample_2x = oversample;
  app.voice.patch.cutoff_hz = 2200.0f;
  app.voice.patch.resonance = 0.72f;
  app.voice.patch.filter_env_amount = 2600.0f;
  app.voice.patch.mixer_drive = 1.8f;
  app.voice.patch.filter_drive = 1.35f;
  app.voice.patch.osc[0].level = 0.8f;
  app.voice.patch.osc[1].level = 0.55f;
  app.voice.patch.osc[2].level = 0.35f;
  fm_voice_note_on(&app.voice, 45u, 112u);

  fm1_felucca_set_audio_renderer(render_audio_irq, &app);
  fm1_felucca_audio_start();
  mode_started = fm1_platform_millis();

  for (;;) {
    const uint32_t now = fm1_platform_millis();
    if ((uint32_t)(now - mode_started) >= 5000u) {
      oversample = (uint8_t)!oversample;
      app.voice.patch.oversample_2x = oversample;
      fm1_felucca_audio_stats_reset();
      mode_started = now;
    }
    if ((uint32_t)(now - last_screen) >= 100u) {
      last_screen = now;
      fm1_felucca_audio_stats_get(&stats);
      render_audio_budget_screen(oversample, &stats);
    }
  }
}
#else
static void run_synth(void) {
  fm_app_init(&app, fmm_felucca_sample_rate());
  fm1_felucca_set_audio_renderer(render_audio_irq, &app);
  fm1_felucca_audio_start();
  for (;;) fm_app_tick(&app, "INIT CLASSIC");
}
#endif
#endif

int main(void) {
#if FMM_TARGET_DIAGNOSTIC
  run_diagnostic();
#elif FMM_TARGET_AUDIO_DIAGNOSTIC
  run_audio_diagnostic();
#else
  run_synth();
#endif
  return 0;
}
