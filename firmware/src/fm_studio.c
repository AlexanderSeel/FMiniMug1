#include "fm_studio.h"
#include <string.h>

#define COL_BG 0x1082u
#define COL_PANEL 0x2945u
#define COL_TEXT 0xFFFFu
#define COL_DIM 0xBDF7u
#define COL_ACCENT 0xFBE0u
#define COL_RED 0xF800u

static float clampf(float x,float lo,float hi){return x<lo?lo:(x>hi?hi:x);} 
static int pressed(const fm1_input_frame_t *in,fm1_button_t b){return (in->button_pressed&(1u<<(unsigned)b))!=0;}
static int down(const fm1_input_frame_t *in,fm1_button_t b){return (in->buttons&(1u<<(unsigned)b))!=0;}
static float absf(float x){return x<0.0f?-x:x;}

static void put_uint(char *dst,unsigned cap,unsigned value,const char *suffix){
  char tmp[12];unsigned n=0,p=0;
  if(!cap)return;
  do{tmp[n++]=(char)('0'+value%10u);value/=10u;}while(value&&n<sizeof(tmp));
  while(n&&p+1<cap)dst[p++]=tmp[--n];
  while(*suffix&&p+1<cap)dst[p++]=*suffix++;
  dst[p]=0;
}

static const char *page_name(fm_studio_page_t page){
  static const char *names[]={"LAYER","DRUM","FX"};
  return names[(unsigned)page<FM_STUDIO_PAGE_COUNT?page:0];
}
static const char *character_name(uint8_t c){
  static const char *names[]={"CLEAN","CLASSIC","AGED","HOT","BROKEN"};
  return names[c<5u?c:1u];
}

void fm_studio_init(fm_studio_t *s,float sample_rate){
  memset(s,0,sizeof(*s));
  s->sample_rate=sample_rate;
  s->page=FM_STUDIO_LAYER;
  s->layer_enabled=1u;
  s->drums_enabled=1u;
  s->character=1u;
  s->layer_level=0.34f;
  s->drum_level=0.34f;
  s->delay_mix=0.12f;
  s->delay_feedback=0.26f;
  s->drive=1.08f;
  s->kick_tone=58.0f;
  s->hat_tone=0.55f;
  s->tempo_bpm=120u;
  s->noise_state=0x31415926u;
  fm_voice_init(&s->voice_b,sample_rate);
  s->voice_b.patch.osc[0].wave=FM_WAVE_SAW;
  s->voice_b.patch.osc[1].wave=FM_WAVE_TRI;
  s->voice_b.patch.osc[2].wave=FM_WAVE_SQUARE;
  s->voice_b.patch.osc[0].level=0.52f;
  s->voice_b.patch.osc[1].level=0.28f;
  s->voice_b.patch.osc[2].level=0.16f;
  s->voice_b.patch.osc[1].fine_cents=7.0f;
  s->voice_b.patch.osc[2].coarse_semitones=-12.0f;
  s->voice_b.patch.cutoff_hz=1650.0f;
  s->voice_b.patch.resonance=0.28f;
  s->voice_b.patch.filter_env_amount=2200.0f;
  s->voice_b.patch.attack_s=0.012f;
  s->voice_b.patch.decay_s=0.34f;
  s->voice_b.patch.sustain=0.52f;
  s->voice_b.patch.release_s=0.34f;
  s->voice_b.patch.oversample_2x=0u;
  fm_voice_set_patch(&s->voice_b,&s->voice_b.patch);
}

