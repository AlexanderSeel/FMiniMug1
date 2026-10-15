#pragma once
#include <stdint.h>
#define FM1_AUDIO_HALF 0x80u
static inline void fm1_audio_init(int32_t *buf,uint32_t half_words,void (*isr)(void),uint32_t prio){(void)buf;(void)half_words;(void)isr;(void)prio;}
static inline void fm1_audio_stop(void){}
static inline uint8_t fm1_audio_pending(void){return 0u;}
static inline void fm1_audio_ack_aux(uint8_t p){(void)p;}
static inline uint32_t fm1_audio_free_half(void){return 0u;}
static inline void fm1_audio_ack_half(void){}
