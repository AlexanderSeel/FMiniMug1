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

static void test_note_priority(fm_voice_t *voice) {
  fm_voice_note_off(voice);
  voice->patch.retrigger = 0;
  voice->patch.note_priority = FM_NOTE_LOW;
  fm_voice_note_on(voice, 60, 100);
  fm_voice_note_on(voice, 67, 100);
  assert(voice->current_note == 60);
  fm_voice_note_off_note(voice, 60);
  assert(voice->gate > 0.0f && voice->current_note == 67);
  fm_voice_note_off_note(voice, 67);
  assert(voice->gate == 0.0f);

  voice->patch.note_priority = FM_NOTE_HIGH;
  fm_voice_note_on(voice, 60, 100);
  fm_voice_note_on(voice, 67, 100);
  assert(voice->current_note == 67);
  fm_voice_note_off_note(voice, 67);
  assert(voice->gate > 0.0f && voice->current_note == 60);
  fm_voice_note_off(voice);

  voice->patch.note_priority = FM_NOTE_LAST;
  fm_voice_note_on(voice, 60, 100);
  fm_voice_note_on(voice, 67, 100);
  fm_voice_note_on(voice, 64, 100);
  assert(voice->current_note == 64);
  fm_voice_note_off_note(voice, 64);
  assert(voice->current_note == 67);
  fm_voice_note_off_note(voice, 67);
  assert(voice->current_note == 60);
  fm_voice_note_off_note(voice, 60);
  assert(voice->gate == 0.0f);
}

static void test_adsr_stages(fm_voice_t *voice) {
  fm_voice_note_off(voice);
  voice->patch.attack_s = 0.001f;
  voice->patch.decay_s = 0.02f;
  voice->patch.sustain = 0.31f;
  voice->patch.release_s = 0.02f;
  voice->patch.filter_attack_s = 0.001f;
  voice->patch.filter_decay_s = 0.02f;
  voice->patch.filter_sustain = 0.42f;
  voice->patch.filter_release_s = 0.02f;
  voice->patch.amp_decay_switch = 0u;
  voice->patch.filter_decay_switch = 0u;
  voice->env_amp = 0.0f;
  voice->env_filter = 0.0f;

  fm_voice_note_on(voice, 60, 100);
  render_peak(voice, 12000);
  assert(voice->env_amp_stage == FM_ENV_SUSTAIN);
  assert(voice->env_filter_stage == FM_ENV_SUSTAIN);
  assert(fabsf(voice->env_amp - 0.31f) < 0.002f);
  assert(fabsf(voice->env_filter - 0.42f) < 0.002f);
  render_peak(voice, 12000);
  assert(voice->env_amp_stage == FM_ENV_SUSTAIN);
  assert(voice->env_filter_stage == FM_ENV_SUSTAIN);

  fm_voice_note_off(voice);
  assert(voice->env_amp_stage == FM_ENV_RELEASE);
  assert(voice->env_filter_stage == FM_ENV_RELEASE);
  render_peak(voice, 12000);
  assert(voice->env_amp < 0.001f);
  assert(voice->env_filter < 0.001f);
}

static void test_decay_switches(void) {
  fm_voice_t free_release, decay_linked;
  fm_voice_init(&free_release, 48000.0f);
  fm_voice_init(&decay_linked, 48000.0f);
  free_release.patch.oversample_2x = decay_linked.patch.oversample_2x = 0u;
  free_release.patch.attack_s = decay_linked.patch.attack_s = 0.001f;
  free_release.patch.decay_s = decay_linked.patch.decay_s = 0.01f;
  free_release.patch.sustain = decay_linked.patch.sustain = 0.5f;
  free_release.patch.release_s = decay_linked.patch.release_s = 2.0f;
  free_release.patch.filter_attack_s = decay_linked.patch.filter_attack_s = 0.001f;
  free_release.patch.filter_decay_s = decay_linked.patch.filter_decay_s = 0.01f;
  free_release.patch.filter_sustain = decay_linked.patch.filter_sustain = 0.5f;
  free_release.patch.filter_release_s = decay_linked.patch.filter_release_s = 2.0f;
  decay_linked.patch.amp_decay_switch = 1u;
  decay_linked.patch.filter_decay_switch = 1u;

  fm_voice_note_on(&free_release, 60, 100);
  fm_voice_note_on(&decay_linked, 60, 100);
  render_peak(&free_release, 12000);
  render_peak(&decay_linked, 12000);
  fm_voice_note_off(&free_release);
  fm_voice_note_off(&decay_linked);
  render_peak(&free_release, 4800);
  render_peak(&decay_linked, 4800);

  assert(free_release.env_amp > 0.35f);
  assert(free_release.env_filter > 0.35f);
  assert(decay_linked.env_amp < 0.01f);
  assert(decay_linked.env_filter < 0.01f);
}

