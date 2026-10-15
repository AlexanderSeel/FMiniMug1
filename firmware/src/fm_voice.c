#include "fm_voice.h"
#include <math.h>
#include <string.h>

#define FM_PI 3.14159265358979323846f

static float clampf(float x, float lo, float hi) {
  return x < lo ? lo : (x > hi ? hi : x);
}

static float midi_hz(uint8_t n) {
  return 440.0f * powf(2.0f, ((float)n - 69.0f) / 12.0f);
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

static float env_coeff(float time_s, float sample_rate) {
  if (time_s <= 0.00001f) return 1.0f;
  return 1.0f - expf(-1.0f / (time_s * sample_rate));
}

static float envelope_tick(float current, float gate, float attack_s, float decay_s,
                           float sustain, float release_s, float sample_rate) {
  if (gate > 0.0f) {
    if (current < 0.995f) {
      current += (1.0f - current) * env_coeff(attack_s, sample_rate);
    } else {
      current += (clampf(sustain, 0.0f, 1.0f) - current) * env_coeff(decay_s, sample_rate);
    }
  } else {
    current += (0.0f - current) * env_coeff(release_s, sample_rate);
  }
  return clampf(current, 0.0f, 1.05f);
}

static int note_is_held(const fm_voice_t *v, uint8_t note) {
  return (v->held_notes[note >> 6] & (1ull << (note & 63u))) != 0ull;
}

static void note_set_held(fm_voice_t *v, uint8_t note, int held) {
  const uint64_t mask = 1ull << (note & 63u);
  if (held) v->held_notes[note >> 6] |= mask;
  else v->held_notes[note >> 6] &= ~mask;
}

static int select_held_note(const fm_voice_t *v) {
  if ((v->held_notes[0] | v->held_notes[1]) == 0ull) return -1;

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

static void retarget_note(fm_voice_t *v, uint8_t note, int retrigger_contours) {
  const float base = midi_hz(note);
  v->current_note = note;
  if (retrigger_contours) {
    v->env_amp = 0.0f;
    v->env_filter = 0.0f;
  }
  for (int i = 0; i < 3; ++i) {
    const fm_osc_params_t *o = &v->patch.osc[i];
    const float st = range_semitones(o->range) + o->coarse_semitones + o->fine_cents / 100.0f;
    v->target_freq[i] = (o->keyboard_track ? base : 440.0f) * powf(2.0f, st / 12.0f);
    if (o->low_mode) v->target_freq[i] *= 0.01f;
    if (v->freq[i] <= 0.0f) v->freq[i] = v->target_freq[i];
  }
}

/* Standard PolyBLEP correction for a discontinuity at phase 0. */
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

static void update_envelopes(fm_voice_t *v, float sr) {
  v->env_amp = envelope_tick(v->env_amp, v->gate,
                             v->patch.attack_s, v->patch.decay_s,
                             v->patch.sustain, v->patch.release_s, sr);
  v->env_filter = envelope_tick(v->env_filter, v->gate,
                                v->patch.filter_attack_s, v->patch.filter_decay_s,
                                v->patch.filter_sustain, v->patch.filter_release_s, sr);
}

static float ladder_tick(fm_voice_t *v, float input, float cutoff_hz, float sub_sr) {
  const float resonance = clampf(v->patch.resonance, 0.0f, 1.0f);
  const float normalized = clampf(cutoff_hz, 10.0f, sub_sr * 0.43f);
  const float g = tanf(FM_PI * normalized / sub_sr);
  const float a = g / (1.0f + g);
  const float feedback = resonance * 4.15f;
  float x = fast_tanh((input - feedback * v->ladder[3]) * v->patch.filter_drive);

  for (int i = 0; i < 4; ++i) {
    const float previous = i == 0 ? x : v->ladder[i - 1];
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
    /* Always recompute pitch targets so range/tuning changes take effect on a
     * repeated note-on. Only a true selected-note transition can retrigger. */
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
    return;
  }
  if ((uint8_t)selected != v->current_note) {
    retarget_note(v, (uint8_t)selected, v->patch.retrigger != 0u);
  }
}

void fm_voice_note_off(fm_voice_t *v) {
  v->held_notes[0] = 0ull;
  v->held_notes[1] = 0ull;
  memset(v->held_order, 0, sizeof(v->held_order));
  v->gate = 0.0f;
}

float fm_voice_process(fm_voice_t *v) {
  const float sr = v->sample_rate > 1000.0f ? v->sample_rate : 48000.0f;
  const int os = v->patch.oversample_2x ? 2 : 1;
  const float sub_sr = sr * (float)os;
  update_envelopes(v, sr);

  float output = 0.0f;
  for (int sub = 0; sub < os; ++sub) {
    float mix = 0.0f;
    for (int i = 0; i < 3; ++i) {
      const float glide = v->patch.glide_s <= 0.0f
        ? 1.0f
        : env_coeff(v->patch.glide_s, sub_sr);
      v->drift_state[i] = v->drift_state[i] * 0.99995f + rnd(v) * 0.00005f;
      const float drift_cents = v->drift_state[i] * v->patch.drift * 7.0f;
      const float tf = v->target_freq[i] * powf(2.0f, drift_cents / 1200.0f);
      v->freq[i] += (tf - v->freq[i]) * glide;

      const float dt = clampf(v->freq[i] / sub_sr, 0.0000001f, 0.45f);
      v->phase[i] += dt;
      if (v->phase[i] >= 1.0f) v->phase[i] -= 1.0f;
      mix += osc_sample(v, i, v->patch.osc[i].wave, v->phase[i], dt) * v->patch.osc[i].level;
    }

    mix += v->ladder[3] * v->patch.feedback * 0.35f;
    mix = fast_tanh(mix * v->patch.mixer_drive);

    float cutoff = v->patch.cutoff_hz + v->patch.filter_env_amount * v->env_filter;
    if (v->patch.filter_keytrack > 0) {
      const float track = clampf((float)v->patch.filter_keytrack / 3.0f, 0.0f, 1.0f);
      cutoff *= powf(2.0f, (((float)v->current_note - 60.0f) / 12.0f) * track);
    }
    cutoff = clampf(cutoff, 20.0f, sr * 0.42f);
    output += ladder_tick(v, mix, cutoff, sub_sr);
  }

  output /= (float)os;
  output *= v->env_amp * v->velocity;
  return clampf(output, -1.0f, 1.0f);
}
