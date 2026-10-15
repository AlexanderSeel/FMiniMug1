#include "fm_ui.h"
#include <stdio.h>
#include <string.h>

#define COL_BG 0x1082u
#define COL_PANEL 0x2945u
#define COL_TEXT 0xFFFFu
#define COL_DIM 0xBDF7u
#define COL_ACCENT 0xFBE0u
#define COL_RED 0xF800u

static float clampf(float x, float lo, float hi) {
  return x < lo ? lo : (x > hi ? hi : x);
}

static int pressed(const fm1_input_frame_t *in, fm1_button_t b) {
  return (in->button_pressed & (1u << (unsigned)b)) != 0;
}

static int down(const fm1_input_frame_t *in, fm1_button_t b) {
  return (in->buttons & (1u << (unsigned)b)) != 0;
}

static void adjust_patch(fm_ui_state_t *ui, fm_patch_t *p, int enc, int delta) {
  if (delta == 0 || enc < 0 || enc > 3) return;
  const float fine = ui->hold ? 0.2f : 1.0f;

  switch (ui->page) {
    case FM_UI_OSC:
      if (enc < 3) p->osc[enc].level = clampf(p->osc[enc].level + delta * 0.015f * fine, 0.0f, 1.0f);
      else p->glide_s = clampf(p->glide_s + delta * 0.005f * fine, 0.0f, 2.0f);
      break;
    case FM_UI_MIX:
      if (enc == 0) p->mixer_drive = clampf(p->mixer_drive + delta * 0.04f * fine, 0.5f, 4.0f);
      if (enc == 1) p->feedback = clampf(p->feedback + delta * 0.02f * fine, 0.0f, 1.0f);
      if (enc == 2) p->osc[1].fine_cents = clampf(p->osc[1].fine_cents + delta * 1.0f * fine, -100.0f, 100.0f);
      if (enc == 3) p->osc[2].fine_cents = clampf(p->osc[2].fine_cents + delta * 1.0f * fine, -100.0f, 100.0f);
      break;
    case FM_UI_FILTER:
      if (enc == 0) p->cutoff_hz = clampf(p->cutoff_hz + delta * 35.0f * fine, 20.0f, 18000.0f);
      if (enc == 1) p->resonance = clampf(p->resonance + delta * 0.015f * fine, 0.0f, 1.0f);
      if (enc == 2) p->filter_env_amount = clampf(p->filter_env_amount + delta * 35.0f * fine, -8000.0f, 12000.0f);
      if (enc == 3) p->filter_drive = clampf(p->filter_drive + delta * 0.04f * fine, 0.5f, 4.0f);
      break;
    case FM_UI_CONTOUR:
      if (enc == 0) p->attack_s = clampf(p->attack_s + delta * 0.01f * fine, 0.001f, 10.0f);
      if (enc == 1) p->decay_s = clampf(p->decay_s + delta * 0.015f * fine, 0.005f, 10.0f);
      if (enc == 2) p->sustain = clampf(p->sustain + delta * 0.015f * fine, 0.0f, 1.0f);
      if (enc == 3) p->release_s = clampf(p->release_s + delta * 0.015f * fine, 0.005f, 10.0f);
      break;
    case FM_UI_MOD:
      if (enc == 0) p->drift = clampf(p->drift + delta * 0.015f * fine, 0.0f, 1.0f);
      if (enc == 1) {
        int v = (int)p->filter_keytrack + (delta > 0 ? 1 : -1);
        if (v < 0) v = 0;
        if (v > 3) v = 3;
        p->filter_keytrack = (uint8_t)v;
      }
      if (enc == 2 && delta != 0) p->osc[2].low_mode = (uint8_t)!p->osc[2].low_mode;
      if (enc == 3 && delta != 0) p->osc[2].keyboard_track = (uint8_t)!p->osc[2].keyboard_track;
      break;
    case FM_UI_SEQ:
      if (enc == 0) {
        int bpm = (int)ui->tempo_bpm + delta;
        if (bpm < 40) bpm = 40;
        if (bpm > 300) bpm = 300;
        ui->tempo_bpm = (uint16_t)bpm;
      }
      if (enc == 1) ui->pattern_index = (uint8_t)(ui->pattern_index + delta);
      if (enc == 2) ui->preset_index = (uint8_t)(ui->preset_index + delta);
      break;
    default:
      break;
  }
}

static const char *page_name(fm_ui_page_t page) {
  static const char *names[] = {"OSC", "MIX", "FILTER", "CONTOUR", "MOD", "SEQ/PERF"};
  return names[(unsigned)page < FM_UI_PAGE_COUNT ? page : 0];
}

static void draw_value(int x, int y, const char *label, const char *value, int focused) {
  const uint16_t border = focused ? COL_ACCENT : COL_PANEL;
  fm1_platform_lcd_rect(x, y, 50, 58, border);
  fm1_platform_lcd_text(x + 4, y + 5, label, COL_DIM);
  fm1_platform_lcd_text(x + 4, y + 30, value, focused ? COL_ACCENT : COL_TEXT);
}

