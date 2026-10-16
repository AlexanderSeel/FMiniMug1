#include "fm_drum808.h"
#include <string.h>

static float clampf(float x,float lo,float hi){return x<lo?lo:(x>hi?hi:x);}
static float fast_tanh(float x){const float x2=x*x;return x*(27.0f+x2)/(27.0f+9.0f*x2);}
static float env_coeff(float seconds,float sr){if(seconds<=0.0f)return 1.0f;const float n=seconds*sr;return n<=1.0f?1.0f:1.0f/(n+1.0f);}
static float phase_sineish(float p){
  /* Cheap rounded triangle; intentionally no libm on the FM-1 hot path. */
  float t=p<0.5f?p*4.0f-1.0f:3.0f-p*4.0f;
  return t*(1.5f-0.5f*(t<0.0f?-t:t));
}
static float noise(fmd808_t *d){d->noise_state=1664525u*d->noise_state+1013904223u;return ((d->noise_state>>8)&0xFFFFFF)/8388607.5f-1.0f;}
static float step_phase(float *phase,float hz,float sr){*phase+=hz/sr;while(*phase>=1.0f)*phase-=1.0f;return *phase;}
static float decay_tick(float *env,float seconds,float sr){*env+=(0.0f-*env)*env_coeff(seconds,sr);if(*env<0.00001f)*env=0.0f;return *env;}

void fmd808_init(fmd808_t *d,float sample_rate){
  memset(d,0,sizeof(*d));d->sample_rate=sample_rate>1000.0f?sample_rate:44100.0f;d->noise_state=0x8081u;
  static const float level[FMD808_VOICE_COUNT]={.92f,.72f,.42f,.40f,.48f,.54f,.38f,.42f};
  static const float tune[FMD808_VOICE_COUNT]={52.0f,185.0f,7200.0f,6500.0f,1400.0f,120.0f,540.0f,480.0f};
  static const float decay[FMD808_VOICE_COUNT]={.34f,.20f,.055f,.34f,.22f,.32f,.17f,.075f};
  static const float tone[FMD808_VOICE_COUNT]={.55f,.65f,.72f,.68f,.62f,.55f,.60f,.70f};
  for(int i=0;i<FMD808_VOICE_COUNT;++i){d->kit.level[i]=level[i];d->kit.tune[i]=tune[i];d->kit.decay[i]=decay[i];d->kit.tone[i]=tone[i];}
  d->kit.accent_amount=.38f;d->kit.drive=1.15f;
}

void fmd808_set_kit(fmd808_t *d,const fmd808_kit_t *kit){if(d&&kit)d->kit=*kit;}

void fmd808_trigger(fmd808_t *d,fmd808_voice_id_t id,uint8_t velocity,uint8_t accent){
  if(!d||(unsigned)id>=FMD808_VOICE_COUNT)return;
  fmd808_voice_state_t *v=&d->voice[id];
  const float vel=clampf((float)velocity/127.0f,.02f,1.0f);
  v->velocity=clampf(vel+(accent?d->kit.accent_amount:0.0f),0.0f,1.35f);
  v->env=1.0f;v->aux_env=1.0f;v->pitch_env=1.0f;
  if(id==FMD808_CLAP)v->phase=0.0f;
}

