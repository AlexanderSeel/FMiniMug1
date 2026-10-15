#include "fm_voice.h"
#include "fm_seq.h"
#include "fm_params.h"
#include <stdint.h>

/* Stable browser ABI. Synthesis and sequencer timing remain in portable C so
 * browser and FM-1 can share the same oscillator/filter/envelope/clock path. */
static fm_voice_t voice;
static fm_seq_t sequencer;
static float output[128];
static int initialized;

static fm_wave_t wave_from_number(float v) {
    int n = (int)v;
    if (n <= 0) return FM_WAVE_TRI;
    if (n == 1) return FM_WAVE_SAW;
    if (n == 2) return FM_WAVE_SQUARE;
    return FM_WAVE_PULSE;
}

static uint8_t range_from_number(float v) {
    int n = (int)v;
    if (n < FM_RANGE_32) n = FM_RANGE_32;
    if (n > FM_RANGE_2) n = FM_RANGE_2;
    return (uint8_t)n;
}

static void sequence_event(const fm_seq_event_t *event, void *user) {
    (void)user;
    if (event->type == FM_SEQ_EVENT_NOTE_ON) fm_voice_note_on(&voice, event->note, event->velocity);
    else if (event->type == FM_SEQ_EVENT_NOTE_OFF) fm_voice_note_off(&voice);
}

__attribute__((visibility("default")))
void fmm_init(float sample_rate) {
    fm_voice_init(&voice, sample_rate);
    fm_seq_init(&sequencer, sample_rate);
    initialized = 1;
}

__attribute__((visibility("default")))
void fmm_reset(void) {
    float sr = voice.sample_rate > 1000.0f ? voice.sample_rate : 48000.0f;
    fm_voice_init(&voice, sr);
    fm_seq_init(&sequencer, sr);
    initialized = 1;
}

__attribute__((visibility("default")))
void fmm_set_param(int id, float value) {
    if (!initialized) fmm_init(48000.0f);
    switch ((fmm_param_id_t)id) {
        case FMM_OSC1_LEVEL: voice.patch.osc[0].level = value; break;
        case FMM_OSC2_LEVEL: voice.patch.osc[1].level = value; break;
        case FMM_OSC3_LEVEL: voice.patch.osc[2].level = value; break;
        case FMM_OSC1_WAVE: voice.patch.osc[0].wave = wave_from_number(value); break;
        case FMM_OSC2_WAVE: voice.patch.osc[1].wave = wave_from_number(value); break;
        case FMM_OSC3_WAVE: voice.patch.osc[2].wave = wave_from_number(value); break;
        case FMM_OSC1_SEMITONES: voice.patch.osc[0].coarse_semitones = value; break;
        case FMM_OSC2_SEMITONES: voice.patch.osc[1].coarse_semitones = value; break;
        case FMM_OSC3_SEMITONES: voice.patch.osc[2].coarse_semitones = value; break;
        case FMM_CUTOFF_HZ: voice.patch.cutoff_hz = value; break;
        case FMM_RESONANCE: voice.patch.resonance = value; break;
        case FMM_FILTER_ENV: voice.patch.filter_env_amount = value; break;
        case FMM_ATTACK: voice.patch.attack_s = value; break;
        case FMM_DECAY: voice.patch.decay_s = value; break;
        case FMM_SUSTAIN: voice.patch.sustain = value; break;
        case FMM_RELEASE: voice.patch.release_s = value; break;
        case FMM_GLIDE: voice.patch.glide_s = value; break;
        case FMM_MIXER_DRIVE: voice.patch.mixer_drive = value; break;
        case FMM_FILTER_DRIVE: voice.patch.filter_drive = value; break;
        case FMM_DRIFT: voice.patch.drift = value; break;
        case FMM_FEEDBACK: voice.patch.feedback = value; break;
        case FMM_FILTER_KEYTRACK: voice.patch.filter_keytrack = (uint8_t)value; break;
        case FMM_OVERSAMPLE_2X: voice.patch.oversample_2x = value >= 0.5f; break;
        case FMM_OSC1_RANGE: voice.patch.osc[0].range = range_from_number(value); break;
        case FMM_OSC2_RANGE: voice.patch.osc[1].range = range_from_number(value); break;
        case FMM_OSC3_RANGE: voice.patch.osc[2].range = range_from_number(value); break;
        case FMM_FILTER_ATTACK: voice.patch.filter_attack_s = value; break;
        case FMM_FILTER_DECAY: voice.patch.filter_decay_s = value; break;
        case FMM_FILTER_SUSTAIN: voice.patch.filter_sustain = value; break;
        case FMM_FILTER_RELEASE: voice.patch.filter_release_s = value; break;
        case FMM_RETRIGGER: voice.patch.retrigger = value >= 0.5f; break;
        case FMM_PARAM_COUNT: break;
    }
}

