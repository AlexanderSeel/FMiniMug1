#include "fm_workstation_seq.h"
#include <assert.h>
#include <stdio.h>

static uint32_t events;
static uint8_t seen[16];
static void on_step(uint8_t step, void *user) {
  (void)user;
  if (events < 16u) seen[events] = step;
  ++events;
}

int main(void) {
  fmw_seq_clock_t clock;
  fmw_seq_clock_init(&clock, 48000.0f);
  fmw_seq_clock_config_t cfg = {120u, 0u, 16u};
  fmw_seq_clock_configure(&clock, &cfg);
  fmw_seq_clock_start(&clock);
  events = 0u;
  fmw_seq_clock_process(&clock, 48000u, on_step, 0);
  /* 120 BPM: 16th = 6000 samples, so one second contains 8 step starts. */
  assert(events == 8u);
  for (uint8_t i = 0u; i < 8u; ++i) assert(seen[i] == i);

  fmw_seq_clock_stop(&clock);
  fmw_seq_clock_process(&clock, 48000u, on_step, 0);
  assert(events == 8u);

  cfg.swing = 50u;
  cfg.length = 4u;
  fmw_seq_clock_configure(&clock, &cfg);
  fmw_seq_clock_start(&clock);
  events = 0u;
  fmw_seq_clock_process(&clock, 12000u, on_step, 0);
  /* Pair-preserving swing: long 7500 + short 4500 = same 12000 sample pair. */
  assert(events == 2u);
  assert(seen[0] == 0u && seen[1] == 1u);

  cfg.bpm = 999u; cfg.swing = 99u; cfg.length = 0u;
  fmw_seq_clock_configure(&clock, &cfg);
  assert(clock.config.bpm == 300u);
  assert(clock.config.swing == 75u);
  assert(clock.config.length == 1u);

  puts("workstation sample clock tests passed");
  return 0;
}