int fm_studio_handle_input(fm_studio_t *s,const fm1_input_frame_t *in){
  if(!s||!in)return 0;
  if(down(in,FM1_KEY_HOLD)&&pressed(in,FM1_KEY_PATTERN)){
    s->active=(uint8_t)!s->active;
    return 1;
  }
  if(!s->active)return 0;
  if(pressed(in,FM1_KEY_PAGE_LEFT))s->page=(fm_studio_page_t)((s->page+FM_STUDIO_PAGE_COUNT-1)%FM_STUDIO_PAGE_COUNT);
  if(pressed(in,FM1_KEY_PAGE_RIGHT))s->page=(fm_studio_page_t)((s->page+1)%FM_STUDIO_PAGE_COUNT);
  const int d0=in->encoder_delta[0],d1=in->encoder_delta[1],d2=in->encoder_delta[2],d3=in->encoder_delta[3];
  if(s->page==FM_STUDIO_LAYER){
    s->layer_level=clampf(s->layer_level+d0*0.02f,0.0f,0.9f);
    s->voice_b.patch.cutoff_hz=clampf(s->voice_b.patch.cutoff_hz+d1*45.0f,80.0f,12000.0f);
    s->voice_b.patch.osc[1].fine_cents=clampf(s->voice_b.patch.osc[1].fine_cents+d2, -50.0f,50.0f);
    s->voice_b.patch.resonance=clampf(s->voice_b.patch.resonance+d3*0.015f,0.0f,0.92f);
    if(pressed(in,FM1_KEY_ENCODER_4))s->layer_enabled=(uint8_t)!s->layer_enabled;
  }else if(s->page==FM_STUDIO_DRUM){
    s->drum_level=clampf(s->drum_level+d0*0.02f,0.0f,0.9f);
    s->kick_tone=clampf(s->kick_tone+d1*1.5f,38.0f,110.0f);
    s->hat_tone=clampf(s->hat_tone+d2*0.025f,0.1f,1.0f);
    {int bpm=(int)s->tempo_bpm+d3;if(bpm<40)bpm=40;if(bpm>240)bpm=240;s->tempo_bpm=(uint16_t)bpm;}
    if(pressed(in,FM1_KEY_ENCODER_4))s->drums_enabled=(uint8_t)!s->drums_enabled;
  }else{
    s->delay_mix=clampf(s->delay_mix+d0*0.015f,0.0f,0.65f);
    s->delay_feedback=clampf(s->delay_feedback+d1*0.015f,0.0f,0.78f);
    s->drive=clampf(s->drive+d2*0.04f,0.7f,3.8f);
    if(d3){int c=(int)s->character+(d3>0?1:-1);if(c<0)c=0;if(c>4)c=4;s->character=(uint8_t)c;}
  }
  fm_voice_set_patch(&s->voice_b,&s->voice_b.patch);
  return 1;
}

void fm_studio_note_on(fm_studio_t *s,uint8_t note,uint8_t velocity){if(s&&s->layer_enabled)fm_voice_note_on(&s->voice_b,note,velocity);}
void fm_studio_note_off(fm_studio_t *s,uint8_t note){if(s&&s->layer_enabled)fm_voice_note_off_note(&s->voice_b,note);}

void fm_studio_trigger_step(fm_studio_t *s,uint8_t step){
  if(!s||!s->drums_enabled)return;
  s->drum_step=(uint8_t)(step&15u);
  if((0x1911u>>s->drum_step)&1u)s->kick_env=1.0f; /* 0,4,8,11,12 */
  if((0x1010u>>s->drum_step)&1u)s->snare_env=1.0f; /* 4,12 */
  if((0x5555u>>s->drum_step)&1u)s->hat_env=0.72f;
}

static float drum_sample(fm_studio_t *s){
  s->noise_state=s->noise_state*1664525u+1013904223u;
  const float noise=((float)((s->noise_state>>16)&0xffffu)/32768.0f)-1.0f;
  float kick=0.0f;
  if(s->kick_env>0.0002f){
    s->kick_phase+=s->kick_tone/s->sample_rate;
    if(s->kick_phase>=1.0f)s->kick_phase-=1.0f;
    kick=(1.0f-4.0f*absf(s->kick_phase-0.5f))*s->kick_env;
    s->kick_env*=0.99935f;
  }
  float snare=noise*s->snare_env*0.58f;s->snare_env*=0.9983f;
  float hat=noise*s->hat_env*(0.16f+0.32f*s->hat_tone);s->hat_env*=0.9940f;
  return kick*0.72f+snare+hat;
}

