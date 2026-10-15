#include "fm_voice.h"
#include <string.h>

#define FM_PI 3.14159265358979323846f
#define FM_LN2 0.69314718055994530942f
#define FM_CENTS_TO_RATIO 0.0005776226504666211f

static float clampf(float x, float lo, float hi) {
  return x < lo ? lo : (x > hi ? hi : x);
}

static float fast_exp2(float x) {
  /* Truncation is sufficient here: the polynomial is well behaved for the
   * resulting fractional interval (-1,1), and avoiding x<0/x!=i keeps the
   * freestanding pi32v2 build from pulling the unavailable __ltsf2 helper. */
  int i = (int)x;
  const float f = x - (float)i;
  const float p = 1.0f + f * (FM_LN2 + f * (0.24022651f + f * 0.05550411f));
  float scale = 1.0f;
  if (i >= 0) while (i-- > 0) scale *= 2.0f;
  else while (i++ < 0) scale *= 0.5f;
  return p * scale;
}

static float midi_hz(uint8_t n) {
  static const float base[12] = {
    8.1757989f, 8.6619572f, 9.1770240f, 9.7227182f,
    10.300861f, 10.913382f, 11.562326f, 12.249857f,
    12.978272f, 13.750000f, 14.567618f, 15.433853f
  };
  float hz = base[n % 12u];
  for (uint8_t octave = n / 12u; octave > 0u; --octave) hz *= 2.0f;
  return hz;
}

static float range_semitones(uint8_t range) {
  static const float offsets[5] = {-24.0f, -12.0f, 0.0f, 12.0f, 24.0f};
  return offsets[range <= FM_RANGE_2 ? range : FM_RANGE_8];
}

static float fast_tanh(float x) {
  const float x2 = x * x;
  return x * (27.0f + x2) / (27.0f + 9.0f * x2);
}

static float rnd(fm_voice_t *v) {
  v->rng = 1664525u * v->rng + 1013904223u;
  return ((v->rng >> 8) & 0xFFFFFF) / 8388607.5f - 1.0f;
}

static float time_coeff(float time_s, float sample_rate) {
  if (time_s <= 0.0f) return 1.0f;
  const float samples = time_s * sample_rate;
  if (samples <= 1.0f) return 1.0f;
  return 1.0f / (samples + 1.0f);
}

static float envelope_tick(float current, uint8_t *stage, float attack_k,
                           float decay_k, float sustain, float release_k) {
  const float s = clampf(sustain, 0.0f, 1.0f);
  switch ((fm_env_stage_t)*stage) {
    case FM_ENV_ATTACK:
      current += (1.0f - current) * attack_k;
      if (current >= 0.995f) {
        current = 1.0f;
        *stage = FM_ENV_DECAY;
      }
      break;
    case FM_ENV_DECAY:
      current += (s - current) * decay_k;
      if ((current >= s ? current - s : s - current) < 0.001f) {
        current = s;
        *stage = FM_ENV_SUSTAIN;
      }
      break;
    case FM_ENV_SUSTAIN:
      current = s;
      break;
    case FM_ENV_RELEASE:
    default:
      current += (0.0f - current) * release_k;
      if (current < 0.00001f) current = 0.0f;
      break;
  }
  return clampf(current, 0.0f, 1.05f);
}

