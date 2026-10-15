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
  assert(voice.patch.osc[0].range == FM_RANGE_8);
  assert(voice.patch.filter_attack_s == voice.patch.attack_s);
  assert(voice.patch.retrigger == 0);

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

  /* 8' is neutral; classic range switches move by octaves around it. */
  fm_voice_note_on(&voice, 60, 112);
  const float freq_8 = voice.target_freq[0];
  voice.patch.osc[0].range = FM_RANGE_16;
  fm_voice_note_on(&voice, 60, 112);
  const float freq_16 = voice.target_freq[0];
  assert(fabsf(freq_16 * 2.0f - freq_8) < 0.05f);
  voice.patch.osc[0].range = FM_RANGE_4;
  fm_voice_note_on(&voice, 60, 112);
  assert(fabsf(voice.target_freq[0] - freq_8 * 2.0f) < 0.05f);
  voice.patch.osc[0].range = FM_RANGE_8;

  /* Filter and loudness contours evolve independently. */
  voice.patch.attack_s = 0.001f;
  voice.patch.filter_attack_s = 0.5f;
  voice.env_amp = 0.0f;
  voice.env_filter = 0.0f;
  voice.gate = 0.0f;
  fm_voice_note_on(&voice, 36, 112);
  render_peak(&voice, 2400);
  assert(voice.env_amp > voice.env_filter);

  const float attack_peak = render_peak(&voice, 45600);
  assert(attack_peak > 0.01f);

  /* Legato leaves contours running, retrigger mode explicitly restarts them. */
  const float before_legato = voice.env_amp;
  voice.patch.retrigger = 0;
  fm_voice_note_on(&voice, 48, 112);
  assert(voice.env_amp == before_legato);
  voice.patch.retrigger = 1;
  fm_voice_note_on(&voice, 52, 112);
  assert(voice.env_amp == 0.0f);
  assert(voice.env_filter == 0.0f);

  voice.patch.retrigger = 0;
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
