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
    name:'Night Drive V2',style:'electro / nocturnal',bpm:128,swing:5,
    miniPreset:'Dark Ladder Lead',bassPatch:BASS808_PRESETS[0],bassPattern:BASS808_PATTERNS[2],
    drumPattern:DRUM808_PATTERNS[2],alphaPatch:ALPHA_PRESETS[0],
    description:'Steady 808 drive, sliding acid bass and wide glass strings under a dark MINI lead.'
  },
  {
    name:'Acid Metro',style:'acid / machine funk',bpm:126,swing:12,
    miniPreset:'Hot Circuit Lead',bassPatch:BASS808_PRESETS[2],bassPattern:BASS808_PATTERNS[0],
    drumPattern:DRUM808_PATTERNS[0],alphaPatch:ALPHA_PRESETS[4],
    description:'High-resonance bassline with electro drums and short Alpha pulse keys.'
  },
  {
    name:'Rubber Circuit',style:'funk / synth machine',bpm:112,swing:24,
    miniPreset:'Neon Mono Bass',bassPatch:BASS808_PRESETS[1],bassPattern:BASS808_PATTERNS[1],
    drumPattern:DRUM808_PATTERNS[1],alphaPatch:ALPHA_PRESETS[1],
    description:'Heavy swing, rubber bassline, brass stabs and space for live MINI performance.'
  },
  {
    name:'Dark Choir Machine',style:'slow industrial',bpm:104,swing:14,
    miniPreset:'Broken Satellite',bassPatch:BASS808_PRESETS[5],bassPattern:BASS808_PATTERNS[3],
    drumPattern:DRUM808_PATTERNS[3],alphaPatch:ALPHA_PRESETS[5],
    description:'Sub-heavy crawl, broken rhythm and a long dark polyphonic choir layer.'
  },
  {
    name:'Calibration Four',style:'engine regression',bpm:120,swing:0,
    miniPreset:'Clean Lab Init',bassPatch:BASS808_PRESETS[4],bassPattern:BASS808_PATTERNS[0],
    drumPattern:DRUM808_PATTERNS[0],alphaPatch:ALPHA_PRESETS[7],
    description:'Clean reference scene for timing, level, envelope and engine-comparison tests.'
  }
];