static void refresh_cached_coeffs(fm_voice_t *v, float sr, int os) {
  if (v->cache_attack_s != v->patch.attack_s) {
    v->cache_attack_s = v->patch.attack_s;
    v->amp_attack_k = time_coeff(v->patch.attack_s, sr);
  }
  if (v->cache_decay_s != v->patch.decay_s) {
    v->cache_decay_s = v->patch.decay_s;
    v->amp_decay_k = time_coeff(v->patch.decay_s, sr);
  }
  if (v->cache_release_s != v->patch.release_s) {
    v->cache_release_s = v->patch.release_s;
    v->amp_release_k = time_coeff(v->patch.release_s, sr);
  }
  if (v->cache_filter_attack_s != v->patch.filter_attack_s) {
    v->cache_filter_attack_s = v->patch.filter_attack_s;
    v->filter_attack_k = time_coeff(v->patch.filter_attack_s, sr);
  }
  if (v->cache_filter_decay_s != v->patch.filter_decay_s) {
    v->cache_filter_decay_s = v->patch.filter_decay_s;
    v->filter_decay_k = time_coeff(v->patch.filter_decay_s, sr);
  }
  if (v->cache_filter_release_s != v->patch.filter_release_s) {
    v->cache_filter_release_s = v->patch.filter_release_s;
    v->filter_release_k = time_coeff(v->patch.filter_release_s, sr);
  }
  if (v->cache_glide_s != v->patch.glide_s || v->cache_oversample != (uint8_t)os) {
    v->cache_glide_s = v->patch.glide_s;
    v->cache_oversample = (uint8_t)os;
    v->glide_k = v->patch.glide_s <= 0.0f ? 1.0f : time_coeff(v->patch.glide_s, sr * (float)os);
  }
  if (v->cache_keytrack != v->patch.filter_keytrack || v->cache_keynote != v->current_note) {
    v->cache_keytrack = v->patch.filter_keytrack;
    v->cache_keynote = v->current_note;
    if (v->patch.filter_keytrack == 0u) v->keytrack_ratio = 1.0f;
    else {
      const float track = clampf((float)v->patch.filter_keytrack / 3.0f, 0.0f, 1.0f);
      v->keytrack_ratio = fast_exp2((((float)v->current_note - 60.0f) / 12.0f) * track);
    }
  }
}

static int note_is_held(const fm_voice_t *v, uint8_t note) {
  return (v->held_notes[note >> 5] & (1u << (note & 31u))) != 0u;
}

static void note_set_held(fm_voice_t *v, uint8_t note, int held) {
  const uint32_t mask = 1u << (note & 31u);
  if (held) v->held_notes[note >> 5] |= mask;
  else v->held_notes[note >> 5] &= ~mask;
}

static int select_held_note(const fm_voice_t *v) {
  if ((v->held_notes[0] | v->held_notes[1] | v->held_notes[2] | v->held_notes[3]) == 0u) return -1;

  const uint8_t mode = v->patch.note_priority <= FM_NOTE_LAST ? v->patch.note_priority : FM_NOTE_LOW;
  if (mode == FM_NOTE_LOW) {
    for (int n = 0; n < 128; ++n) if (note_is_held(v, (uint8_t)n)) return n;
  } else if (mode == FM_NOTE_HIGH) {
    for (int n = 127; n >= 0; --n) if (note_is_held(v, (uint8_t)n)) return n;
  } else {
    int best = -1;
    uint16_t serial = 0u;
    for (int n = 0; n < 128; ++n) {
      if (note_is_held(v, (uint8_t)n) && (best < 0 || v->held_order[n] >= serial)) {
        best = n;
        serial = v->held_order[n];
      }
    }
    return best;
  }
  return -1;
}

static void begin_attack(fm_voice_t *v, int hard_reset) {
  if (hard_reset) {
    v->env_amp = 0.0f;
    v->env_filter = 0.0f;
  }
  v->env_amp_stage = FM_ENV_ATTACK;
  v->env_filter_stage = FM_ENV_ATTACK;
}

static void begin_release(fm_voice_t *v) {
  v->env_amp_stage = FM_ENV_RELEASE;
  v->env_filter_stage = FM_ENV_RELEASE;
}

static void retarget_note(fm_voice_t *v, uint8_t note, int retrigger_contours) {
  const float base = midi_hz(note);
  v->current_note = note;
  if (retrigger_contours) begin_attack(v, 1);
  for (int i = 0; i < 3; ++i) {
    const fm_osc_params_t *o = &v->patch.osc[i];
    const float st = range_semitones(o->range) + o->coarse_semitones + o->fine_cents / 100.0f;
    v->target_freq[i] = (o->keyboard_track ? base : 440.0f) * fast_exp2(st / 12.0f);
    if (o->low_mode) v->target_freq[i] *= 0.01f;
    if (v->freq[i] <= 0.0f) v->freq[i] = v->target_freq[i];
  }
}

static float poly_blep(float t, float dt) {
  if (dt <= 0.0f) return 0.0f;
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1.0f;
  }
  if (t > 1.0f - dt) {
    t = (t - 1.0f) / dt;
    return t * t + t + t + 1.0f;
  }
  return 0.0f;
}

static float blep_saw(float phase, float dt) {
  return (2.0f * phase - 1.0f) - poly_blep(phase, dt);
}

