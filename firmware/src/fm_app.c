#include "fm_app.h"
#include <string.h>

#define FM1_FIRST_MIDI_NOTE 53
#define FM1_UI_FRAME_MS 33u

static int clamp_midi(int note){if(note<0)return 0;if(note>127)return 127;return note;}
static int32_t float_to_s24_left(float sample){if(sample>1.0f)sample=1.0f;if(sample<-1.0f)sample=-1.0f;return (int32_t)(sample*2147483392.0f);}

static void seq_event(const fm_seq_event_t *event,void *user){
  fm_app_t *app=(fm_app_t *)user;
  if(event->type==FM_SEQ_EVENT_NOTE_ON)fm_voice_note_on(&app->voice,event->note,event->velocity);
  else if(event->type==FM_SEQ_EVENT_NOTE_OFF)fm_voice_note_off(&app->voice);
  else if(event->type==FM_SEQ_EVENT_STEP)fm_studio_trigger_step(&app->studio,event->step_index);
}

void fm_app_init(fm_app_t *app,float sample_rate){
  memset(app,0,sizeof(*app));
  fm1_platform_init();
  fm_voice_init(&app->voice,sample_rate);
  fm_studio_init(&app->studio,sample_rate);
  fm_seq_init(&app->sequencer,sample_rate);
  fm_ui_init(&app->ui);
}

void fm_app_set_sequence(fm_app_t *app,const fm_seq_pattern_t *pattern){
  if(!pattern){app->sequence_loaded=0u;fm_seq_stop(&app->sequencer);fm_ui_set_sequence_view(&app->ui,0,0u);return;}
  fm_seq_set_pattern(&app->sequencer,pattern);app->sequence_loaded=1u;
  fm_ui_set_sequence_view(&app->ui,&app->sequencer.pattern,app->sequencer.step_index);
  if(app->ui.playing)fm_seq_start(&app->sequencer);
}

void fm_app_handle_input(fm_app_t *app,const fm1_input_frame_t *input){
  if(!input)return;
  if(input->button_pressed&(1u<<(unsigned)FM1_KEY_OCT_DOWN)){if(app->octave_shift>-3)--app->octave_shift;}
  if(input->button_pressed&(1u<<(unsigned)FM1_KEY_OCT_UP)){if(app->octave_shift<3)++app->octave_shift;}

  const int studio_consumed=fm_studio_handle_input(&app->studio,input);
  if(studio_consumed&&app->studio.active){
    fm1_input_frame_t transport=*input;
    const uint32_t play_mask=1u<<(unsigned)FM1_KEY_PLAY;
    transport.buttons&=play_mask;transport.button_pressed&=play_mask;transport.button_released&=play_mask;
    memset(transport.encoder_delta,0,sizeof(transport.encoder_delta));
    fm_ui_handle_input(&app->ui,&app->voice.patch,&transport);
  }else if(!studio_consumed){
    fm_ui_handle_input(&app->ui,&app->voice.patch,input);
  }
  app->studio.tempo_bpm=app->ui.tempo_bpm;

  if(!app->ui.playing){
    for(uint8_t i=0;i<27u;++i){
      const uint32_t mask=1u<<i;
      if(input->note_pressed&mask){
        const int note=clamp_midi(FM1_FIRST_MIDI_NOTE+(int)i+(int)app->octave_shift*12);
        app->key_midi[i]=(uint8_t)note;app->key_down|=mask;
        fm_voice_note_on(&app->voice,(uint8_t)note,112u);fm_studio_note_on(&app->studio,(uint8_t)note,104u);
      }
      if(input->note_released&mask){
        if(app->key_down&mask){fm_voice_note_off_note(&app->voice,app->key_midi[i]);fm_studio_note_off(&app->studio,app->key_midi[i]);}
        app->key_down&=~mask;
      }
    }
  }

  if(app->ui.playing!=app->last_playing){
    if(app->ui.playing&&app->sequence_loaded){
      fm_voice_note_off(&app->voice);fm_voice_note_off(&app->studio.voice_b);app->key_down=0u;fm_seq_start(&app->sequencer);
    }else{
      fm_seq_stop(&app->sequencer);fm_voice_note_off(&app->voice);fm_voice_note_off(&app->studio.voice_b);
    }
    app->last_playing=app->ui.playing;
  }
}

void fm_app_render_audio(fm_app_t *app,fm1_audio_block_t *block){
  if(!block||!block->samples)return;
  for(uint32_t frame=0;frame<block->frames;++frame){
    if(app->ui.playing&&app->sequence_loaded)fm_seq_process(&app->sequencer,1u,seq_event,app);
    const float mixed=fm_studio_process(&app->studio,fm_voice_process(&app->voice));
    const int32_t s=float_to_s24_left(mixed);
    block->samples[frame*2u]=s;block->samples[frame*2u+1u]=s;
  }
}

void fm_app_tick(fm_app_t *app,const char *preset_name){
  fm1_input_frame_t input;fm1_audio_block_t block;
  memset(&input,0,sizeof(input));memset(&block,0,sizeof(block));
  fm1_platform_poll_input(&input);fm_app_handle_input(app,&input);
  while(fm1_platform_audio_acquire(&block)){fm_app_render_audio(app,&block);fm1_platform_audio_submit(&block);memset(&block,0,sizeof(block));}
  const uint32_t now=fm1_platform_millis();
  if((uint32_t)(now-app->last_ui_ms)>=FM1_UI_FRAME_MS){
    app->last_ui_ms=now;
    fm_ui_set_sequence_view(&app->ui,app->sequence_loaded?&app->sequencer.pattern:0,app->sequencer.step_index);
    if(app->studio.active)fm_studio_render(&app->studio);
    else fm_ui_render(&app->ui,&app->voice.patch,preset_name);
  }
}
