#pragma once
#include <stdint.h>
#define FM1_TICKS_PER_US 24u
extern uint32_t fm1_stub_ticks;
static inline void fm1_time_init(void) { fm1_stub_ticks = 0u; }
static inline uint32_t fm1_ticks(void) { return fm1_stub_ticks; }
static inline uint32_t fm1_micros(void) { return fm1_stub_ticks / FM1_TICKS_PER_US; }
static inline void fm1_delay_us(uint32_t us) { fm1_stub_ticks += us * FM1_TICKS_PER_US; }
static inline void fm1_delay_ms(uint32_t ms) { fm1_stub_ticks += ms * 1000u * FM1_TICKS_PER_US; }
