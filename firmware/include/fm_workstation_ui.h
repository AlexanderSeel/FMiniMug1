#pragma once
#include <stdint.h>
/* Generated from shared/workstation.json. Do not edit by hand. */

typedef enum {
  FMW_PART_MINI = 0,
  FMW_PART_DRUM808 = 1,
  FMW_PART_BASS808 = 2,
  FMW_PART_ALPHA = 3,
  FMW_PART_COUNT = 4
} fmw_part_id_t;

typedef struct {
  const char *id;
  const char *title;
  const char *p0;
  const char *p1;
  const char *p2;
  const char *p3;
} fmw_page_desc_t;

typedef struct {
  const char *id;
  const char *title;
  const char *subtitle;
  uint8_t polyphony;
  uint8_t page_count;
  const fmw_page_desc_t *pages;
} fmw_part_desc_t;

static const fmw_page_desc_t FMW_MINI_PAGES[] = {
  {"osc", "OSC", "OSC1", "OSC2", "OSC3", "GLIDE"},
  {"mix", "MIX", "MIX DRIVE", "FILTER DRIVE", "FEEDBACK", "2X OS"},
  {"filter", "FILTER", "CUTOFF", "RESO", "CONTOUR", "KEYTRACK"},
  {"env", "ENV", "ATTACK", "DECAY", "SUSTAIN", "RELEASE"},
  {"mod", "MOD", "DRIFT", "GLIDE MODE", "PRIORITY", "RETRIG"},
  {"seq", "SEQ", "STEP", "NOTE", "GATE", "PLAY"},
};

static const fmw_page_desc_t FMW_DRUM808_PAGES[] = {
  {"kit", "KIT", "VOICE", "LEVEL", "TUNE", "DECAY"},
  {"tone", "TONE", "TONE", "ACCENT", "DRIVE", "TRIGGER"},
  {"mix", "MIX", "BD", "SD", "HATS", "PERC"},
  {"seq", "SEQ", "STEP", "HIT", "ACCENT", "VOICE"},
  {"perf", "PERF", "SWING", "FILL", "MUTE", "PATTERN"},
};

static const fmw_page_desc_t FMW_BASS808_PAGES[] = {
  {"osc", "OSC", "WAVE", "TUNE", "SUB", "DRIVE"},
  {"filter", "FILTER", "CUTOFF", "RESO", "ENV MOD", "ACCENT"},
  {"env", "ENV", "DECAY", "SLIDE", "GATE", "ACC DECAY"},
  {"seq", "SEQ", "STEP", "NOTE", "ACCENT", "SLIDE"},
  {"perf", "PERF", "TEMPO", "SWING", "PATTERN", "PLAY"},
};

static const fmw_page_desc_t FMW_ALPHA_PAGES[] = {
  {"dco", "DCO", "SAW", "PULSE", "SUB", "NOISE"},
  {"vcf", "VCF", "CUTOFF", "RESO", "ENV", "KEYTRACK"},
  {"vca", "VCA", "LEVEL", "ENV MODE", "VELOCITY", "CHORUS MIX"},
  {"env", "ENV", "ATTACK", "DECAY", "SUSTAIN", "RELEASE"},
  {"lfo", "LFO", "RATE", "DELAY", "DCO MOD", "VCF MOD"},
  {"chorus", "CHORUS", "MODE", "RATE", "DEPTH", "MIX"},
  {"seq", "SEQ", "STEP", "CHORD", "GATE", "PLAY"},
};

static const fmw_part_desc_t FMW_PARTS[FMW_PART_COUNT] = {
  {"mini", "MINI", "3 OSC / ladder mono", 1, 6, FMW_MINI_PAGES},
  {"drum808", "808 DRUM", "analog drum machine", 8, 5, FMW_DRUM808_PAGES},
  {"bass808", "808 BASS", "acid bassline", 1, 5, FMW_BASS808_PAGES},
  {"alpha", "ALPHA", "DCO poly synth", 6, 7, FMW_ALPHA_PAGES},
};
