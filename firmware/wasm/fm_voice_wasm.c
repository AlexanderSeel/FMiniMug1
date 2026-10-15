#include "fm_voice.h"
#include "fm_params.h"
#include <stdint.h>

/* Small stable ABI used by the browser AudioWorklet. Keep this wrapper dumb:
 * all synthesis stays in fm_voice.c so host, browser and FM-1 exercise the same DSP.
 */
static fm_voice_t voice;
static float output[128];
static int initialized;

static fm_wave_t wave_from_number(float v) {
    int n = (int)v;
    if (n <= 0) return FM_WAVE_TRI;
    if (n == 1) return FM_WAVE_SAW;
    if (n == 2) return FM_WAVE_SQUARE;
    return FM_WAVE_PULSE;
}

__attribute__((visibility("default")))
void fmm_init(float sample_rate) {
    fm_voice_init(&voice, sample_rate);
    initialized = 1;
}

__attribute__((visibility("default")))
void fmm_reset(void) {
    float sr = voice.sample_rate > 1000.0f ? voice.sample_rate : 48000.0f;
    fm_voice_init(&voice, sr);
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
uintptr_t fmm_render(int frames) {
    if (!initialized) fmm_init(48000.0f);
    if (frames < 0) frames = 0;
    if (frames > 128) frames = 128;
    for (int i = 0; i < frames; ++i) output[i] = fm_voice_process(&voice);
    return (uintptr_t)output;
}
