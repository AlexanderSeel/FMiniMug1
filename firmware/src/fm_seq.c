#include "fm_seq.h"
#include <string.h>

static uint16_t clamp_bpm(uint16_t bpm) {
  if (bpm < 40u) return 40u;
  if (bpm > 300u) return 300u;
  return bpm;
}

static uint8_t clamp_length(uint8_t length) {
  if (length < 1u) return 1u;
  if (length > FM_SEQ_MAX_STEPS) return FM_SEQ_MAX_STEPS;
  return length;
}

static uint32_t base_step_samples(const fm_seq_t *seq) {
  float sr = seq->sample_rate > 1000.0f ? seq->sample_rate : 48000.0f;
  float frames = sr * 60.0f / (float)clamp_bpm(seq->pattern.bpm) / 4.0f;
  if (frames < 1.0f) frames = 1.0f;
  return (uint32_t)(frames + 0.5f);
}

static uint32_t step_samples_for(const fm_seq_t *seq, uint8_t step_index) {
  uint32_t base = base_step_samples(seq);
  uint8_t swing = seq->pattern.swing > 100u ? 100u : seq->pattern.swing;
  if (swing == 0u) return base;

  /* Pair-preserving 16th-note swing. At 100, the first step of each pair is
   * 1.5x and the second is 0.5x, so two steps still occupy the same total time. */
  float amount = (float)swing / 100.0f * 0.5f;
  float factor = (step_index & 1u) ? (1.0f - amount) : (1.0f + amount);
  uint32_t frames = (uint32_t)((float)base * factor + 0.5f);
  return frames > 0u ? frames : 1u;
}

static uint32_t gate_samples_for(const fm_seq_step_t *step, uint32_t step_samples) {
  uint8_t gate = step->gate_percent;
  if (gate < 1u) gate = 1u;
  if (gate > 100u) gate = 100u;
  uint32_t frames = (step_samples * (uint32_t)gate) / 100u;
  if (frames < 1u) frames = 1u;
  if (frames > step_samples) frames = step_samples;
  return frames;
}

static void emit(fm_seq_event_cb cb, void *user, fm_seq_event_type_t type,
                 uint32_t frame_offset, uint8_t step_index, uint8_t note,
                 uint8_t velocity, uint8_t flags) {
  if (!cb) return;
  fm_seq_event_t e;
  e.type = type;
  e.frame_offset = frame_offset;
  e.step_index = step_index;
  e.note = note;
  e.velocity = velocity;
  e.flags = flags;
  cb(&e, user);
}

void fm_seq_init(fm_seq_t *seq, float sample_rate) {
  memset(seq, 0, sizeof(*seq));
  seq->sample_rate = sample_rate;
  seq->pattern.length = 16u;
  seq->pattern.bpm = 120u;
  for (uint8_t i = 0; i < FM_SEQ_MAX_STEPS; ++i) {
    seq->pattern.steps[i].note = -1;
    seq->pattern.steps[i].velocity = 100u;
    seq->pattern.steps[i].gate_percent = 70u;
  }
}

void fm_seq_set_pattern(fm_seq_t *seq, const fm_seq_pattern_t *pattern) {
  seq->pattern = *pattern;
  seq->pattern.length = clamp_length(seq->pattern.length);
  seq->pattern.bpm = clamp_bpm(seq->pattern.bpm);
  if (seq->pattern.swing > 100u) seq->pattern.swing = 100u;
  if (seq->step_index >= seq->pattern.length) seq->step_index = 0u;
}

void fm_seq_start(fm_seq_t *seq) {
  seq->playing = 1u;
  seq->step_index = 0u;
  seq->step_started = 0u;
  seq->note_active = 0u;
  seq->active_note = 0u;
  seq->sample_in_step = 0u;
  seq->step_samples = 0u;
  seq->gate_samples = 0u;
}

void fm_seq_stop(fm_seq_t *seq) {
  seq->playing = 0u;
  seq->step_started = 0u;
  seq->note_active = 0u;
  seq->sample_in_step = 0u;
}

void fm_seq_process(fm_seq_t *seq, uint32_t frames, fm_seq_event_cb cb, void *user) {
  if (!seq->playing || frames == 0u) return;

  uint32_t offset = 0u;
  while (offset < frames) {
    fm_seq_step_t *step = &seq->pattern.steps[seq->step_index];

    if (!seq->step_started) {
      seq->step_started = 1u;
      seq->step_samples = step_samples_for(seq, seq->step_index);
      seq->gate_samples = gate_samples_for(step, seq->step_samples);
      emit(cb, user, FM_SEQ_EVENT_STEP, offset, seq->step_index, 0u, 0u, step->flags);

      /* A tie keeps the previous note alive across a boundary. If the next
       * step is a rest, that held note must end exactly at the rest boundary. */
      if (step->note < 0 && seq->note_active) {
        emit(cb, user, FM_SEQ_EVENT_NOTE_OFF, offset, seq->step_index,
             seq->active_note, 0u, step->flags);
        seq->note_active = 0u;
      }

      if (step->note >= 0) {
        int note = (int)step->note + (int)step->transpose;
        if (note < 0) note = 0;
        if (note > 127) note = 127;
        uint8_t velocity = step->velocity ? step->velocity : 100u;
        if (step->flags & FM_SEQ_FLAG_ACCENT) {
          uint16_t accented = (uint16_t)velocity + 20u;
          velocity = accented > 127u ? 127u : (uint8_t)accented;
        }
        seq->note_active = 1u;
        seq->active_note = (uint8_t)note;
        emit(cb, user, FM_SEQ_EVENT_NOTE_ON, offset, seq->step_index,
             seq->active_note, velocity, step->flags);
      }
    }

    uint32_t until_step = seq->step_samples - seq->sample_in_step;
    uint32_t until_gate = 0xFFFFFFFFu;
    if (seq->note_active && !(step->flags & FM_SEQ_FLAG_TIE) && seq->sample_in_step < seq->gate_samples) {
      until_gate = seq->gate_samples - seq->sample_in_step;
    }

    uint32_t advance = frames - offset;
    if (until_step < advance) advance = until_step;
    if (until_gate < advance) advance = until_gate;
    if (advance == 0u) advance = 1u;

    seq->sample_in_step += advance;
    offset += advance;

    if (seq->note_active && !(step->flags & FM_SEQ_FLAG_TIE) && seq->sample_in_step >= seq->gate_samples) {
      emit(cb, user, FM_SEQ_EVENT_NOTE_OFF, offset, seq->step_index,
           seq->active_note, 0u, step->flags);
      seq->note_active = 0u;
    }

    if (seq->sample_in_step >= seq->step_samples) {
      if (seq->note_active && !(step->flags & FM_SEQ_FLAG_TIE)) {
        emit(cb, user, FM_SEQ_EVENT_NOTE_OFF, offset, seq->step_index,
             seq->active_note, 0u, step->flags);
        seq->note_active = 0u;
      }
      seq->sample_in_step = 0u;
      seq->step_started = 0u;
      seq->step_index = (uint8_t)((seq->step_index + 1u) % seq->pattern.length);
    }
  }
}
