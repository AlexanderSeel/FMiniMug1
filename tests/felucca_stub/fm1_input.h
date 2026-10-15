#pragma once
#include <stdint.h>
static struct {
  uint32_t notes;
  uint32_t buttons;
} fm1_in;
static inline void fm1_input_init(void) {}
static inline void fm1_input_scan(void) {}
static inline uint32_t fm1_input_note_edges(void) { return 0u; }
static inline uint32_t fm1_input_edges(uint32_t *released) { if (released) *released=0u; return 0u; }
static inline int32_t fm1_enc_take(uint32_t e) { (void)e; return 0; }
static inline void fm1_led_key(uint32_t id,int on) { (void)id; (void)on; }
static inline uint32_t fm1__lock(void) { return 0u; }
static inline void fm1__unlock(uint32_t state) { (void)state; }
