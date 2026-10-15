#include "fm1_felucca_target.h"
#include "fm1_platform.h"
#include "fm1_audio.h"
#include "fm1_input.h"
#include "fm1_time.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

fm1_stub_input_state_t fm1_in;
uint32_t fm1_stub_note_pressed;
uint32_t fm1_stub_button_pressed;
uint32_t fm1_stub_button_released;
int32_t fm1_stub_enc_steps[7];
uint32_t fm1_stub_scan_count;
uint32_t fm1_stub_tick_count;
uint32_t fm1_stub_last_led_id;
int fm1_stub_last_led_on;
uint32_t fm1_stub_ticks;

uint8_t fm1_stub_audio_pending;
uint32_t fm1_stub_audio_free_half;
uint32_t fm1_stub_audio_ack_half_count;
uint32_t fm1_stub_audio_init_count;
uint32_t fm1_stub_audio_half_words;
int32_t *fm1_stub_audio_buffer;
void (*fm1_stub_audio_isr)(void);
uint32_t fm1_stub_audio_prio;
uint32_t fm1_stub_audio_stop_count;

static unsigned lcd_init_count;
static unsigned render_count;
static uint32_t render_ticks=1234u;
static fm1_audio_block_t last_render_block;

void fmm_felucca_lcd_init(void) { ++lcd_init_count; }
void fmm_felucca_lcd_begin(void) {}
void fmm_felucca_lcd_fill(uint16_t c) { (void)c; }
void fmm_felucca_lcd_rect(int x,int y,int w,int h,uint16_t c) { (void)x;(void)y;(void)w;(void)h;(void)c; }
void fmm_felucca_lcd_text(int x,int y,const char *t,uint16_t c) { (void)x;(void)y;(void)t;(void)c; }
void fmm_felucca_lcd_present(void) {}
void isr_alnk0(void) {}

static void render_test(fm1_audio_block_t *block, void *user) {
  (void)user;
  ++render_count;
  last_render_block=*block;
  assert(block->frames==128u);
  assert(block->samples==fm1_stub_audio_buffer+fm1_stub_audio_free_half*fm1_stub_audio_half_words);
  block->samples[0]=0x123400;
  fm1_stub_ticks+=render_ticks;
}

static void reset_stubs(void) {
  memset(&fm1_in,0,sizeof(fm1_in));
  fm1_stub_note_pressed=0u; fm1_stub_button_pressed=0u; fm1_stub_button_released=0u;
  memset(fm1_stub_enc_steps,0,sizeof(fm1_stub_enc_steps));
  fm1_stub_scan_count=0u; fm1_stub_tick_count=0u; fm1_stub_last_led_id=0u; fm1_stub_last_led_on=0;
  fm1_stub_ticks=0u;
  fm1_stub_audio_pending=0u; fm1_stub_audio_free_half=0u; fm1_stub_audio_ack_half_count=0u;
  fm1_stub_audio_init_count=0u; fm1_stub_audio_half_words=0u; fm1_stub_audio_buffer=0;
  fm1_stub_audio_isr=0; fm1_stub_audio_prio=0u; fm1_stub_audio_stop_count=0u;
  lcd_init_count=render_count=0u; render_ticks=1234u;
  memset(&last_render_block,0,sizeof(last_render_block));
}

int main(void) {
  reset_stubs();
  fm1_platform_init();
  assert(lcd_init_count==1u);
  assert(fm1_platform_millis()==0u);
  assert(fm1_felucca_flash_write_enabled()==0);
  assert(fm1_platform_flash_read(0u,0,0u)==-1);
  assert(fm1_platform_flash_write(0u,0,0u)==-1);

  fm1_in.notes=(1u<<2)|(1u<<5);
  fm1_in.buttons=(1u<<1)|(1u<<7);
  fm1_stub_note_pressed=(1u<<2)|(1u<<5);
  fm1_stub_button_pressed=(1u<<1)|(1u<<7);
  fm1_stub_enc_steps[0]=3;
  fm1_stub_enc_steps[3]=-4;
  fm1_stub_enc_steps[6]=2;

  fm1_input_frame_t frame;
  fm1_platform_poll_input(&frame);
  assert(fm1_stub_scan_count==1u);
  assert(frame.notes==((1u<<2)|(1u<<5)));
  assert(frame.note_pressed==((1u<<2)|(1u<<5)));
  assert(frame.note_released==0u);
#ifdef FMM_BUTTON_MAP_VERIFIED
  assert(frame.buttons==((1u<<FM1_KEY_OCT_UP)|(1u<<FM1_KEY_HOLD)));
  assert(frame.button_pressed==frame.buttons);
  assert(frame.encoder_delta[0]==3);
  assert(frame.encoder_delta[3]==-4);
#else
  assert(frame.buttons==((1u<<1)|(1u<<7)));
  assert(frame.button_pressed==frame.buttons);
  assert(frame.encoder_delta[0]==3);
  assert(frame.encoder_delta[3]==-4);
  assert(frame.encoder_delta[6]==2);
#endif

  fm1_in.notes=(1u<<5);
  fm1_in.buttons=(1u<<7);
  fm1_stub_button_released=(1u<<1);
  fm1_platform_poll_input(&frame);
  assert(frame.note_released==(1u<<2));
#ifdef FMM_BUTTON_MAP_VERIFIED
  assert(frame.button_released==(1u<<FM1_KEY_OCT_UP));
#else
  assert(frame.button_released==(1u<<1));
#endif

  fm1_platform_led_note(4u,1u);
  assert(fm1_stub_last_led_id==18u && fm1_stub_last_led_on==1);
  fm1_platform_led_button(3u,1u);
  assert(fm1_stub_last_led_id==3u && fm1_stub_last_led_on==1);

  fm1_felucca_set_audio_renderer(render_test,0);
  fm1_felucca_audio_start();
  assert(fm1_stub_audio_init_count==1u);
  assert(fm1_stub_audio_half_words==256u);
  assert(fm1_stub_audio_buffer!=0);
  assert(fm1_stub_audio_isr==isr_alnk0);
  assert(fm1_stub_audio_prio==3u);

  fm1_stub_audio_free_half=1u;
  fm1_stub_audio_pending=FM1_AUDIO_HALF;
  fm1_stub_ticks=5000u;
  fm1_alnk0_irq();
  assert(render_count==1u);
  assert(last_render_block.frames==128u);
  assert(fm1_stub_audio_ack_half_count==1u);

  fm1_felucca_audio_stats_t stats;
  fm1_felucca_audio_stats_get(&stats);
  assert(stats.irq_count==1u);
  assert(stats.last_ticks==1234u);
  assert(stats.max_ticks==1234u);
  assert(stats.over_budget_count==0u);

  render_ticks=FMM_AUDIO_HALF_BUDGET_TICKS+1u;
  fm1_stub_audio_pending=FM1_AUDIO_HALF;
  fm1_alnk0_irq();
  fm1_felucca_audio_stats_get(&stats);
  assert(stats.irq_count==2u);
  assert(stats.last_ticks==FMM_AUDIO_HALF_BUDGET_TICKS+1u);
  assert(stats.max_ticks==FMM_AUDIO_HALF_BUDGET_TICKS+1u);
  assert(stats.over_budget_count==1u);

  fm1_felucca_audio_stop();
  assert(fm1_stub_audio_stop_count==1u);

  printf("FMiniMug1 Felucca platform adapter tests passed%s\n",
#ifdef FMM_BUTTON_MAP_VERIFIED
         " (mapped)"
#else
         " (raw)"
#endif
  );
  return 0;
}
