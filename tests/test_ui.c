#include "fm_ui.h"
#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

static int present_count;

void fm1_platform_init(void) {}
uint32_t fm1_platform_millis(void) { return 0; }
void fm1_platform_poll_input(fm1_input_frame_t *frame) { memset(frame, 0, sizeof(*frame)); }
int fm1_platform_audio_acquire(fm1_audio_block_t *block) { (void)block; return 0; }
void fm1_platform_audio_submit(const fm1_audio_block_t *block) { (void)block; }
void fm1_platform_lcd_begin(void) {}
void fm1_platform_lcd_fill(uint16_t rgb565) { (void)rgb565; }
void fm1_platform_lcd_rect(int x, int y, int w, int h, uint16_t rgb565) { (void)x; (void)y; (void)w; (void)h; (void)rgb565; }
void fm1_platform_lcd_text(int x, int y, const char *text, uint16_t rgb565) { (void)x; (void)y; (void)text; (void)rgb565; }
void fm1_platform_lcd_present(void) { ++present_count; }
void fm1_platform_led_note(uint8_t note_index, uint8_t level) { (void)note_index; (void)level; }
void fm1_platform_led_button(uint8_t button_index, uint8_t level) { (void)button_index; (void)level; }
int fm1_platform_flash_read(uint32_t address, void *dst, size_t size) { (void)address; (void)dst; (void)size; return -1; }
int fm1_platform_flash_write(uint32_t address, const void *src, size_t size) { (void)address; (void)src; (void)size; return -1; }
void fm1_platform_midi_send(const uint8_t *data, size_t size) { (void)data; (void)size; }

static uint32_t bit(fm1_button_t b) { return 1u << (unsigned)b; }

int main(void) {
  fm_ui_state_t ui;
  fm_patch_t patch;
  fm_voice_t voice;
  fm1_input_frame_t input;

  fm_voice_init(&voice, 48000.0f);
  patch = voice.patch;
  fm_ui_init(&ui);
  assert(ui.page == FM_UI_OSC);
  assert(ui.focus_encoder == -1);

  memset(&input, 0, sizeof(input));
  input.encoder_delta[0] = 2;
  fm_ui_handle_input(&ui, &patch, &input);
  assert(patch.osc[0].level > voice.patch.osc[0].level);

  /* HOLD on OSC switches encoder 1..3 to classic range selectors. */
  const uint8_t range_before = patch.osc[0].range;
  memset(&input, 0, sizeof(input));
  input.buttons = bit(FM1_KEY_HOLD);
  input.encoder_delta[0] = 1;
  fm_ui_handle_input(&ui, &patch, &input);
  assert(patch.osc[0].range == range_before + 1u);

  memset(&input, 0, sizeof(input));
  input.button_pressed = bit(FM1_KEY_PAGE_RIGHT);
  fm_ui_handle_input(&ui, &patch, &input);
  assert(ui.page == FM_UI_MIX);

  memset(&input, 0, sizeof(input));
  input.button_pressed = bit(FM1_KEY_ENCODER_1);
  fm_ui_handle_input(&ui, &patch, &input);
  assert(ui.focus_encoder == 0);

  memset(&input, 0, sizeof(input));
  input.button_pressed = bit(FM1_KEY_PAGE_RIGHT);
  fm_ui_handle_input(&ui, &patch, &input);
  assert(ui.page == FM_UI_FILTER);
  assert(ui.focus_encoder == -1);

  const float before = patch.cutoff_hz;
  memset(&input, 0, sizeof(input));
  input.buttons = bit(FM1_KEY_HOLD);
  input.encoder_delta[0] = 1;
  fm_ui_handle_input(&ui, &patch, &input);
  assert(ui.hold == 1);
  assert(patch.cutoff_hz > before);
  assert(patch.cutoff_hz - before < 10.0f);

  /* CONTOUR normal edits loudness; HOLD edits filter contour independently. */
  memset(&input, 0, sizeof(input));
  input.button_pressed = bit(FM1_KEY_PAGE_RIGHT);
  fm_ui_handle_input(&ui, &patch, &input);
  assert(ui.page == FM_UI_CONTOUR);
  const float amp_attack = patch.attack_s;
  const float filter_attack = patch.filter_attack_s;
  memset(&input, 0, sizeof(input));
  input.buttons = bit(FM1_KEY_HOLD);
  input.encoder_delta[0] = 1;
  fm_ui_handle_input(&ui, &patch, &input);
  assert(patch.attack_s == amp_attack);
  assert(patch.filter_attack_s > filter_attack);

  fm_ui_render(&ui, &patch, "TEST PATCH");
  assert(present_count == 1);

  printf("FMiniMug1 UI tests passed\n");
  return 0;
}
