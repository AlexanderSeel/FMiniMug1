#pragma once
#include <stddef.h>
#include <stdint.h>

/*
 * FMiniMug1 platform boundary.
 *
 * The synth/application code talks only to this interface. The real FM-1
 * implementation may be backed by the GPL Felucca HAL; host/WASM builds use
 * test doubles. Keeping hardware register access out of the synth engine makes
 * the same UI/state machine testable without a device.
 */

typedef enum {
  FM1_KEY_OCT_DOWN = 0,
  FM1_KEY_OCT_UP,
  FM1_KEY_PAGE_LEFT,
  FM1_KEY_PAGE_RIGHT,
  FM1_KEY_PRESET,
  FM1_KEY_PATTERN,
  FM1_KEY_PLAY,
  FM1_KEY_HOLD,
  FM1_KEY_ENCODER_1,
  FM1_KEY_ENCODER_2,
  FM1_KEY_ENCODER_3,
  FM1_KEY_ENCODER_4
} fm1_button_t;

typedef struct {
  uint32_t notes;          /* bit 0..26: FM-1 note keys */
  uint32_t note_pressed;
  uint32_t note_released;
  uint32_t buttons;
  uint32_t button_pressed;
  uint32_t button_released;
  int16_t encoder_delta[7];
} fm1_input_frame_t;

typedef struct {
  int32_t *samples;         /* interleaved stereo, 24-bit left-justified */
  uint32_t frames;
} fm1_audio_block_t;

void fm1_platform_init(void);
uint32_t fm1_platform_millis(void);
void fm1_platform_poll_input(fm1_input_frame_t *frame);
int fm1_platform_audio_acquire(fm1_audio_block_t *block);
void fm1_platform_audio_submit(const fm1_audio_block_t *block);
void fm1_platform_lcd_begin(void);
void fm1_platform_lcd_fill(uint16_t rgb565);
void fm1_platform_lcd_rect(int x, int y, int w, int h, uint16_t rgb565);
void fm1_platform_lcd_text(int x, int y, const char *text, uint16_t rgb565);
void fm1_platform_lcd_present(void);
void fm1_platform_led_note(uint8_t note_index, uint8_t level);
void fm1_platform_led_button(uint8_t button_index, uint8_t level);
int fm1_platform_flash_read(uint32_t address, void *dst, size_t size);
int fm1_platform_flash_write(uint32_t address, const void *src, size_t size);
void fm1_platform_midi_send(const uint8_t *data, size_t size);
