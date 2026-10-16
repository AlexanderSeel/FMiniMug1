#include "fm_bass808.h"
#include <string.h>

#define FMB808_LN2 0.69314718055994530942f

static float clampf(float x,float lo,float hi){return x<lo?lo:(x>hi?hi:x);}
static float fast_tanh(float x){const float x2=x*x;return x*(27.0f+x2)/(27.0f+9.0f*x2);}
static float fast_exp2(float x){int i=(int)x;const float f=x-(float)i;const float p=1.0f+f*(FMB808_LN2+f*(0.24022651f+f*0.05550411f));float scale=1.0f;if(i>=0)while(i-->0)scale*=2.0f;else while(i++<0)scale*=0.5f;return p*scale;}
static float midi_hz(uint8_t n){static const float base[12]={8.1757989f,8.6619572f,9.1770240f,9.7227182f,10.300861f,10.913382f,11.562326f,12.249857f,12.978272f,13.750000f,14.567618f,15.433853f};float hz=base[n%12u];for(uint8_t oct=n/12u;oct>0u;--oct)hz*=2.0f;return hz;}
static float coeff(float seconds,float sr){if(seconds<=0.0f)return 1.0f;const float n=seconds*sr;return n<=1.0f?1.0f:1.0f/(n+1.0f);}

void fmb808_init(fmb808_t *v,float sample_rate){
  memset(v,0,sizeof(*v));v->sample_rate=sample_rate>1000.0f?sample_rate:44100.0f;
  v->patch.wave=FMB808_SAW;v->patch.tune_semitones=0.0f;v->patch.sub_level=0.12f;v->patch.drive=1.35f;
  v->patch.cutoff_hz=640.0f;v->patch.resonance=0.62f;v->patch.env_mod_hz=2200.0f;v->patch.decay_s=0.28f;
  v->patch.slide_s=0.085f;v->patch.accent_amount=0.62f;v->patch.accent_decay_s=0.16f;
  v->current_freq=v->target_freq=midi_hz(36u);
}

void fmb808_set_patch(fmb808_t *v,const fmb808_patch_t *patch){if(v&&patch)v->patch=*patch;}

void fmb808_note_on(fmb808_t *v,uint8_t note,uint8_t accent,uint8_t slide){
  if(!v)return;v->current_note=note;
  v->target_freq=midi_hz(note)*fast_exp2(v->patch.tune_semitones/12.0f);
  v->sliding=slide?1u:0u;
  if(!slide){v->current_freq=v->target_freq;v->env=1.0f;v->accent_env=accent?1.0f:0.0f;}
  else if(accent&&v->accent_env<0.55f)v->accent_env=0.55f;
  v->gate=1.0f;
}

void fmb808_note_off(fmb808_t *v){if(v)v->gate=0.0f;}

float fmb808_process(fmb808_t *v){
  if(!v)return 0.0f;const float sr=v->sample_rate;
  if(v->sliding){const float k=coeff(v->patch.slide_s,sr);v->current_freq+=(v->target_freq-v->current_freq)*k;if((v->current_freq>v->target_freq?v->current_freq-v->target_freq:v->target_freq-v->current_freq)<0.001f){v->current_freq=v->target_freq;v->sliding=0u;}}
  else v->current_freq=v->target_freq;

  v->phase+=v->current_freq/sr;if(v->phase>=1.0f)v->phase-=1.0f;
  v->sub_phase+=v->current_freq*0.5f/sr;if(v->sub_phase>=1.0f)v->sub_phase-=1.0f;
  const float osc=v->patch.wave==FMB808_SQUARE?(v->phase<0.5f?1.0f:-1.0f):(2.0f*v->phase-1.0f);
  const float sub=v->sub_phase<0.5f?1.0f:-1.0f;
  float input=osc+sub*clampf(v->patch.sub_level,0.0f,0.7f);

  v->env+=(0.0f-v->env)*coeff(v->patch.decay_s,sr);
  v->accent_env+=(0.0f-v->accent_env)*coeff(v->patch.accent_decay_s,sr);
  if(v->env<0.00001f)v->env=0.0f;if(v->accent_env<0.00001f)v->accent_env=0.0f;

  const float accent=clampf(v->accent_env*v->patch.accent_amount,0.0f,1.25f);
  float cutoff=v->patch.cutoff_hz+v->env*v->patch.env_mod_hz*(1.0f+accent*0.7f);
  cutoff=clampf(cutoff,35.0f,sr*0.42f);
  const float g=clampf(cutoff/sr*2.2f,0.001f,0.82f);
  const float res=clampf(v->patch.resonance,0.0f,1.0f)*3.75f;
  float x=fast_tanh((input-v->filter[3]*res)*clampf(v->patch.drive+accent*0.8f,0.5f,4.0f));
  for(int i=0;i<4;++i){const float prev=i? v->filter[i-1]:x;v->filter[i]+=g*(fast_tanh(prev)-fast_tanh(v->filter[i]));}
  const float amp=(v->gate?0.62f:0.0f)+accent*0.24f;
  return clampf(v->filter[3]*amp,-1.0f,1.0f);
}