static float glide_first_step(uint8_t mode, uint8_t target_note) {
  fm_voice_t v;
  fm_voice_init(&v, 48000.0f);
  v.patch.oversample_2x = 0u;
  v.patch.drift = 0.0f;
  v.patch.glide_s = 1.0f;
  v.patch.glide_mode = mode;
  v.patch.note_priority = FM_NOTE_LAST;
  fm_voice_note_on(&v, 60, 100);
  (void)fm_voice_process(&v);
  const float before = v.freq[0];
  fm_voice_note_on(&v, target_note, 100);
  (void)fm_voice_process(&v);
  return v.freq[0] - before;
}

static void test_glide_modes(void) {
  const float rate_near = glide_first_step(FM_GLIDE_RATE, 72u);
  const float rate_far = glide_first_step(FM_GLIDE_RATE, 108u);
  assert(rate_near > 0.0f);
  assert(fabsf(rate_far - rate_near) < 0.001f);

  const float time_near = glide_first_step(FM_GLIDE_TIME, 72u);
  const float time_far = glide_first_step(FM_GLIDE_TIME, 108u);
  assert(time_far > time_near * 5.0f);
}

int main(void) {
  fm_voice_t voice;
  fm_voice_init(&voice, 48000.0f);
  assert(voice.patch.oversample_2x == 1);
  assert(voice.patch.osc[0].range == FM_RANGE_8);
  assert(voice.patch.filter_attack_s == voice.patch.attack_s);
  assert(voice.patch.retrigger == 0);
  assert(voice.patch.note_priority == FM_NOTE_LOW);
  assert(voice.patch.amp_decay_switch == 0u);
  assert(voice.patch.filter_decay_switch == 0u);
  assert(voice.patch.glide_mode == FM_GLIDE_TIME);

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

  fm_voice_note_on(&voice, 60, 112);
  const float freq_8 = voice.target_freq[0];
  voice.patch.osc[0].range = FM_RANGE_16;
  fm_voice_note_on(&voice, 60, 112);
  const float freq_16 = voice.target_freq[0];
  assert(fabsf(freq_16 * 2.0f - freq_8) < 0.08f);
  voice.patch.osc[0].range = FM_RANGE_4;
  fm_voice_note_on(&voice, 60, 112);
  assert(fabsf(voice.target_freq[0] - freq_8 * 2.0f) < 0.08f);
  voice.patch.osc[0].range = FM_RANGE_8;
  fm_voice_note_off(&voice);

  voice.patch.attack_s = 0.001f;
  voice.patch.filter_attack_s = 0.5f;
  voice.env_amp = 0.0f;
  voice.env_filter = 0.0f;
  fm_voice_note_on(&voice, 36, 112);
  render_peak(&voice, 2400);
  assert(voice.env_amp > voice.env_filter);
  const float attack_peak = render_peak(&voice, 45600);
  assert(attack_peak > 0.01f);
  fm_voice_note_off(&voice);

  voice.patch.note_priority = FM_NOTE_LAST;
  voice.patch.retrigger = 0;
  fm_voice_note_on(&voice, 48, 112);
  render_peak(&voice, 1200);
  const float before_legato = voice.env_amp;
  fm_voice_note_on(&voice, 52, 112);
  assert(voice.current_note == 52);
  assert(voice.env_amp == before_legato);
  voice.patch.retrigger = 1;
  fm_voice_note_on(&voice, 55, 112);
  assert(voice.current_note == 55);
  assert(voice.env_amp == 0.0f);
  assert(voice.env_filter == 0.0f);
  assert(voice.env_amp_stage == FM_ENV_ATTACK);
  assert(voice.env_filter_stage == FM_ENV_ATTACK);
  fm_voice_note_off(&voice);

  test_note_priority(&voice);
  test_adsr_stages(&voice);
  test_decay_switches();
  test_glide_modes();

  voice.patch.note_priority = FM_NOTE_LOW;
  voice.patch.retrigger = 0;
  voice.patch.amp_decay_switch = 0u;
  voice.patch.filter_decay_switch = 0u;
  fm_voice_note_on(&voice, 72, 127);
  const float high_peak = render_peak(&voice, 12000);
  assert(high_peak > 0.005f);

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
