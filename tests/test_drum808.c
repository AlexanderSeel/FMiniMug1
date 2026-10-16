#include <assert.h>
#include <math.h>
#include <stdio.h>
#include "fm_drum808.h"

static float absf(float x){return x<0.0f?-x:x;}

int main(void){
  fmd808_t drum;fmd808_init(&drum,44117.647f);
  for(int id=0;id<FMD808_VOICE_COUNT;++id){
    fmd808_trigger(&drum,(fmd808_voice_id_t)id,112u,(uint8_t)(id&1));
    float peak=0.0f;
    for(int i=0;i<24000;++i){const float s=fmd808_process(&drum);assert(isfinite(s));assert(s>=-1.001f&&s<=1.001f);if(absf(s)>peak)peak=absf(s);}
    assert(peak>0.001f);
  }

  /* Stress simultaneous kick/snare/hats/clap/cowbell and accent. */
  fmd808_trigger(&drum,FMD808_BD,127u,1u);
  fmd808_trigger(&drum,FMD808_SD,120u,1u);
  fmd808_trigger(&drum,FMD808_CH,110u,0u);
  fmd808_trigger(&drum,FMD808_OH,96u,0u);
  fmd808_trigger(&drum,FMD808_CLAP,112u,1u);
  fmd808_trigger(&drum,FMD808_COWBELL,104u,0u);
  for(int i=0;i<44118;++i){const float s=fmd808_process(&drum);assert(isfinite(s));assert(s>=-1.001f&&s<=1.001f);}

  puts("drum808 ok");
  return 0;
}
