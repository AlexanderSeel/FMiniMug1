#include "fm_seq.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

typedef struct {
  fm_seq_event_t events[64];
  int count;
} log_t;

static void capture(const fm_seq_event_t *e, void *user) {
  log_t *log = (log_t *)user;
  assert(log->count < (int)(sizeof(log->events) / sizeof(log->events[0])));
  log->events[log->count++] = *e;
}

static int count_type(const log_t *log, fm_seq_event_type_t type) {
  int n = 0;
  for (int i = 0; i < log->count; ++i) if (log->events[i].type == type) ++n;
  return n;
}

int main(void) {
  fm_seq_t seq;
  fm_seq_pattern_t p;
  log_t log;

  fm_seq_init(&seq, 48000.0f);
  memset(&p, 0, sizeof(p));
  p.length = 4;
  p.bpm = 120;
  for (int i = 0; i < 4; ++i) {
    p.steps[i].note = (int8_t)(60 + i);
    p.steps[i].velocity = 90;
    p.steps[i].gate_percent = 50;
  }
  p.steps[1].flags = FM_SEQ_FLAG_ACCENT;
  fm_seq_set_pattern(&seq, &p);
  fm_seq_start(&seq);

  memset(&log, 0, sizeof(log));
  fm_seq_process(&seq, 12000, capture, &log);
  assert(count_type(&log, FM_SEQ_EVENT_STEP) == 2);
  assert(count_type(&log, FM_SEQ_EVENT_NOTE_ON) == 2);
  assert(count_type(&log, FM_SEQ_EVENT_NOTE_OFF) == 2);
  assert(log.events[0].type == FM_SEQ_EVENT_STEP && log.events[0].frame_offset == 0);
  assert(log.events[1].type == FM_SEQ_EVENT_NOTE_ON && log.events[1].note == 60);

  int found_accent = 0;
  for (int i = 0; i < log.count; ++i) {
    if (log.events[i].type == FM_SEQ_EVENT_NOTE_ON && log.events[i].step_index == 1) {
      assert(log.events[i].velocity == 110);
      found_accent = 1;
    }
  }
  assert(found_accent);

  /* Straight 120 BPM sixteenths are exactly 6000 frames at 48 kHz. */
  fm_seq_start(&seq);
  memset(&log, 0, sizeof(log));
  fm_seq_process(&seq, 6001, capture, &log);
  int step1_offset = -1;
  for (int i = 0; i < log.count; ++i) {
    if (log.events[i].type == FM_SEQ_EVENT_STEP && log.events[i].step_index == 1) step1_offset = (int)log.events[i].frame_offset;
  }
  assert(step1_offset == 6000);

  /* 50% swing makes the first step 1.25x = 7500 frames while a two-step pair
   * still totals 12000 frames. */
  p.swing = 50;
  fm_seq_set_pattern(&seq, &p);
  fm_seq_start(&seq);
  memset(&log, 0, sizeof(log));
  fm_seq_process(&seq, 12001, capture, &log);
  int first_boundary = -1;
  int second_boundary = -1;
  for (int i = 0; i < log.count; ++i) {
    if (log.events[i].type != FM_SEQ_EVENT_STEP) continue;
    if (log.events[i].step_index == 1) first_boundary = (int)log.events[i].frame_offset;
    if (log.events[i].step_index == 2) second_boundary = (int)log.events[i].frame_offset;
  }
  assert(first_boundary == 7500);
  assert(second_boundary == 12000);

  /* A tied step sustains through its own gate, but a following rest releases
   * the held note exactly on the rest boundary rather than hanging forever. */
  memset(&p, 0, sizeof(p));
  p.length = 2;
  p.bpm = 120;
  p.steps[0].note = 60;
  p.steps[0].velocity = 100;
  p.steps[0].gate_percent = 25;
  p.steps[0].flags = FM_SEQ_FLAG_TIE | FM_SEQ_FLAG_SLIDE;
  p.steps[1].note = -1;
  p.steps[1].velocity = 100;
  p.steps[1].gate_percent = 70;
  fm_seq_set_pattern(&seq, &p);
  fm_seq_start(&seq);
  memset(&log, 0, sizeof(log));
  fm_seq_process(&seq, 6001, capture, &log);
  int tied_off = -1;
  for (int i = 0; i < log.count; ++i) {
    if (log.events[i].type == FM_SEQ_EVENT_NOTE_OFF) tied_off = (int)log.events[i].frame_offset;
  }
  assert(tied_off == 6000);

  printf("FMiniMug1 sequencer tests passed\n");
  return 0;
}
