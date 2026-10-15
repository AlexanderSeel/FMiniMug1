/* SPDX-License-Identifier: GPL-3.0-only
 * FMiniMug1 target adapter for the M-VAVE FM-1 using Felucca's FM-1 HAL.
 *
 * Build this file only inside a Felucca/JieLi target tree. It intentionally
 * keeps flash writes disabled and exposes raw control IDs during bring-up.
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

#ifdef FMM_BUTTON_MAP_VERIFIED
#if !defined(FMM_BTN_RAW_OCT_DOWN) || !defined(FMM_BTN_RAW_OCT_UP) || \
    !defined(FMM_BTN_RAW_PAGE_LEFT) || !defined(FMM_BTN_RAW_PAGE_RIGHT) || \
    !defined(FMM_BTN_RAW_PRESET) || !defined(FMM_BTN_RAW_PATTERN) || \
    !defined(FMM_BTN_RAW_PLAY) || !defined(FMM_BTN_RAW_HOLD) || \
    !defined(FMM_BTN_RAW_ENC1) || !defined(FMM_BTN_RAW_ENC2) || \
    !defined(FMM_BTN_RAW_ENC3) || !defined(FMM_BTN_RAW_ENC4) || \
    !defined(FMM_ENC_RAW_1) || !defined(FMM_ENC_RAW_2) || \
    !defined(FMM_ENC_RAW_3) || !defined(FMM_ENC_RAW_4)
#error "Verified synth target requires all FMM_BTN_RAW_* and FMM_ENC_RAW_* mappings"
#endif
_Static_assert(FMM_BTN_RAW_OCT_DOWN < 14 && FMM_BTN_RAW_OCT_UP < 14, "button map out of range");
_Static_assert(FMM_BTN_RAW_PAGE_LEFT < 14 && FMM_BTN_RAW_PAGE_RIGHT < 14, "button map out of range");
_Static_assert(FMM_BTN_RAW_PRESET < 14 && FMM_BTN_RAW_PATTERN < 14, "button map out of range");
_Static_assert(FMM_BTN_RAW_PLAY < 14 && FMM_BTN_RAW_HOLD < 14, "button map out of range");
_Static_assert(FMM_BTN_RAW_ENC1 < 14 && FMM_BTN_RAW_ENC2 < 14 && FMM_BTN_RAW_ENC3 < 14 && FMM_BTN_RAW_ENC4 < 14, "encoder-button map out of range");
_Static_assert(FMM_ENC_RAW_1 < 7 && FMM_ENC_RAW_2 < 7 && FMM_ENC_RAW_3 < 7 && FMM_ENC_RAW_4 < 7, "encoder map out of range");
#endif

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
static uint8_t audio_started;

#ifdef FMM_BUTTON_MAP_VERIFIED
static uint32_t map_buttons(uint32_t raw) {
  uint32_t out = 0u;
#define MAP_BTN(raw_id, semantic_id) do { if (raw & (1u << (raw_id))) out |= 1u << (semantic_id); } while (0)
  MAP_BTN(FMM_BTN_RAW_OCT_DOWN, FM1_KEY_OCT_DOWN);
  MAP_BTN(FMM_BTN_RAW_OCT_UP, FM1_KEY_OCT_UP);
  MAP_BTN(FMM_BTN_RAW_PAGE_LEFT, FM1_KEY_PAGE_LEFT);
  MAP_BTN(FMM_BTN_RAW_PAGE_RIGHT, FM1_KEY_PAGE_RIGHT);
  MAP_BTN(FMM_BTN_RAW_PRESET, FM1_KEY_PRESET);
  MAP_BTN(FMM_BTN_RAW_PATTERN, FM1_KEY_PATTERN);
  MAP_BTN(FMM_BTN_RAW_PLAY, FM1_KEY_PLAY);
  MAP_BTN(FMM_BTN_RAW_HOLD, FM1_KEY_HOLD);
  MAP_BTN(FMM_BTN_RAW_ENC1, FM1_KEY_ENCODER_1);
  MAP_BTN(FMM_BTN_RAW_ENC2, FM1_KEY_ENCODER_2);
  MAP_BTN(FMM_BTN_RAW_ENC3, FM1_KEY_ENCODER_3);
  MAP_BTN(FMM_BTN_RAW_ENC4, FM1_KEY_ENCODER_4);
#undef MAP_BTN
  return out;
}

static uint8_t raw_button_for_semantic(uint8_t semantic) {
  static const uint8_t map[] = {
    FMM_BTN_RAW_OCT_DOWN, FMM_BTN_RAW_OCT_UP,
    FMM_BTN_RAW_PAGE_LEFT, FMM_BTN_RAW_PAGE_RIGHT,
    FMM_BTN_RAW_PRESET, FMM_BTN_RAW_PATTERN,
    FMM_BTN_RAW_PLAY, FMM_BTN_RAW_HOLD,
    FMM_BTN_RAW_ENC1, FMM_BTN_RAW_ENC2,
    FMM_BTN_RAW_ENC3, FMM_BTN_RAW_ENC4
  };
  return semantic < sizeof(map) ? map[semantic] : 0xFFu;
}
#endif

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
}

uint32_t fm1_platform_millis(void) {
  return fm1_micros() / 1000u;
}

void fm1_platform_poll_input(fm1_input_frame_t *frame) {
  uint32_t released_buttons = 0u;
  int16_t raw_enc[7];
  if (!frame) return;
  memset(frame, 0, sizeof(*frame));

  /* Polled full-frame scanning is the safest first bring-up mode. Once TIMER5
   * input scanning is integrated, this function can become a pure state read. */
  fm1_input_scan();

  frame->notes = fm1_in.notes;
  frame->note_pressed = fm1_input_note_edges();
  frame->note_released = previous_notes & ~frame->notes;
  previous_notes = frame->notes;

  const uint32_t raw_pressed = fm1_input_edges(&released_buttons);
#ifdef FMM_BUTTON_MAP_VERIFIED
  frame->buttons = map_buttons(fm1_in.buttons);
  frame->button_pressed = map_buttons(raw_pressed);
  frame->button_released = map_buttons(released_buttons);
#else
  /* Diagnostic mode intentionally reports Felucca's raw 0..13 IDs. */
  frame->buttons = fm1_in.buttons;
  frame->button_pressed = raw_pressed;
  frame->button_released = released_buttons;
#endif

  for (uint32_t i = 0; i < 7u; ++i) {
    int32_t delta = fm1_enc_take(i);
    if (delta < -32768) delta = -32768;
    if (delta > 32767) delta = 32767;
    raw_enc[i] = (int16_t)delta;
  }
#ifdef FMM_BUTTON_MAP_VERIFIED
  frame->encoder_delta[0] = raw_enc[FMM_ENC_RAW_1];
  frame->encoder_delta[1] = raw_enc[FMM_ENC_RAW_2];
  frame->encoder_delta[2] = raw_enc[FMM_ENC_RAW_3];
  frame->encoder_delta[3] = raw_enc[FMM_ENC_RAW_4];
#else
  for (uint32_t i = 0; i < 7u; ++i) frame->encoder_delta[i] = raw_enc[i];
#endif
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
#ifdef FMM_BUTTON_MAP_VERIFIED
  const uint8_t raw = raw_button_for_semantic(button_index);
  if (raw < 14u) fm1_led_key(raw, level != 0u);
#else
  if (button_index < 14u) fm1_led_key(button_index, level != 0u);
#endif
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
