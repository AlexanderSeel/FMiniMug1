#include "fm_alpha.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>

static int active_voices(const fma_t *s) {
  int count = 0;
  for (int i = 0; i < FMA_POLYPHONY; ++i) if (s->voices[i].env_stage != FMA_ENV_OFF) ++count;
  return count;
}

static void assert_bounded(float sample) {
  assert(isfinite(sample));
  assert(sample >= -1.001f && sample <= 1.001f);
}

int main(void) {
  fma_t synth;
  fma_init(&synth, 48000.0f);
  assert(synth.patch.chorus_mode == 1u);
  assert(synth.patch.pulse_width > 0.0f && synth.patch.pulse_width < 1.0f);

  for (int i = 0; i < 8; ++i) fma_note_on(&synth, (uint8_t)(48 + i * 2), 100);
  assert(active_voices(&synth) == FMA_POLYPHONY);

  double energy = 0.0;
  for (int i = 0; i < 48000; ++i) {
    const float sample = fma_process(&synth);
    assert_bounded(sample);
    energy += sample * sample;
  }
  assert(energy > 0.01);

  fma_note_off(&synth, 58u);
  for (int i = 0; i < 96000; ++i) assert_bounded(fma_process(&synth));

  fma_all_notes_off(&synth);
  for (int i = 0; i < 480000; ++i) (void)fma_process(&synth);
  assert(active_voices(&synth) == 0);

  fma_init(&synth, 48000.0f);
  synth.patch.chorus_mode = 2u;
  synth.patch.chorus_mix = 0.7f;
  synth.patch.pulse_width = 0.22f;
  synth.patch.pwm_depth = 0.18f;
  synth.patch.pwm_rate_hz = 1.7f;
  synth.patch.hpf_cutoff_hz = 420.0f;
  synth.patch.dco_range_semitones = -12;
  synth.patch.dco_env_amount = 5.0f;
  fma_note_on(&synth, 60u, 127u);
  energy = 0.0;
  for (int i = 0; i < 96000; ++i) {
    const float sample = fma_process(&synth);
    assert_bounded(sample);
    energy += sample * sample;
  }
  assert(energy > 0.001);

  puts("alpha tests passed");
  return 0;
}
