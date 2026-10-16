#include <assert.h>
#include <math.h>
#include <stdio.h>
#include "fm_bass808.h"

static float absf(float x){return x<0.0f?-x:x;}

int main(void){
  fmb808_t v;fmb808_init(&v,44117.647f);
  fmb808_note_on(&v,36u,0u,0u);
  float peak=0.0f;
  for(int i=0;i<44118;++i){float s=fmb808_process(&v);assert(isfinite(s));assert(s>=-1.001f&&s<=1.001f);if(absf(s)>peak)peak=absf(s);}
  assert(peak>0.01f);

  const float env_before=v.env;
  fmb808_note_on(&v,48u,0u,1u);
  assert(v.sliding==1u);
  assert(v.env<=env_before+0.0001f); /* slide must not restart the contour */
  const float start=v.current_freq;
  for(int i=0;i<2048;++i)(void)fmb808_process(&v);
  assert(v.current_freq>start);
  assert(v.current_freq<v.target_freq+0.01f);

  fmb808_note_on(&v,43u,1u,0u);
  assert(v.accent_env>0.99f);
  float accent_peak=0.0f;
  for(int i=0;i<4096;++i){float s=fmb808_process(&v);assert(isfinite(s));if(absf(s)>accent_peak)accent_peak=absf(s);}
  assert(accent_peak>0.01f);

  fmb808_note_off(&v);
  for(int i=0;i<64;++i)assert(isfinite(fmb808_process(&v)));
  puts("bass808 ok");
  return 0;
}
