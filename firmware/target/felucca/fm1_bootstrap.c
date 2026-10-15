/* SPDX-License-Identifier: GPL-3.0-only
 * Minimal FMiniMug1 C bootstrap used with Felucca's crt0.S/app.ld.
 */
#include "fm1_felucca_target.h"
#include <stdint.h>

extern uint32_t _data_start[], _data_end[], _data_load[];
extern uint32_t _bss_start[], _bss_end[];
extern int main(void);

/* Felucca crt0.S enters here with interrupts already disabled and stacks set. */
void fm1_cstart(void) {
  uint32_t *src;
  uint32_t *dst;

  for (dst = _bss_start; dst < _bss_end; ++dst) *dst = 0u;
  for (src = _data_load, dst = _data_start; dst < _data_end; ++src, ++dst) *dst = *src;

  fm1_felucca_irq_init();
  (void)main();
  for (;;) { }
}