float fm_studio_process(fm_studio_t *s,float synth_a){
  if(!s)return synth_a;
  const float b=s->layer_enabled?fm_voice_process(&s->voice_b)*s->layer_level:0.0f;
  const float d=s->drums_enabled?drum_sample(s)*s->drum_level:0.0f;
  float x=synth_a+b+d;
  const float char_drive[]={0.86f,1.0f,1.18f,1.55f,2.05f};
  x*=s->drive*char_drive[s->character<5u?s->character:1u];
  x=clampf(x,-1.45f,1.45f);
  x=x-0.14f*x*x*x;
  const float delayed=(float)s->delay_buffer[s->delay_pos]/32768.0f;
  const float out=clampf(x+delayed*s->delay_mix,-1.0f,1.0f);
  const float write=clampf(x+delayed*s->delay_feedback,-1.0f,1.0f);
  s->delay_buffer[s->delay_pos]=(int16_t)(write*32767.0f);
  s->delay_pos=(uint16_t)((s->delay_pos+1u)&2047u);
  return out;
}

static void value_box(int x,int y,const char *label,const char *value,int on){
  fm1_platform_lcd_rect(x,y,104,58,on?COL_ACCENT:COL_PANEL);
  fm1_platform_lcd_text(x+5,y+5,label,COL_DIM);
  fm1_platform_lcd_text(x+5,y+31,value,on?COL_ACCENT:COL_TEXT);
}

void fm_studio_render(const fm_studio_t *s){
  if(!s||!s->active)return;
  char a[16],b[16],c[16],d[16];
  fm1_platform_lcd_begin();fm1_platform_lcd_fill(COL_BG);
  fm1_platform_lcd_text(8,8,"FMiniMug1 / STUDIO HW",COL_ACCENT);
  fm1_platform_lcd_text(8,28,page_name(s->page),COL_TEXT);
  fm1_platform_lcd_text(8,47,"HOLD+PATTERN = CLASSIC",COL_DIM);
  if(s->page==FM_STUDIO_LAYER){
    put_uint(a,sizeof(a),(unsigned)(s->layer_level*100.0f),"%");
    put_uint(b,sizeof(b),(unsigned)s->voice_b.patch.cutoff_hz,"Hz");
    put_uint(c,sizeof(c),(unsigned)(s->voice_b.patch.osc[1].fine_cents+50.0f),"");
    put_uint(d,sizeof(d),(unsigned)(s->voice_b.patch.resonance*100.0f),"%");
    value_box(8,72,"E1 B LEVEL",a,s->layer_enabled);value_box(126,72,"E2 CUTOFF",b,0);
    value_box(8,142,"E3 DETUNE",c,0);value_box(126,142,"E4 RES / PRESS",d,s->layer_enabled);
    fm1_platform_lcd_text(8,216,s->layer_enabled?"LAYER B ON":"LAYER B MUTED",s->layer_enabled?COL_ACCENT:COL_RED);
  }else if(s->page==FM_STUDIO_DRUM){
    put_uint(a,sizeof(a),(unsigned)(s->drum_level*100.0f),"%");put_uint(b,sizeof(b),(unsigned)s->kick_tone,"Hz");
    put_uint(c,sizeof(c),(unsigned)(s->hat_tone*100.0f),"%");put_uint(d,sizeof(d),(unsigned)s->tempo_bpm," BPM");
    value_box(8,72,"E1 DRUM LVL",a,s->drums_enabled);value_box(126,72,"E2 KICK",b,0);
    value_box(8,142,"E3 HAT",c,0);value_box(126,142,"E4 TEMPO/PRESS",d,s->drums_enabled);
    fm1_platform_lcd_text(8,216,s->drums_enabled?"ANALOG DRUMS ON":"DRUMS MUTED",s->drums_enabled?COL_ACCENT:COL_RED);
  }else{
    put_uint(a,sizeof(a),(unsigned)(s->delay_mix*100.0f),"%");put_uint(b,sizeof(b),(unsigned)(s->delay_feedback*100.0f),"%");
    put_uint(c,sizeof(c),(unsigned)(s->drive*100.0f),"%");
    value_box(8,72,"E1 DELAY",a,0);value_box(126,72,"E2 FEEDBACK",b,0);
    value_box(8,142,"E3 DRIVE",c,0);value_box(126,142,"E4 CHARACTER",character_name(s->character),1);
    fm1_platform_lcd_text(8,216,"COMPACT HW FX / 2048 TAP",COL_DIM);
  }
  fm1_platform_lcd_present();
}
