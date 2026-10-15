#include "fm_app.h"
#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

static int init_count;
static int present_count;

void fm1_platform_init(void) { ++init_count; }
uint32_t fm1_platform_millis(void) { return 100; }
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

static uint32_t button_bit(fm1_button_t b) { return 1u << (unsigned)b; }

int main(void) {
  fm_app_t app;
  fm1_input_frame_t input;
  int32_t samples[128 * 2];
  fm1_audio_block_t block = {samples, 128};

  fm_app_init(&app, 48000.0f);
  assert(init_count == 1);
  assert(app.voice.patch.note_priority == FM_NOTE_LOW);

  /* Physical key 0 is F3 / MIDI 53. */
  memset(&input, 0, sizeof(input));
  input.note_pressed = 1u;
  fm_app_handle_input(&app, &input);
  assert(app.voice.current_note == 53u);
  assert(app.voice.gate > 0.0f);

  /* Change octave while held: release must still target the original MIDI 53. */
  memset(&input, 0, sizeof(input));
  input.button_pressed = button_bit(FM1_KEY_OCT_UP);
  fm_app_handle_input(&app, &input);
  assert(app.octave_shift == 1);
  memset(&input, 0, sizeof(input));
  input.note_released = 1u;
  fm_app_handle_input(&app, &input);
  assert(app.voice.gate == 0.0f);

  /* Next press uses the new octave. */
  memset(&input, 0, sizeof(input));
  input.note_pressed = 1u;
  fm_app_handle_input(&app, &input);
  assert(app.voice.current_note == 65u);

  /* Install a one-step sequence and PLAY transfers ownership to it. */
  fm_seq_pattern_t pattern;
  memset(&pattern, 0, sizeof(pattern));
  pattern.length = 1u;
  pattern.bpm = 120u;
  pattern.steps[0].note = 72;
  pattern.steps[0].velocity = 110u;
  pattern.steps[0].gate_percent = 50u;
  fm_app_set_sequence(&app, &pattern);

  memset(&input, 0, sizeof(input));
  input.button_pressed = button_bit(FM1_KEY_PLAY);
  fm_app_handle_input(&app, &input);
  assert(app.ui.playing == 1u);
  assert(app.sequencer.playing == 1u);
  assert(app.key_down == 0u);

  memset(samples, 0, sizeof(samples));
  fm_app_render_audio(&app, &block);
  assert(app.voice.current_note == 72u);
  int nonzero = 0;
  for (size_t i = 0; i < sizeof(samples) / sizeof(samples[0]); i += 2u) {
    assert(samples[i] == samples[i + 1u]);
    if (samples[i] != 0) nonzero = 1;
  }
  assert(nonzero);

  /* PLAY again stops transport and clears the mono voice. */
  memset(&input, 0, sizeof(input));
  input.button_pressed = button_bit(FM1_KEY_PLAY);
  fm_app_handle_input(&app, &input);
  assert(app.ui.playing == 0u);
  assert(app.sequencer.playing == 0u);
  assert(app.voice.gate == 0.0f);

  /* Main-loop tick also drives the throttled UI through the platform boundary. */
  fm_app_tick(&app, "TEST");
  assert(present_count == 1);

  printf("FMiniMug1 application runtime tests passed\n");
  return 0;
}
