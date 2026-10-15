#include "fm_voice.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>

static float render_peak(fm_voice_t *voice, int samples) {
  float peak = 0.0f;
  for (int i = 0; i < samples; ++i) {
    const float s = fm_voice_process(voice);
    assert(isfinite(s));
    assert(s >= -1.0001f && s <= 1.0001f);
    const float a = fabsf(s);
    if (a > peak) peak = a;
  }
  return peak;
}

int main(void) {
  fm_voice_t voice;
  fm_voice_init(&voice, 48000.0f);
  assert(voice.patch.oversample_2x == 1);

  voice.patch.osc[0].wave = FM_WAVE_SAW;
  voice.patch.osc[1].wave = FM_WAVE_SQUARE;
  voice.patch.osc[2].wave = FM_WAVE_TRI;
  voice.patch.osc[0].level = 0.8f;
  voice.patch.osc[1].level = 0.45f;
  voice.patch.osc[2].level = 0.2f;
  voice.patch.cutoff_hz = 900.0f;
  voice.patch.filter_env_amount = 2600.0f;
  voice.patch.resonance = 0.55f;
  voice.patch.filter_keytrack = 2;
  voice.patch.mixer_drive = 1.8f;
  voice.patch.filter_drive = 1.3f;
  voice.patch.drift = 0.2f;

  fm_voice_note_on(&voice, 36, 112);
  const float attack_peak = render_peak(&voice, 48000);
  assert(attack_peak > 0.01f);

  fm_voice_note_on(&voice, 72, 127);
  const float high_peak = render_peak(&voice, 12000);
  assert(high_peak > 0.005f);

  /* High resonance and feedback must remain bounded and finite. */
  voice.patch.resonance = 1.0f;
  voice.patch.feedback = 0.9f;
  voice.patch.filter_drive = 2.5f;
  const float stress_peak = render_peak(&voice, 96000);
  assert(stress_peak <= 1.0001f);

  fm_voice_note_off(&voice);
  render_peak(&voice, 192000);
  assert(fabsf(voice.env_amp) < 0.01f);

  printf("FMiniMug1 DSP tests passed (peaks %.3f / %.3f / %.3f)\n",
         attack_peak, high_peak, stress_peak);
  return 0;
}