__attribute__((visibility("default")))
void fmm_note_on(int note, int velocity) {
    if (!initialized) fmm_init(48000.0f);
    if (note < 0) note = 0;
    if (note > 127) note = 127;
    if (velocity < 1) velocity = 1;
    if (velocity > 127) velocity = 127;
    fm_voice_note_on(&voice, (uint8_t)note, (uint8_t)velocity);
}

__attribute__((visibility("default")))
void fmm_note_off(void) {
    fm_voice_note_off(&voice);
}

__attribute__((visibility("default")))
void fmm_seq_clear(void) {
    if (!initialized) fmm_init(48000.0f);
    fm_seq_pattern_t p;
    p.length = 16u;
    p.bpm = 120u;
    p.swing = 0u;
    for (uint8_t i = 0; i < FM_SEQ_MAX_STEPS; ++i) {
        p.steps[i].note = -1;
        p.steps[i].transpose = 0;
        p.steps[i].velocity = 100u;
        p.steps[i].gate_percent = 70u;
        p.steps[i].flags = 0u;
    }
    fm_seq_set_pattern(&sequencer, &p);
}

__attribute__((visibility("default")))
void fmm_seq_set_meta(int length, int bpm, int swing) {
    if (!initialized) fmm_init(48000.0f);
    if (length < 1) length = 1;
    if (length > (int)FM_SEQ_MAX_STEPS) length = FM_SEQ_MAX_STEPS;
    if (bpm < 40) bpm = 40;
    if (bpm > 300) bpm = 300;
    if (swing < 0) swing = 0;
    if (swing > 100) swing = 100;
    sequencer.pattern.length = (uint8_t)length;
    sequencer.pattern.bpm = (uint16_t)bpm;
    sequencer.pattern.swing = (uint8_t)swing;
}

__attribute__((visibility("default")))
void fmm_seq_set_step(int index, int note, int transpose, int velocity, int gate_percent, int flags) {
    if (!initialized) fmm_init(48000.0f);
    if (index < 0 || index >= (int)FM_SEQ_MAX_STEPS) return;
    if (note < -1) note = -1;
    if (note > 127) note = 127;
    if (transpose < -48) transpose = -48;
    if (transpose > 48) transpose = 48;
    if (velocity < 1) velocity = 1;
    if (velocity > 127) velocity = 127;
    if (gate_percent < 1) gate_percent = 1;
    if (gate_percent > 100) gate_percent = 100;
    fm_seq_step_t *step = &sequencer.pattern.steps[index];
    step->note = (int8_t)note;
    step->transpose = (int8_t)transpose;
    step->velocity = (uint8_t)velocity;
    step->gate_percent = (uint8_t)gate_percent;
    step->flags = (uint8_t)flags;
}

__attribute__((visibility("default")))
void fmm_seq_start(void) {
    if (!initialized) fmm_init(48000.0f);
    fm_seq_start(&sequencer);
}

__attribute__((visibility("default")))
void fmm_seq_stop(void) {
    fm_seq_stop(&sequencer);
    fm_voice_note_off(&voice);
}

__attribute__((visibility("default")))
int fmm_seq_step(void) {
    return (int)sequencer.step_index;
}

__attribute__((visibility("default")))
uintptr_t fmm_render(int frames) {
    if (!initialized) fmm_init(48000.0f);
    if (frames < 0) frames = 0;
    if (frames > 128) frames = 128;
    for (int i = 0; i < frames; ++i) {
        fm_seq_process(&sequencer, 1u, sequence_event, 0);
        output[i] = fm_voice_process(&voice);
    }
    return (uintptr_t)output;
}