static float blep_pulse(float phase, float dt, float duty) {
  float y = phase < duty ? 1.0f : -1.0f;
  y += poly_blep(phase, dt);
  float t2 = phase - duty;
  if (t2 < 0.0f) t2 += 1.0f;
  y -= poly_blep(t2, dt);
  return y;
}

static float osc_sample(fm_voice_t *v, int index, fm_wave_t wave, float phase, float dt) {
  switch (wave) {
    case FM_WAVE_TRI: {
      const float square = blep_pulse(phase, dt, 0.5f);
      v->tri_state[index] += square * (4.0f * dt);
      v->tri_state[index] *= 1.0f - clampf(dt * 0.5f, 0.0f, 0.01f);
      return clampf(v->tri_state[index], -1.1f, 1.1f);
    }
    case FM_WAVE_SQUARE:
      return blep_pulse(phase, dt, 0.5f);
    case FM_WAVE_PULSE:
      return blep_pulse(phase, dt, 0.25f);
    case FM_WAVE_SAW:
    default:
      return blep_saw(phase, dt);
  }
}

static void update_envelopes(fm_voice_t *v) {
  v->env_amp = envelope_tick(v->env_amp, &v->env_amp_stage,
                             v->amp_attack_k, v->amp_decay_k,
                             v->patch.sustain, v->amp_release_k);
  v->env_filter = envelope_tick(v->env_filter, &v->env_filter_stage,
                                v->filter_attack_k, v->filter_decay_k,
                                v->patch.filter_sustain, v->filter_release_k);
}

static float ladder_tick(fm_voice_t *v, float input, float cutoff_hz, float sub_sr) {
  const float resonance = clampf(v->patch.resonance, 0.0f, 1.0f);
  const float normalized = clampf(cutoff_hz, 10.0f, sub_sr * 0.43f);
  const float x = FM_PI * normalized / sub_sr;
  const float x2 = x * x;
  const float denom = 15.0f - 6.0f * x2;
  const float g = denom > 0.001f ? x * (15.0f - x2) / denom : 8.0f;
  const float a = g / (1.0f + g);
  const float feedback = resonance * 4.15f;
  float s = fast_tanh((input - feedback * v->ladder[3]) * v->patch.filter_drive);

  for (int i = 0; i < 4; ++i) {
    const float previous = i == 0 ? s : v->ladder[i - 1];
    const float target = fast_tanh(previous);
    const float state = fast_tanh(v->ladder[i]);
    v->ladder[i] += a * (target - state);
  }

  return v->ladder[3] * (1.0f + 0.18f * resonance);
}

void fm_voice_init(fm_voice_t *v, float sample_rate) {
  memset(v, 0, sizeof(*v));
  v->sample_rate = sample_rate;
  v->rng = 0x51F17A1u;
  v->current_note = 60;
  v->env_amp_stage = FM_ENV_RELEASE;
  v->env_filter_stage = FM_ENV_RELEASE;
  v->cache_attack_s = -1.0f;
  v->cache_decay_s = -1.0f;
  v->cache_release_s = -1.0f;
  v->cache_filter_attack_s = -1.0f;
  v->cache_filter_decay_s = -1.0f;
  v->cache_filter_release_s = -1.0f;
  v->cache_glide_s = -1.0f;
  v->cache_keynote = 0xFFu;
  v->cache_keytrack = 0xFFu;
  v->cache_oversample = 0xFFu;
  v->keytrack_ratio = 1.0f;
  v->patch.cutoff_hz = 1000.0f;
  v->patch.resonance = 0.2f;
  v->patch.attack_s = 0.005f;
  v->patch.decay_s = 0.3f;
  v->patch.sustain = 0.6f;
  v->patch.release_s = 0.25f;
  v->patch.filter_attack_s = 0.005f;
  v->patch.filter_decay_s = 0.3f;
  v->patch.filter_sustain = 0.6f;
  v->patch.filter_release_s = 0.25f;
  v->patch.mixer_drive = 1.4f;
  v->patch.filter_drive = 1.1f;
  v->patch.filter_keytrack = 0;
  v->patch.oversample_2x = 1;
  v->patch.retrigger = 0;
  v->patch.note_priority = FM_NOTE_LOW;
  for (int i = 0; i < 3; ++i) {
    v->patch.osc[i].wave = FM_WAVE_SAW;
    v->patch.osc[i].level = i == 0 ? 0.8f : 0.35f;
    v->patch.osc[i].keyboard_track = 1;
    v->patch.osc[i].range = FM_RANGE_8;
  }
}

