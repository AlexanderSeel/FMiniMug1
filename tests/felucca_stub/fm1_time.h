#pragma once
#include <stdint.h>
static inline void fm1_time_init(void) {}
static inline uint32_t fm1_micros(void) { return 0u; }
static inline void fm1_delay_ms(uint32_t ms) { (void)ms; }
