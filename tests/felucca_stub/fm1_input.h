#pragma once
#include <stdint.h>

typedef struct {
  uint32_t notes;
  uint32_t buttons;
} fm1_stub_input_state_t;

extern fm1_stub_input_state_t fm1_in;
extern uint32_t fm1_stub_note_pressed;
extern uint32_t fm1_stub_button_pressed;
extern uint32_t fm1_stub_button_released;
extern int32_t fm1_stub_enc_steps[7];
extern uint32_t fm1_stub_scan_count;
extern uint32_t fm1_stub_tick_count;
extern uint32_t fm1_stub_last_led_id;
extern int fm1_stub_last_led_on;

static inline void fm1_input_init(void) {}
static inline void fm1_input_scan(void) { ++fm1_stub_scan_count; }
static inline void fm1_input_tick(void) { ++fm1_stub_tick_count; }
static inline uint32_t fm1_input_note_edges(void) {
  uint32_t p = fm1_stub_note_pressed;
  fm1_stub_note_pressed = 0u;
  return p;
}
static inline uint32_t fm1_input_edges(uint32_t *released) {
  uint32_t p = fm1_stub_button_pressed;
  if (released) *released = fm1_stub_button_released;
  fm1_stub_button_pressed = 0u;
  fm1_stub_button_released = 0u;
  return p;
}
static inline int32_t fm1_enc_take(uint32_t e) {
  if (e >= 7u) return 0;
  int32_t s = fm1_stub_enc_steps[e];
  fm1_stub_enc_steps[e] = 0;
  return s;
}
static inline void fm1_led_key(uint32_t id, int on) {
  fm1_stub_last_led_id = id;
  fm1_stub_last_led_on = on;
}
static inline uint32_t fm1__lock(void) { return 0u; }
static inline void fm1__unlock(uint32_t state) { (void)state; }
