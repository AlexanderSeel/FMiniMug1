#pragma once
#include <stdint.h>

#define FM_SEQ_MAX_STEPS 64u

typedef enum {
  FM_SEQ_FLAG_ACCENT = 1u << 0,
  FM_SEQ_FLAG_TIE = 1u << 1,
  FM_SEQ_FLAG_SLIDE = 1u << 2
} fm_seq_step_flag_t;

typedef struct {
  int8_t note;          /* MIDI note, -1 = rest */
  int8_t transpose;     /* per-step semitone offset */
  uint8_t velocity;     /* 1..127 */
  uint8_t gate_percent; /* 1..100 */
  uint8_t flags;        /* fm_seq_step_flag_t */
} fm_seq_step_t;

typedef struct {
  fm_seq_step_t steps[FM_SEQ_MAX_STEPS];
  uint8_t length;       /* 1..64 */
  uint16_t bpm;         /* 40..300 */
  uint8_t swing;        /* 0..100; 0 = straight */
} fm_seq_pattern_t;

typedef enum {
  FM_SEQ_EVENT_NOTE_ON = 1,
  FM_SEQ_EVENT_NOTE_OFF = 2,
  FM_SEQ_EVENT_STEP = 3
} fm_seq_event_type_t;

typedef struct {
  fm_seq_event_type_t type;
  uint32_t frame_offset; /* offset inside current audio block */
  uint8_t step_index;
  uint8_t note;
  uint8_t velocity;
  uint8_t flags;
} fm_seq_event_t;

typedef void (*fm_seq_event_cb)(const fm_seq_event_t *event, void *user);

typedef struct {
  float sample_rate;
  fm_seq_pattern_t pattern;
  uint8_t playing;
  uint8_t step_index;
  uint8_t step_started;
  uint8_t note_active;
  uint8_t active_note;
  uint32_t sample_in_step;
  uint32_t step_samples;
  uint32_t gate_samples;
} fm_seq_t;

void fm_seq_init(fm_seq_t *seq, float sample_rate);
void fm_seq_set_pattern(fm_seq_t *seq, const fm_seq_pattern_t *pattern);
void fm_seq_start(fm_seq_t *seq);
void fm_seq_stop(fm_seq_t *seq);
void fm_seq_process(fm_seq_t *seq, uint32_t frames, fm_seq_event_cb cb, void *user);
