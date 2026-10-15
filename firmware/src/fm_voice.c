#include "fm_voice.h"
#include <math.h>
#include <string.h>

static float clampf(float x,float lo,float hi){return x<lo?lo:(x>hi?hi:x);} 
static float midi_hz(uint8_t n){return 440.0f*powf(2.0f,((float)n-69.0f)/12.0f);} 
static float fast_tanh(float x){const float x2=x*x;return x*(27.0f+x2)/(27.0f+9.0f*x2);} 
static float rnd(fm_voice_t *v){v->rng=1664525u*v->rng+1013904223u;return ((v->rng>>8)&0xFFFFFF)/8388607.5f-1.0f;} 
static float osc_sample(fm_wave_t w,float p){switch(w){case FM_WAVE_TRI:return 1.0f-4.0f*fabsf(p-.5f);case FM_WAVE_SQUARE:return p<.5f?1.0f:-1.0f;case FM_WAVE_PULSE:return p<.25f?1.0f:-1.0f;case FM_WAVE_SAW:default:return 2.0f*p-1.0f;}}

void fm_voice_init(fm_voice_t *v,float sample_rate){memset(v,0,sizeof(*v));v->sample_rate=sample_rate;v->rng=0x51F17A1u;v->patch.cutoff_hz=1000.0f;v->patch.resonance=.2f;v->patch.attack_s=.005f;v->patch.decay_s=.3f;v->patch.sustain=.6f;v->patch.release_s=.25f;v->patch.mixer_drive=1.4f;v->patch.filter_drive=1.1f;for(int i=0;i<3;i++){v->patch.osc[i].wave=FM_WAVE_SAW;v->patch.osc[i].level=i==0?.8f:.35f;v->patch.osc[i].keyboard_track=1;}}
void fm_voice_set_patch(fm_voice_t *v,const fm_patch_t *p){v->patch=*p;}
void fm_voice_note_on(fm_voice_t *v,uint8_t note,uint8_t velocity){float base=midi_hz(note);for(int i=0;i<3;i++){const fm_osc_params_t *o=&v->patch.osc[i];float st=o->coarse_semitones+o->fine_cents/100.0f;v->target_freq[i]=(o->keyboard_track?base:440.0f)*powf(2.0f,st/12.0f);if(o->low_mode)v->target_freq[i]*=.01f;if(v->freq[i]<=0.0f)v->freq[i]=v->target_freq[i];}v->gate=clampf((float)velocity/127.0f,.05f,1.0f);}
void fm_voice_note_off(fm_voice_t *v){v->gate=0.0f;}

float fm_voice_process(fm_voice_t *v){const float sr=v->sample_rate>1000?v->sample_rate:48000.0f;const float atk=1.0f/fmaxf(1.0f,v->patch.attack_s*sr),dec=1.0f/fmaxf(1.0f,v->patch.decay_s*sr),rel=1.0f/fmaxf(1.0f,v->patch.release_s*sr);if(v->gate>0){v->env_amp += (1.0f-v->env_amp)*atk; if(v->env_amp>v->patch.sustain)v->env_amp += (v->patch.sustain-v->env_amp)*dec;}else v->env_amp += (0-v->env_amp)*rel;v->env_filter=v->env_amp;
 float mix=0.0f;for(int i=0;i<3;i++){float glide=v->patch.glide_s<=0?1.0f:1.0f/fmaxf(1.0f,v->patch.glide_s*sr);v->drift_state[i]=v->drift_state[i]*.99995f+rnd(v)*.00005f;float drift_cents=v->drift_state[i]*v->patch.drift*7.0f;float tf=v->target_freq[i]*powf(2.0f,drift_cents/1200.0f);v->freq[i]+=(tf-v->freq[i])*glide;v->phase[i]+=v->freq[i]/sr;if(v->phase[i]>=1.0f)v->phase[i]-=1.0f;mix+=osc_sample(v->patch.osc[i].wave,v->phase[i])*v->patch.osc[i].level;}mix+=v->ladder[3]*v->patch.feedback*.35f;mix=fast_tanh(mix*v->patch.mixer_drive);
 float cutoff=clampf(v->patch.cutoff_hz+v->patch.filter_env_amount*v->env_filter,20.0f,sr*.42f);float g=1.0f-expf(-6.2831853f*cutoff/sr);float feedback=clampf(v->patch.resonance,0,1)*4.0f;float x=fast_tanh((mix-feedback*v->ladder[3])*v->patch.filter_drive);for(int i=0;i<4;i++){float in=i==0?x:v->ladder[i-1];v->ladder[i]+=g*(fast_tanh(in)-fast_tanh(v->ladder[i]));}return clampf(v->ladder[3]*v->env_amp,-1,1);}
