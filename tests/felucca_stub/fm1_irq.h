#pragma once
#include <stdint.h>
typedef struct { uint32_t magic; } fm1_crash_t;
static void fm1_fault(const fm1_crash_t *c);
static inline void fm1_irq_init(void){}
static inline void fm1_irq_enable_all(void){}
static inline void fm1_fault_c(uint32_t *frame){ (void)frame; fm1_crash_t c={0}; fm1_fault(&c); }