void fm_voice_set_patch(fm_voice_t *v, const fm_patch_t *p) {
  v->patch = *p;
  for (int i = 0; i < 3; ++i) {
    if (v->patch.osc[i].range > FM_RANGE_2) v->patch.osc[i].range = FM_RANGE_8;
  }
  if (v->patch.note_priority > FM_NOTE_LAST) v->patch.note_priority = FM_NOTE_LOW;
}

void fm_voice_note_on(fm_voice_t *v, uint8_t note, uint8_t velocity) {
  const int was_gated = v->gate > 0.0f;
  note_set_held(v, note, 1);
  v->held_order[note] = ++v->note_serial;
  if (v->note_serial == 0u) {
    for (int i = 0; i < 128; ++i) v->held_order[i] = note_is_held(v, (uint8_t)i) ? 1u : 0u;
    v->held_order[note] = 2u;
    v->note_serial = 2u;
  }

  const int selected = select_held_note(v);
  const int changed = selected >= 0 && (uint8_t)selected != v->current_note;
  if (selected >= 0) {
    if (!was_gated) begin_attack(v, 0);
    retarget_note(v, (uint8_t)selected, was_gated && changed && v->patch.retrigger);
  }
  v->velocity = clampf((float)velocity / 127.0f, 0.05f, 1.0f);
  v->gate = 1.0f;
}

void fm_voice_note_off_note(fm_voice_t *v, uint8_t note) {
  note_set_held(v, note, 0);
  v->held_order[note] = 0u;
  const int selected = select_held_note(v);
  if (selected < 0) {
    v->gate = 0.0f;
    begin_release(v);
    return;
  }
  if ((uint8_t)selected != v->current_note) {
    retarget_note(v, (uint8_t)selected, v->patch.retrigger != 0u);
  }
}

void fm_voice_note_off(fm_voice_t *v) {
  v->held_notes[0] = 0u;
  v->held_notes[1] = 0u;
  v->held_notes[2] = 0u;
  v->held_notes[3] = 0u;
  memset(v->held_order, 0, sizeof(v->held_order));
  v->gate = 0.0f;
  begin_release(v);
}

float fm_voice_process(fm_voice_t *v) {
  const float sr = v->sample_rate > 1000.0f ? v->sample_rate : 48000.0f;
  const int os = v->patch.oversample_2x ? 2 : 1;
  const float sub_sr = sr * (float)os;
  refresh_cached_coeffs(v, sr, os);
  update_envelopes(v);

  float output = 0.0f;
  for (int sub = 0; sub < os; ++sub) {
    float mix = 0.0f;
    for (int i = 0; i < 3; ++i) {
      v->drift_state[i] = v->drift_state[i] * 0.99995f + rnd(v) * 0.00005f;
      const float drift_cents = v->drift_state[i] * v->patch.drift * 7.0f;
      const float drift_ratio = 1.0f + drift_cents * FM_CENTS_TO_RATIO;
      const float tf = v->target_freq[i] * drift_ratio;
      v->freq[i] += (tf - v->freq[i]) * v->glide_k;

      const float dt = clampf(v->freq[i] / sub_sr, 0.0000001f, 0.45f);
      v->phase[i] += dt;
      if (v->phase[i] >= 1.0f) v->phase[i] -= 1.0f;
      mix += osc_sample(v, i, v->patch.osc[i].wave, v->phase[i], dt) * v->patch.osc[i].level;
    }

    mix += v->ladder[3] * v->patch.feedback * 0.35f;
    mix = fast_tanh(mix * v->patch.mixer_drive);

    float cutoff = (v->patch.cutoff_hz + v->patch.filter_env_amount * v->env_filter) * v->keytrack_ratio;
    cutoff = clampf(cutoff, 20.0f, sr * 0.42f);
    output += ladder_tick(v, mix, cutoff, sub_sr);
  }

  output /= (float)os;
  output *= v->env_amp * v->velocity;
  return clampf(output, -1.0f, 1.0f);
}