static void draw_filter_graph(const fm_patch_t *p) {
  const int x0 = 9, y0 = 151, w = 222, h = 30;
  float cut = clampf(p->cutoff_hz / 12000.0f, 0.03f, 0.96f);
  float res = clampf(p->resonance, 0.0f, 1.0f);
  fm1_platform_lcd_rect(x0, y0, w, 1, COL_PANEL);
  fm1_platform_lcd_rect(x0, y0 + h, w, 1, COL_PANEL);
  for (int i = 0; i < 74; ++i) {
    float x = (float)i / 73.0f;
    float amp;
    if (x <= cut) amp = 0.72f;
    else {
      float t = (x - cut) / (1.0f - cut);
      amp = 0.72f * (1.0f - t);
      amp *= (1.0f - 0.65f * t);
    }
    float d = x - cut;
    if (d < 0.0f) d = -d;
    if (d < 0.075f) amp += res * (1.0f - d / 0.075f) * 0.42f;
    amp = clampf(amp, 0.02f, 1.0f);
    int px = x0 + i * 3;
    int py = y0 + h - 2 - (int)(amp * (float)(h - 4));
    fm1_platform_lcd_rect(px, py, 2, 2, res > 0.72f ? COL_RED : COL_ACCENT);
  }
  fm1_platform_lcd_text(10, 184, "FILTER RESPONSE", COL_DIM);
}

static void draw_contour_graph(const fm_patch_t *p) {
  const int x0 = 9, y0 = 151, w = 222, h = 30;
  float total = p->attack_s + p->decay_s + p->release_s + 0.35f;
  if (total < 0.05f) total = 0.05f;
  float a = clampf(p->attack_s / total, 0.04f, 0.38f);
  float d = clampf(p->decay_s / total, 0.06f, 0.38f);
  float r = clampf(p->release_s / total, 0.06f, 0.38f);
  float sustain = clampf(p->sustain, 0.0f, 1.0f);
  float sustain_start = a + d;
  float release_start = 1.0f - r;
  if (release_start < sustain_start + 0.08f) release_start = sustain_start + 0.08f;
  if (release_start > 0.92f) release_start = 0.92f;

  fm1_platform_lcd_rect(x0, y0 + h, w, 1, COL_PANEL);
  for (int i = 0; i < 74; ++i) {
    float x = (float)i / 73.0f;
    float level;
    if (x < a) level = x / a;
    else if (x < sustain_start) {
      float t = (x - a) / d;
      level = 1.0f + (sustain - 1.0f) * t;
    } else if (x < release_start) level = sustain;
    else {
      float t = (x - release_start) / (1.0f - release_start);
      level = sustain * (1.0f - t);
    }
    int px = x0 + i * 3;
    int py = y0 + h - 2 - (int)(clampf(level, 0.0f, 1.0f) * (float)(h - 4));
    fm1_platform_lcd_rect(px, py, 2, 2, COL_ACCENT);
  }
  fm1_platform_lcd_text(10, 184, "A       D       S       R", COL_DIM);
}

void fm_ui_init(fm_ui_state_t *ui) {
  memset(ui, 0, sizeof(*ui));
  ui->page = FM_UI_OSC;
  ui->focus_encoder = -1;
  ui->tempo_bpm = 120;
}

void fm_ui_handle_input(fm_ui_state_t *ui, fm_patch_t *patch, const fm1_input_frame_t *input) {
  ui->hold = (uint8_t)down(input, FM1_KEY_HOLD);

  if (pressed(input, FM1_KEY_PAGE_LEFT)) {
    ui->page = (fm_ui_page_t)((ui->page + FM_UI_PAGE_COUNT - 1) % FM_UI_PAGE_COUNT);
    ui->focus_encoder = -1;
  }
  if (pressed(input, FM1_KEY_PAGE_RIGHT)) {
    ui->page = (fm_ui_page_t)((ui->page + 1) % FM_UI_PAGE_COUNT);
    ui->focus_encoder = -1;
  }
  if (pressed(input, FM1_KEY_PLAY)) ui->playing = (uint8_t)!ui->playing;
  if (pressed(input, FM1_KEY_PRESET)) ++ui->preset_index;
  if (pressed(input, FM1_KEY_PATTERN)) ++ui->pattern_index;

  for (int i = 0; i < 4; ++i) {
    if (pressed(input, (fm1_button_t)(FM1_KEY_ENCODER_1 + i))) {
      ui->focus_encoder = ui->focus_encoder == i ? -1 : (int8_t)i;
    }
    adjust_patch(ui, patch, i, input->encoder_delta[i]);
  }
}

