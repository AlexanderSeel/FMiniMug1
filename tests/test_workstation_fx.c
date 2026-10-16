#include "fm_workstation_fx.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>

static void assert_finite_bounded(float value) {
  assert(isfinite(value));
  assert(value >= -1.0001f);
  assert(value <= 1.0001f);
}

int main(void) {
  fmw_fx_t fx;
  fmw_fx_init(&fx, 48000.0f);

  assert(fx.delay_mix > 0.0f && fx.delay_mix <= 0.8f);
  assert(fx.ambience_mix > 0.0f && fx.ambience_mix <= 0.8f);
  assert(fx.drive >= 0.5f && fx.drive <= 3.0f);
  assert(fx.delay_samples > 1u && fx.delay_samples < FMW_FX_DELAY_BUFFER);

  fmw_fx_set_param(&fx, FMW_FX_DELAY, 99.0f);
  fmw_fx_set_param(&fx, FMW_FX_AMBIENCE, -10.0f);
  fmw_fx_set_param(&fx, FMW_FX_DRIVE, 99.0f);
  assert(fx.delay_mix == 0.8f);
  assert(fx.ambience_mix == 0.0f);
  assert(fx.drive == 3.0f);

  fmw_fx_init(&fx, 48000.0f);
  fmw_fx_set_param(&fx, FMW_FX_DELAY, 0.7f);
  fmw_fx_set_param(&fx, FMW_FX_AMBIENCE, 0.5f);
  float first = fmw_fx_process(&fx, 0.75f);
  assert(first > 0.0f);
  assert_finite_bounded(first);

  int wet_tail_seen = 0;
  for (int i = 0; i < 12000; ++i) {
    float out = fmw_fx_process(&fx, 0.0f);
    assert_finite_bounded(out);
    if (i > 1000 && fabsf(out) > 0.00001f) wet_tail_seen = 1;
  }
  assert(wet_tail_seen);

  fmw_fx_init(&fx, 44100.0f);
  fmw_fx_set_param(&fx, FMW_FX_DELAY, 0.8f);
  fmw_fx_set_param(&fx, FMW_FX_AMBIENCE, 0.8f);
  fmw_fx_set_param(&fx, FMW_FX_DRIVE, 3.0f);
  unsigned state = 0x12345678u;
  for (int i = 0; i < 250000; ++i) {
    state = state * 1664525u + 1013904223u;
    float input = ((float)((state >> 8) & 0xffffu) / 32767.5f) - 1.0f;
    float out = fmw_fx_process(&fx, input * 1.6f);
    assert_finite_bounded(out);
  }

  puts("workstation FX tests passed");
  return 0;
}
