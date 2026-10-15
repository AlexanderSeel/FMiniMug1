#pragma once
#include <stdint.h>
typedef struct { uint32_t magic; } fm1_crash_t;
static inline void fm1_irq_init(void){}
static inline void fm1_irq_enable_all(void){}