void fm_ui_render(const fm_ui_state_t *ui, const fm_patch_t *p, const char *preset_name) {
  char value[4][24];
  const char *label[4] = {"", "", "", ""};

  switch (ui->page) {
    case FM_UI_OSC:
      label[0] = "OSC 1"; label[1] = "OSC 2"; label[2] = "OSC 3"; label[3] = "GLIDE";
      snprintf(value[0], sizeof(value[0]), "%d%%", (int)(p->osc[0].level * 100));
      snprintf(value[1], sizeof(value[1]), "%d%%", (int)(p->osc[1].level * 100));
      snprintf(value[2], sizeof(value[2]), "%d%%", (int)(p->osc[2].level * 100));
      snprintf(value[3], sizeof(value[3]), "%.2fs", p->glide_s);
      break;
    case FM_UI_MIX:
      label[0] = "DRIVE"; label[1] = "FEEDBACK"; label[2] = "OSC2 FINE"; label[3] = "OSC3 FINE";
      snprintf(value[0], sizeof(value[0]), "%.2fx", p->mixer_drive);
      snprintf(value[1], sizeof(value[1]), "%d%%", (int)(p->feedback * 100));
      snprintf(value[2], sizeof(value[2]), "%+.0fc", p->osc[1].fine_cents);
      snprintf(value[3], sizeof(value[3]), "%+.0fc", p->osc[2].fine_cents);
      break;
    case FM_UI_FILTER:
      label[0] = "CUTOFF"; label[1] = "EMPHASIS"; label[2] = "CONTOUR"; label[3] = "DRIVE";
      snprintf(value[0], sizeof(value[0]), "%.0fHz", p->cutoff_hz);
      snprintf(value[1], sizeof(value[1]), "%d%%", (int)(p->resonance * 100));
      snprintf(value[2], sizeof(value[2]), "%+.0f", p->filter_env_amount);
      snprintf(value[3], sizeof(value[3]), "%.2fx", p->filter_drive);
      break;
    case FM_UI_CONTOUR:
      label[0] = "ATTACK"; label[1] = "DECAY"; label[2] = "SUSTAIN"; label[3] = "RELEASE";
      snprintf(value[0], sizeof(value[0]), "%.2fs", p->attack_s);
      snprintf(value[1], sizeof(value[1]), "%.2fs", p->decay_s);
      snprintf(value[2], sizeof(value[2]), "%d%%", (int)(p->sustain * 100));
      snprintf(value[3], sizeof(value[3]), "%.2fs", p->release_s);
      break;
    case FM_UI_MOD:
      label[0] = "DRIFT"; label[1] = "KEY TRACK"; label[2] = "OSC3 LO"; label[3] = "OSC3 KBD";
      snprintf(value[0], sizeof(value[0]), "%d%%", (int)(p->drift * 100));
      snprintf(value[1], sizeof(value[1]), "%s", p->filter_keytrack == 0 ? "OFF" : p->filter_keytrack == 1 ? "1/3" : p->filter_keytrack == 2 ? "2/3" : "FULL");
      snprintf(value[2], sizeof(value[2]), "%s", p->osc[2].low_mode ? "ON" : "OFF");
      snprintf(value[3], sizeof(value[3]), "%s", p->osc[2].keyboard_track ? "ON" : "OFF");
      break;
    case FM_UI_SEQ:
    default:
      label[0] = "TEMPO"; label[1] = "PATTERN"; label[2] = "PRESET"; label[3] = "TRANSPORT";
      snprintf(value[0], sizeof(value[0]), "%u BPM", ui->tempo_bpm);
      snprintf(value[1], sizeof(value[1]), "%02u", ui->pattern_index + 1u);
      snprintf(value[2], sizeof(value[2]), "%02u", ui->preset_index + 1u);
      snprintf(value[3], sizeof(value[3]), "%s", ui->playing ? "PLAY" : "STOP");
      break;
  }

  fm1_platform_lcd_begin();
  fm1_platform_lcd_fill(COL_BG);
  fm1_platform_lcd_text(8, 7, "FMiniMug1", COL_ACCENT);
  fm1_platform_lcd_text(147, 7, page_name(ui->page), COL_TEXT);
  fm1_platform_lcd_text(8, 28, preset_name ? preset_name : "INIT", COL_TEXT);
  fm1_platform_lcd_rect(8, 47, 224, 2, COL_PANEL);

  if (ui->focus_encoder >= 0 && ui->focus_encoder < 4) {
    const int i = ui->focus_encoder;
    fm1_platform_lcd_text(16, 72, label[i], COL_DIM);
    fm1_platform_lcd_text(16, 112, value[i], COL_ACCENT);
    fm1_platform_lcd_text(16, 172, ui->hold ? "HOLD: FINE" : "PRESS KNOB: BACK", COL_TEXT);
  } else {
    for (int i = 0; i < 4; ++i) draw_value(8 + i * 56, 66, label[i], value[i], 0);
    fm1_platform_lcd_text(8, 136, "ENC1      ENC2      ENC3      ENC4", COL_DIM);
    if (ui->page == FM_UI_FILTER) draw_filter_graph(p);
    else if (ui->page == FM_UI_CONTOUR) draw_contour_graph(p);
    else fm1_platform_lcd_text(8, 180, ui->hold ? "HOLD / FINE" : "PRESS ENCODER = FOCUS", COL_TEXT);
  }

  if (ui->playing) fm1_platform_lcd_rect(215, 8, 16, 8, COL_RED);
  fm1_platform_lcd_present();
}
