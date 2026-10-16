import type {WorkstationScene} from '../audio/workstation';
import {BASS808_PATTERNS,BASS808_PRESETS} from './bass808Patterns';
import {DRUM808_PATTERNS} from './drum808Patterns';
import {ALPHA_PRESETS} from './alphaPresets';

export type WorkstationDemoScene=WorkstationScene&{
  style:string;
  miniPreset:string;
  description:string;
};

export const WORKSTATION_SCENES:WorkstationDemoScene[]=[
  {
    name:'Night Drive Calm',style:'nocturnal / spacious',bpm:96,swing:4,
    miniPreset:'Dark Ladder Lead',bassPatch:BASS808_PRESETS[0],bassPattern:BASS808_PATTERNS[4],
    drumPattern:DRUM808_PATTERNS[4],alphaPatch:ALPHA_PRESETS[0],
    description:'Wide strings, a sparse low bass pulse and a relaxed eight-note 808 groove with room for live MINI playing.'
  },
  {
    name:'After Hours',style:'soft electro / late night',bpm:104,swing:10,
    miniPreset:'Hot Circuit Lead',bassPatch:BASS808_PRESETS[1],bassPattern:BASS808_PATTERNS[5],
    drumPattern:DRUM808_PATTERNS[5],alphaPatch:ALPHA_PRESETS[4],
    description:'Soft rubber bass, restrained drum accents and short Alpha keys without constant sixteenth-note activity.'
  },
  {
    name:'Half Light',style:'ambient machine funk',bpm:88,swing:6,
    miniPreset:'Neon Mono Bass',bassPatch:BASS808_PRESETS[5],bassPattern:BASS808_PATTERNS[7],
    drumPattern:DRUM808_PATTERNS[6],alphaPatch:ALPHA_PRESETS[5],
    description:'Slow sub movement, half-time percussion and a dark polyphonic choir layer for envelope and chorus testing.'
  },
  {
    name:'Quiet Circuit',style:'minimal synth / restrained',bpm:108,swing:8,
    miniPreset:'Broken Satellite',bassPatch:BASS808_PRESETS[3],bassPattern:BASS808_PATTERNS[6],
    drumPattern:DRUM808_PATTERNS[7],alphaPatch:ALPHA_PRESETS[2],
    description:'Minimal bass and drum movement with enough silence to hear filter, PWM and global FX edits clearly.'
  },
  {
    name:'Calibration Four',style:'engine regression',bpm:100,swing:0,
    miniPreset:'Clean Lab Init',bassPatch:BASS808_PRESETS[4],bassPattern:BASS808_PATTERNS[4],
    drumPattern:DRUM808_PATTERNS[4],alphaPatch:ALPHA_PRESETS[7],
    description:'Clean sparse reference scene for timing, level, envelope, FX and engine-comparison tests.'
  }
];
