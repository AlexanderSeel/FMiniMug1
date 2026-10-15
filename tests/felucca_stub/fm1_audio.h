#pragma once
#include <stdint.h>
#define FM1_AUDIO_HALF 0x80u

extern uint8_t fm1_stub_audio_pending;
extern uint32_t fm1_stub_audio_free_half;
extern uint32_t fm1_stub_audio_ack_half_count;
extern uint32_t fm1_stub_audio_init_count;
extern uint32_t fm1_stub_audio_half_words;
extern int32_t *fm1_stub_audio_buffer;
extern void (*fm1_stub_audio_isr)(void);
extern uint32_t fm1_stub_audio_prio;
extern uint32_t fm1_stub_audio_stop_count;

static inline void fm1_audio_init(int32_t *buf,uint32_t half_words,void (*isr)(void),uint32_t prio){
  fm1_stub_audio_buffer=buf;
  fm1_stub_audio_half_words=half_words;
  fm1_stub_audio_isr=isr;
  fm1_stub_audio_prio=prio;
  ++fm1_stub_audio_init_count;
}
static inline void fm1_audio_stop(void){++fm1_stub_audio_stop_count;}
static inline uint8_t fm1_audio_pending(void){return fm1_stub_audio_pending;}
static inline void fm1_audio_ack_aux(uint8_t p){(void)p;}
static inline uint32_t fm1_audio_free_half(void){return fm1_stub_audio_free_half;}
static inline void fm1_audio_ack_half(void){++fm1_stub_audio_ack_half_count;fm1_stub_audio_pending&=(uint8_t)~FM1_AUDIO_HALF;}
