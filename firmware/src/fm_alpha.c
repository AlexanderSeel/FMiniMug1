#include "fm_alpha.h"
#include <string.h>

#define FMA_LN2 0.69314718055994530942f
#define FMA_PI2 6.28318530717958647692f

static float clampf(float x, float lo, float hi) {
  return x < lo ? lo : (x > hi ? hi : x);
}

static float fast_tanh(float x) {
  const float x2 = x * x;
  return x * (27.0f + x2) / (27.0f + 9.0f * x2);
}

static float fast_exp2(float x) {
  int i = (int)x;
  const float f = x - (float)i;
  const float p = 1.0f + f * (FMA_LN2 + f * (0.24022651f + f * 0.05550411f));
  float scale = 1.0f;
  if (i >= 0) {
    while (i-- > 0) scale *= 2.0f;
  } else {
    while (i++ < 0) scale *= 0.5f;
  }
  return p * scale;
}

static float midi_hz(uint8_t note) {
  static const float base[12] = {
    8.1757989f, 8.6619572f, 9.1770240f, 9.7227182f,
    10.300861f, 10.913382f, 11.562326f, 12.249857f,
    12.978272f, 13.750000f, 14.567618f, 15.433853f
  };
  float hz = base[note % 12u];
  for (uint8_t octave = note / 12u; octave > 0u; --octave) hz *= 2.0f;
  return hz;
}

static float coeff(float seconds, float sample_rate) {
  if (seconds <= 0.0f) return 1.0f;
  const float samples = seconds * sample_rate;
  return samples <= 1.0f ? 1.0f : 1.0f / (samples + 1.0f);
}

static float triangle(float phase) {
  return phase < 0.5f ? phase * 4.0f - 1.0f : 3.0f - phase * 4.0f;
}

static float noise(fma_t *synth) {
  synth->noise_state = synth->noise_state * 1664525u + 1013904223u;
  return ((synth->noise_state >> 8) & 0xFFFFFFu) / 8388607.5f - 1.0f;
}

static float envelope_tick(fma_voice_t *voice, const fma_patch_t *patch, float sr) {
  switch ((fma_env_stage_t)voice->env_stage) {
    case FMA_ENV_ATTACK:
      voice->env += (1.0f - voice->env) * coeff(patch->attack_s, sr);
      if (voice->env >= 0.995f) {
        voice->env = 1.0f;
        voice->env_stage = FMA_ENV_DECAY;
      }
      break;
    case FMA_ENV_DECAY:
      voice->env += (patch->sustain - voice->env) * coeff(patch->decay_s, sr);
      if ((voice->env > patch->sustain ? voice->env - patch->sustain : patch->sustain - voice->env) < 0.001f) {
        voice->env = patch->sustain;
        voice->env_stage = FMA_ENV_SUSTAIN;
      }
      break;
    case FMA_ENV_SUSTAIN:
      voice->env = patch->sustain;
      break;
    case FMA_ENV_RELEASE:
      voice->env += (0.0f - voice->env) * coeff(patch->release_s, sr);
      if (voice->env < 0.00001f) {
        voice->env = 0.0f;
        voice->env_stage = FMA_ENV_OFF;
      }
      break;
    case FMA_ENV_OFF:
    default:
      voice->env = 0.0f;
      break;
  }
  return clampf(voice->env, 0.0f, 1.02f);
}

static fma_voice_t *allocate_voice(fma_t *synth) {
  fma_voice_t *oldest = &synth->voices[0];
  for (int i = 0; i < FMA_POLYPHONY; ++i) {
    fma_voice_t *voice = &synth->voices[i];
    if (voice->env_stage == FMA_ENV_OFF) return voice;
    if (voice->age < oldest->age) oldest = voice;
  }
  return oldest;
}

void fma_init(fma_t *synth, float sample_rate) {
  memset(synth, 0, sizeof(*synth));
  synth->sample_rate = sample_rate > 1000.0f ? sample_rate : 44100.0f;
  synth->noise_state = 0xA17A808u;
  synth->patch.saw_level = 0.72f;
  synth->patch.pulse_level = 0.28f;
  synth->patch.sub_level = 0.34f;
  synth->patch.noise_level = 0.02f;
  synth->patch.cutoff_hz = 1800.0f;
  synth->patch.resonance = 0.22f;
  synth->patch.env_amount_hz = 2100.0f;
  synth->patch.keytrack = 0.35f;
  synth->patch.level = 0.72f;
  synth->patch.velocity_amount = 0.32f;
  synth->patch.attack_s = 0.018f;
  synth->patch.decay_s = 0.42f;
  synth->patch.sustain = 0.68f;
  synth->patch.release_s = 0.48f;
  synth->patch.lfo_rate_hz = 0.38f;
  synth->patch.lfo_delay_s = 0.25f;
  synth->patch.lfo_dco_amount = 0.06f;
  synth->patch.lfo_vcf_amount_hz = 120.0f;
  synth->patch.chorus_mode = 1u;
  synth->patch.chorus_rate_hz = 0.28f;
  synth->patch.chorus_depth = 0.46f;
  synth->patch.chorus_mix = 0.34f;
}

void fma_set_patch(fma_t *synth, const fma_patch_t *patch) {
  if (synth && patch) synth->patch = *patch;
}

