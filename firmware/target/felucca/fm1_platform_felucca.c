/* SPDX-License-Identifier: GPL-3.0-only
 * FMiniMug1 target adapter for the M-VAVE FM-1 using Felucca's FM-1 HAL.
 *
 * Build this file only inside a Felucca/JieLi target tree. It intentionally
 * keeps flash writes disabled and exposes raw button IDs during bring-up.
 */
#include "fm1_platform.h"
#include "fm1_felucca_target.h"
#include "fm1_audio.h"
#include "fm1_input.h"
#include "fm1_time.h"
#include <string.h>

#define FMM_TARGET_FS 44117.6470588f
#define FMM_AUDIO_HALF_FRAMES 128u
#define FMM_AUDIO_HALF_WORDS (FMM_AUDIO_HALF_FRAMES * 2u)

extern void isr_alnk0(void); /* Felucca hal/fm1_isr.S */

/* LCD bridge lives separately so low-level panel work cannot leak into the
 * portable platform contract. */
void fmm_felucca_lcd_init(void);
void fmm_felucca_lcd_begin(void);
void fmm_felucca_lcd_fill(uint16_t rgb565);
void fmm_felucca_lcd_rect(int x, int y, int w, int h, uint16_t rgb565);
void fmm_felucca_lcd_text(int x, int y, const char *text, uint16_t rgb565);
void fmm_felucca_lcd_present(void);

static int32_t audio_buffer[2u * FMM_AUDIO_HALF_WORDS] __attribute__((aligned(4)));
static fm1_felucca_audio_renderer_t audio_renderer;
static void *audio_renderer_user;
static uint32_t previous_notes;
static uint32_t previous_buttons;
static uint8_t audio_started;

void fm1_felucca_set_audio_renderer(fm1_felucca_audio_renderer_t renderer, void *user) {
  audio_renderer = renderer;
  audio_renderer_user = user;
}

void fm1_felucca_audio_start(void) {
  if (audio_started) return;
  memset(audio_buffer, 0, sizeof(audio_buffer));
  fm1_audio_init(audio_buffer, FMM_AUDIO_HALF_WORDS, isr_alnk0, 3u);
  audio_started = 1u;
}

void fm1_felucca_audio_stop(void) {
  if (!audio_started) return;
  fm1_audio_stop();
  audio_started = 0u;
}

void fm1_alnk0_irq(void) {
  const uint8_t pending = fm1_audio_pending();
  fm1_audio_ack_aux(pending);
  if (pending & FM1_AUDIO_HALF) {
    const uint32_t half = fm1_audio_free_half();
    fm1_audio_block_t block;
    block.samples = &audio_buffer[half * FMM_AUDIO_HALF_WORDS];
    block.frames = FMM_AUDIO_HALF_FRAMES;
    if (audio_renderer) audio_renderer(&block, audio_renderer_user);
    else memset(block.samples, 0, FMM_AUDIO_HALF_WORDS * sizeof(block.samples[0]));
    fm1_audio_ack_half();
  }
}

void fm1_platform_init(void) {
  fm1_time_init();
  fm1_input_init();
  fmm_felucca_lcd_init();
  previous_notes = fm1_in.notes;
  previous_buttons = fm1_in.buttons;
}

uint32_t fm1_platform_millis(void) {
  return fm1_micros() / 1000u;
}

void fm1_platform_poll_input(fm1_input_frame_t *frame) {
  uint32_t released_buttons = 0u;
  if (!frame) return;
  memset(frame, 0, sizeof(*frame));

  /* Polled full-frame scanning is the safest first bring-up mode. Once TIMER5
   * input scanning is integrated, this function can become a pure state read. */
  fm1_input_scan();

  frame->notes = fm1_in.notes;
  frame->note_pressed = fm1_input_note_edges();
  frame->note_released = previous_notes & ~frame->notes;
  previous_notes = frame->notes;

  frame->buttons = fm1_in.buttons;
  frame->button_pressed = fm1_input_edges(&released_buttons);
  frame->button_released = released_buttons;
  previous_buttons = frame->buttons;
  (void)previous_buttons;

  for (uint32_t i = 0; i < 7u; ++i) {
    int32_t delta = fm1_enc_take(i);
    if (delta < -32768) delta = -32768;
    if (delta > 32767) delta = 32767;
    frame->encoder_delta[i] = (int16_t)delta;
  }
}

/* Real target audio is IRQ-driven through fm1_alnk0_irq(). The portable main
 * loop therefore has no polling block to acquire on this adapter. */
int fm1_platform_audio_acquire(fm1_audio_block_t *block) {
  if (block) {
    block->samples = 0;
    block->frames = 0u;
  }
  return 0;
}

void fm1_platform_audio_submit(const fm1_audio_block_t *block) {
  (void)block;
}

void fm1_platform_lcd_begin(void) { fmm_felucca_lcd_begin(); }
void fm1_platform_lcd_fill(uint16_t rgb565) { fmm_felucca_lcd_fill(rgb565); }
void fm1_platform_lcd_rect(int x, int y, int w, int h, uint16_t rgb565) { fmm_felucca_lcd_rect(x, y, w, h, rgb565); }
void fm1_platform_lcd_text(int x, int y, const char *text, uint16_t rgb565) { fmm_felucca_lcd_text(x, y, text, rgb565); }
void fm1_platform_lcd_present(void) { fmm_felucca_lcd_present(); }

void fm1_platform_led_note(uint8_t note_index, uint8_t level) {
  if (note_index < 27u) fm1_led_key(14u + note_index, level != 0u);
}

void fm1_platform_led_button(uint8_t button_index, uint8_t level) {
  if (button_index < 14u) fm1_led_key(button_index, level != 0u);
}

int fm1_platform_flash_read(uint32_t address, void *dst, size_t size) {
  /* Deliberately unavailable in the first bring-up adapter. Read-only identity
   * support will be added only with explicit, bounded target flash helpers. */
  (void)address; (void)dst; (void)size;
  return -1;
}

int fm1_platform_flash_write(uint32_t address, const void *src, size_t size) {
  /* HARD SAFETY GATE: never erase/write from this bring-up adapter. */
  (void)address; (void)src; (void)size;
  return -1;
}

int fm1_felucca_flash_write_enabled(void) { return 0; }

void fm1_platform_midi_send(const uint8_t *data, size_t size) {
  /* MIDI transmit is intentionally deferred until the native parser/transport
   * is integrated. Keeping this a no-op cannot affect boot or audio bring-up. */
  (void)data; (void)size;
}

/* Export the exact native rate used to initialize the portable app. */
float fmm_felucca_sample_rate(void) { return FMM_TARGET_FS; }