float fmd808_process(fmd808_t *d){
  if(!d)return 0.0f;const float sr=d->sample_rate;float out=0.0f;

  /* Bass drum: resonant body with fast pitch drop and a tiny attack tick. */
  {
    fmd808_voice_state_t *v=&d->voice[FMD808_BD];
    if(v->env>0.0f){const float e=decay_tick(&v->env,d->kit.decay[FMD808_BD],sr);const float pe=decay_tick(&v->pitch_env,.055f,sr);const float hz=clampf(d->kit.tune[FMD808_BD]*(1.0f+pe*2.2f),28.0f,240.0f);float body=phase_sineish(step_phase(&v->phase,hz,sr));const float click=noise(d)*pe*.075f;out+=(body+click)*e*v->velocity*d->kit.level[FMD808_BD];}
  }

  /* Snare: two body modes + noisy snappy tail. */
  {
    fmd808_voice_state_t *v=&d->voice[FMD808_SD];
    if(v->env>0.0f){const float e=decay_tick(&v->env,d->kit.decay[FMD808_SD],sr);const float ne=decay_tick(&v->aux_env,d->kit.decay[FMD808_SD]*1.18f,sr);const float tune=clampf(d->kit.tune[FMD808_SD],90.0f,420.0f);const float b1=phase_sineish(step_phase(&v->phase,tune,sr));const float b2=phase_sineish(step_phase(&v->phase2,tune*1.47f,sr));const float n=noise(d);const float tone=clampf(d->kit.tone[FMD808_SD],0.0f,1.0f);out+=((b1*.35f+b2*.22f)*e+n*ne*(.28f+.55f*tone))*v->velocity*d->kit.level[FMD808_SD];}
  }

  /* Hats: six-pulse-ish metallic cluster plus high-pass-ish noise. */
  for(int id=FMD808_CH;id<=FMD808_OH;++id){fmd808_voice_state_t *v=&d->voice[id];if(v->env>0.0f){const float e=decay_tick(&v->env,d->kit.decay[id],sr);const float base=clampf(d->kit.tune[id],2500.0f,12000.0f);const float a=step_phase(&v->phase,base,sr)<.5f?1.0f:-1.0f;const float b=step_phase(&v->phase2,base*1.47f,sr)<.5f?1.0f:-1.0f;const float n=noise(d);const float metallic=(a+b*.73f+n*.42f)*.42f;out+=metallic*e*v->velocity*d->kit.level[id];}}

  /* Clap: four short noise bursts feeding a longer tail. */
  {
    fmd808_voice_state_t *v=&d->voice[FMD808_CLAP];
    if(v->env>0.0f){v->phase+=1.0f/sr;const float t=v->phase;const float burst=(t<.012f||(t>.022f&&t<.034f)||(t>.044f&&t<.057f)||(t>.070f&&t<.083f))?1.0f:.18f;const float e=decay_tick(&v->env,d->kit.decay[FMD808_CLAP],sr);out+=noise(d)*burst*e*v->velocity*d->kit.level[FMD808_CLAP];}
  }

  /* Tom/conga style decaying sine-ish body. */
  {
    fmd808_voice_state_t *v=&d->voice[FMD808_TOM];
    if(v->env>0.0f){const float e=decay_tick(&v->env,d->kit.decay[FMD808_TOM],sr);const float pe=decay_tick(&v->pitch_env,.08f,sr);const float hz=clampf(d->kit.tune[FMD808_TOM]*(1.0f+pe*.34f),55.0f,420.0f);out+=phase_sineish(step_phase(&v->phase,hz,sr))*e*v->velocity*d->kit.level[FMD808_TOM];}
  }

  /* Cowbell: detuned square pair. */
  {
    fmd808_voice_state_t *v=&d->voice[FMD808_COWBELL];
    if(v->env>0.0f){const float e=decay_tick(&v->env,d->kit.decay[FMD808_COWBELL],sr);const float base=clampf(d->kit.tune[FMD808_COWBELL],260.0f,1200.0f);const float a=step_phase(&v->phase,base,sr)<.5f?1.0f:-1.0f;const float b=step_phase(&v->phase2,base*1.54f,sr)<.5f?1.0f:-1.0f;out+=(a+b*.72f)*.38f*e*v->velocity*d->kit.level[FMD808_COWBELL];}
  }

  /* Rim: very short pitched click/noise composite. */
  {
    fmd808_voice_state_t *v=&d->voice[FMD808_RIM];
    if(v->env>0.0f){const float e=decay_tick(&v->env,d->kit.decay[FMD808_RIM],sr);const float hz=clampf(d->kit.tune[FMD808_RIM],220.0f,1800.0f);const float p=phase_sineish(step_phase(&v->phase,hz,sr));out+=(p*.55f+noise(d)*.28f)*e*v->velocity*d->kit.level[FMD808_RIM];}
  }

  return clampf(fast_tanh(out*clampf(d->kit.drive,.5f,3.0f)),-1.0f,1.0f);
}