void fma_note_on(fma_t *synth, uint8_t midi_note, uint8_t velocity) {
  if (!synth) return;
  fma_voice_t *voice = allocate_voice(synth);
  voice->note = midi_note;
  voice->velocity = clampf((float)velocity / 127.0f, 0.01f, 1.0f);
  voice->gate = 1u;
  voice->env = 0.0f;
  voice->env_stage = FMA_ENV_ATTACK;
  voice->age = ++synth->age_counter;
  synth->lfo_age_s = 0.0f;
}

void fma_note_off(fma_t *synth, uint8_t midi_note) {
  if (!synth) return;
  for (int i = 0; i < FMA_POLYPHONY; ++i) {
    fma_voice_t *voice = &synth->voices[i];
    if (voice->env_stage != FMA_ENV_OFF && voice->note == midi_note) {
      voice->gate = 0u;
      voice->env_stage = FMA_ENV_RELEASE;
    }
  }
}

void fma_all_notes_off(fma_t *synth) {
  if (!synth) return;
  for (int i = 0; i < FMA_POLYPHONY; ++i) {
    fma_voice_t *voice = &synth->voices[i];
    if (voice->env_stage != FMA_ENV_OFF) {
      voice->gate = 0u;
      voice->env_stage = FMA_ENV_RELEASE;
    }
  }
}

float fma_process(fma_t *synth) {
  if (!synth) return 0.0f;
  const float sr = synth->sample_rate;
  const fma_patch_t *patch = &synth->patch;
  synth->lfo_phase += clampf(patch->lfo_rate_hz, 0.01f, 20.0f) / sr;
  if (synth->lfo_phase >= 1.0f) synth->lfo_phase -= 1.0f;
  synth->lfo_age_s += 1.0f / sr;
  const float lfo_fade = patch->lfo_delay_s <= 0.0f ? 1.0f : clampf(synth->lfo_age_s / patch->lfo_delay_s, 0.0f, 1.0f);
  const float lfo = triangle(synth->lfo_phase) * lfo_fade;
  float mix = 0.0f;

  for (int i = 0; i < FMA_POLYPHONY; ++i) {
    fma_voice_t *voice = &synth->voices[i];
    if (voice->env_stage == FMA_ENV_OFF) continue;
    const float env = envelope_tick(voice, patch, sr);
    const float pitch_ratio = fast_exp2((lfo * patch->lfo_dco_amount) / 12.0f);
    const float hz = midi_hz(voice->note) * pitch_ratio;
    voice->phase += hz / sr;
    if (voice->phase >= 1.0f) voice->phase -= 1.0f;
    voice->sub_phase += hz * 0.5f / sr;
    if (voice->sub_phase >= 1.0f) voice->sub_phase -= 1.0f;
    const float saw = 2.0f * voice->phase - 1.0f;
    const float pulse = voice->phase < 0.5f ? 1.0f : -1.0f;
    const float sub = voice->sub_phase < 0.5f ? 1.0f : -1.0f;
    const float raw = saw * patch->saw_level + pulse * patch->pulse_level + sub * patch->sub_level + noise(synth) * patch->noise_level;

    const float key = ((float)voice->note - 60.0f) / 12.0f;
    float cutoff = patch->cutoff_hz + env * patch->env_amount_hz + lfo * patch->lfo_vcf_amount_hz;
    cutoff *= fast_exp2(key * clampf(patch->keytrack, 0.0f, 1.0f));
    cutoff = clampf(cutoff, 45.0f, sr * 0.42f);
    const float g = clampf(cutoff / sr * 2.35f, 0.001f, 0.82f);
    const float resonance = clampf(patch->resonance, 0.0f, 1.0f) * 1.7f;
    const float input = fast_tanh(raw - voice->filter2 * resonance);
    voice->filter1 += g * (input - voice->filter1);
    voice->filter2 += g * (voice->filter1 - voice->filter2);

    const float vel = 1.0f - patch->velocity_amount + voice->velocity * patch->velocity_amount;
    const float amp = patch->gate_vca ? (voice->gate ? 1.0f : 0.0f) : env;
    mix += voice->filter2 * amp * vel;
  }

  mix *= clampf(patch->level, 0.0f, 1.4f) / (float)FMA_POLYPHONY;
  mix = fast_tanh(mix * 1.35f);

  const uint16_t write = synth->chorus_write;
  synth->chorus_buffer[write] = mix;
  synth->chorus_phase += clampf(patch->chorus_rate_hz, 0.02f, 8.0f) / sr;
  if (synth->chorus_phase >= 1.0f) synth->chorus_phase -= 1.0f;
  const float ctri = triangle(synth->chorus_phase);
  const float mode_scale = patch->chorus_mode >= 2u ? 1.8f : 1.0f;
  const int delay = 12 + (int)((ctri + 1.0f) * 0.5f * clampf(patch->chorus_depth, 0.0f, 1.0f) * 18.0f * mode_scale);
  const uint16_t read = (uint16_t)((write - delay) & (FMA_CHORUS_BUFFER - 1));
  const float delayed = synth->chorus_buffer[read];
  synth->chorus_write = (uint16_t)((write + 1u) & (FMA_CHORUS_BUFFER - 1));
  if (patch->chorus_mode == 0u) return clampf(mix, -1.0f, 1.0f);
  const float wet = clampf(patch->chorus_mix, 0.0f, 0.85f);
  return clampf(mix * (1.0f - wet) + delayed * wet, -1.0f, 1.0f);
}
