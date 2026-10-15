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
#ifndef FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC
#define FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC 0
#endif

#if (FMM_TARGET_DIAGNOSTIC + FMM_TARGET_AUDIO_DIAGNOSTIC + FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC) > 1
#error "Select only one target diagnostic mode"
#endif
#if !FMM_TARGET_DIAGNOSTIC && !FMM_TARGET_AUDIO_DIAGNOSTIC && !FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC && !defined(FMM_BUTTON_MAP_VERIFIED)
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

#if FMM_TARGET_AUDIO_DIAGNOSTIC || FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC
static void u32_text(char *dst, unsigned size, uint32_t value) {
  char tmp[11];
  unsigned n = 0u;
  if (!size) return;
  do { tmp[n++] = (char)('0' + value % 10u); value /= 10u; } while (value && n < sizeof(tmp));
  unsigned p = 0u;
  while (n && p + 1u < size) dst[p++] = tmp[--n];
  dst[p] = 0;
}

static void render_audio_budget_screen(const char *mode, const char *detail, const fm1_felucca_audio_stats_t *stats) {
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
  fm1_platform_lcd_text(8, 30, mode, 0xFFFFu);
  fm1_platform_lcd_text(8, 48, detail, 0x8410u);
  fm1_platform_lcd_text(8, 64, "128 FRAMES = 69632 TICKS", 0x8410u);

  fm1_platform_lcd_text(8, 90, "LAST", 0xFFFFu);
  u32_text(value, sizeof(value), stats->last_ticks);
  fm1_platform_lcd_text(74, 90, value, 0xFFFFu);
  fm1_platform_lcd_text(8, 112, "MAX", 0xFFFFu);
  u32_text(value, sizeof(value), stats->max_ticks);
  fm1_platform_lcd_text(74, 112, value, stats->max_ticks > FMM_AUDIO_HALF_BUDGET_TICKS ? warn : ok);
  fm1_platform_lcd_text(8, 134, "OVER", 0xFFFFu);
  u32_text(value, sizeof(value), stats->over_budget_count);
  fm1_platform_lcd_text(74, 134, value, stats->over_budget_count ? warn : ok);
  fm1_platform_lcd_text(8, 156, "IRQS", 0xFFFFu);
  u32_text(value, sizeof(value), stats->irq_count);
  fm1_platform_lcd_text(74, 156, value, 0xFFFFu);

  fm1_platform_lcd_rect(8, 184, 220, 12, 0x2104u);
  if (width > 0) fm1_platform_lcd_rect(8, 184, width, 12, stats->max_ticks > FMM_AUDIO_HALF_BUDGET_TICKS ? warn : ok);
  fm1_platform_lcd_rect(118, 180, 2, 20, accent);
  fm1_platform_lcd_text(8, 212, "OVER MUST STAY 0", stats->over_budget_count ? warn : ok);
  fm1_platform_lcd_present();
}
#endif

#if FMM_TARGET_AUDIO_DIAGNOSTIC
static void run_audio_diagnostic(void) {
  uint8_t oversample = 0u;
  uint32_t mode_started;
  uint32_t last_screen = 0u;
  fm1_felucca_audio_stats_t stats;

  fm_app_init(&app, fmm_felucca_sample_rate());
  app.studio.layer_enabled = 0u;
  app.studio.drums_enabled = 0u;
  app.studio.delay_mix = 0.0f;
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
      render_audio_budget_screen(oversample ? "MODE: CORE 2X" : "MODE: CORE 1X", "SINGLE VOICE BASELINE", &stats);
    }
  }
}
#endif

#if FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC
static void build_studio_stress_pattern(fm_seq_pattern_t *pattern) {
  static const int8_t notes[16] = {36, 36, 43, 48, 36, 39, 43, 46, 36, 48, 43, 39, 34, 36, 43, 48};
  memset(pattern, 0, sizeof(*pattern));
  pattern->length = 16u;
  pattern->bpm = 126u;
  pattern->swing = 18u;
  for (uint8_t i = 0u; i < 16u; ++i) {
    pattern->steps[i].note = notes[i];
    pattern->steps[i].velocity = (uint8_t)((i & 3u) == 0u ? 124u : 104u);
    pattern->steps[i].gate_percent = (uint8_t)((i & 1u) ? 72u : 46u);
    pattern->steps[i].flags = (uint8_t)((i & 3u) == 0u ? FM_SEQ_FLAG_ACCENT : 0u);
  }
}

static void run_studio_audio_diagnostic(void) {
  fm1_felucca_audio_stats_t stats;
  fm_seq_pattern_t pattern;
  uint32_t last_screen = 0u;

  fm_app_init(&app, fmm_felucca_sample_rate());
  build_studio_stress_pattern(&pattern);
  app.voice.patch.oversample_2x = 1u;
  app.voice.patch.cutoff_hz = 1450.0f;
  app.voice.patch.resonance = 0.58f;
  app.voice.patch.mixer_drive = 1.9f;
  app.voice.patch.filter_drive = 1.35f;
  app.studio.layer_enabled = 1u;
  app.studio.drums_enabled = 1u;
  app.studio.layer_level = 0.38f;
  app.studio.drum_level = 0.34f;
  app.studio.delay_mix = 0.18f;
  app.studio.delay_feedback = 0.42f;
  app.studio.drive = 1.2f;
  app.studio.voice_b.patch.oversample_2x = 0u;
  app.studio.voice_b.patch.cutoff_hz = 2200.0f;
  app.studio.voice_b.patch.resonance = 0.34f;
  fm_voice_set_patch(&app.studio.voice_b, &app.studio.voice_b.patch);
  fm_voice_note_on(&app.studio.voice_b, 55u, 102u);
  fm_app_set_sequence(&app, &pattern);
  app.ui.playing = 1u;
  app.last_playing = 1u;
  fm_seq_start(&app.sequencer);

  fm1_felucca_set_audio_renderer(render_audio_irq, &app);
  fm1_felucca_audio_stats_reset();
  fm1_felucca_audio_start();

  for (;;) {
    const uint32_t now = fm1_platform_millis();
    if ((uint32_t)(now - last_screen) >= 100u) {
      last_screen = now;
      fm1_felucca_audio_stats_get(&stats);
      render_audio_budget_screen("MODE: STUDIO STRESS", "A 2X + B 1X + DRUM + DLY", &stats);
    }
  }
}
#endif

#if !FMM_TARGET_AUDIO_DIAGNOSTIC && !FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC
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
#elif FMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC
  run_studio_audio_diagnostic();
#else
  run_synth();
#endif
  return 0;
}
