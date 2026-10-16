#pragma once
#include <stdint.h>

typedef enum {
  FMD808_BD = 0,
  FMD808_SD,
  FMD808_CH,
  FMD808_OH,
  FMD808_CLAP,
  FMD808_TOM,
  FMD808_COWBELL,
  FMD808_RIM,
  FMD808_VOICE_COUNT
} fmd808_voice_id_t;

typedef struct {
  float level[FMD808_VOICE_COUNT];
  float tune[FMD808_VOICE_COUNT];
  float decay[FMD808_VOICE_COUNT];
  float tone[FMD808_VOICE_COUNT];
  float accent_amount;
  float drive;
} fmd808_kit_t;

typedef struct {
  float phase;
  float phase2;
  float env;
  float aux_env;
  float pitch_env;
  float velocity;
} fmd808_voice_state_t;

typedef struct {
  float sample_rate;
  fmd808_kit_t kit;
  fmd808_voice_state_t voice[FMD808_VOICE_COUNT];
  uint32_t noise_state;
  float hp_state;
  float hp_input;
} fmd808_t;

void fmd808_init(fmd808_t *drum, float sample_rate);
void fmd808_set_kit(fmd808_t *drum, const fmd808_kit_t *kit);
void fmd808_trigger(fmd808_t *drum, fmd808_voice_id_t voice, uint8_t velocity, uint8_t accent);
float fmd808_process(fmd808_t *drum);
