import type {Patch, Sequence} from './data';

export const SEQ_ACCENT=1;
export const SEQ_TIE=2;
export const SEQ_SLIDE=4;

export type DrumStep={kick?:number;snare?:number;hat?:number;openHat?:number;clap?:number;tom?:number;perc?:number};
export type DrumPattern={name:string;bpm:number;swing:number;steps:DrumStep[]};
export type SceneFx={delay:string;reverb:string;character:'Clean'|'Classic'|'Aged'|'Hot'|'Broken'};
export type StudioScene={
  name:string;
  style:string;
  description:string;
  synthA:string;
  synthB:string;
  sequence:string;
  drums:string;
  fx:SceneFx;
  macros:[string,string,string,string];
};

/* Original 2.0 demo patches. They deliberately stay inside the classic
 * three-oscillator/ladder vocabulary so future layers and FX extend the
 * instrument instead of replacing its character. */
export const DEMO_PATCHES:Patch[]=[
{name:'Neon Mono Bass',category:'2.0 Bass',osc:['sawtooth','square','triangle'],detune:[0,-12,7],levels:[.86,.48,.12],cutoff:410,res:.48,env:2850,attack:.002,decay:.17,sustain:.12,release:.07,glide:.055,drive:2.15,drift:.1},
{name:'Aged Berlin Bass',category:'2.0 Bass',osc:['sawtooth','sawtooth','triangle'],detune:[0,-12,-24],levels:[.72,.52,.24],cutoff:560,res:.4,env:2150,attack:.004,decay:.26,sustain:.24,release:.11,glide:.03,drive:1.85,drift:.28},
{name:'Glass Ladder Lead',category:'2.0 Lead',osc:['sawtooth','triangle','square'],detune:[0,7,12],levels:[.62,.42,.25],cutoff:2250,res:.58,env:4100,attack:.01,decay:.32,sustain:.52,release:.42,glide:.12,drive:1.35,drift:.16},
{name:'Hot Circuit Lead',category:'2.0 Lead',osc:['sawtooth','sawtooth','square'],detune:[0,5,-7],levels:[.68,.61,.31],cutoff:1720,res:.38,env:3700,attack:.005,decay:.24,sustain:.46,release:.28,glide:.085,drive:2.3,drift:.2},
{name:'Orbit Pluck',category:'2.0 Pluck',osc:['square','sawtooth','triangle'],detune:[0,12,-12],levels:[.58,.38,.13],cutoff:1120,res:.62,env:5200,attack:.001,decay:.095,sustain:.025,release:.08,glide:.012,drive:1.7,drift:.08},
{name:'Midnight Brass',category:'2.0 Brass',osc:['sawtooth','sawtooth','triangle'],detune:[0,-5,7],levels:[.66,.58,.2],cutoff:760,res:.22,env:2950,attack:.11,decay:.62,sustain:.7,release:.58,glide:.018,drive:1.45,drift:.22},
{name:'Broken Satellite',category:'2.0 Texture',osc:['square','triangle','sawtooth'],detune:[0,-19,12],levels:[.44,.38,.28],cutoff:690,res:.74,env:1500,attack:.45,decay:1.4,sustain:.62,release:2.3,glide:.18,drive:2.45,drift:.55},
{name:'Clean Lab Init',category:'2.0 Utility',osc:['sawtooth','square','triangle'],detune:[0,0,-12],levels:[.72,.24,.08],cutoff:6500,res:.08,env:500,attack:.004,decay:.26,sustain:.72,release:.2,glide:0,drive:1.05,drift:.02}
];

const repeat=(value:number,count=16)=>Array(count).fill(value) as number[];
const flags=(entries:Record<number,number>,length=16)=>Array.from({length},(_,i)=>entries[i]??0);
const velocities=(accent:number[],base=100,length=16)=>Array.from({length},(_,i)=>accent.includes(i)?124:base);

/* These patterns intentionally exercise the richer native sequencer model. */
export const DEMO_SEQUENCES:Sequence[]=[
{name:'Neon Slide 01',bpm:126,swing:18,notes:[36,36,43,48,36,39,43,46,36,48,43,39,34,36,43,48],gates:[.42,.78,.38,.62,.34,.4,.52,.72,.38,.66,.42,.4,.32,.82,.46,.7],velocities:velocities([0,3,7,9,13]),flags:flags({0:SEQ_ACCENT,1:SEQ_SLIDE,3:SEQ_ACCENT,7:SEQ_ACCENT|SEQ_SLIDE,9:SEQ_ACCENT,13:SEQ_ACCENT|SEQ_SLIDE}),transpose:repeat(0)},
{name:'Berlin Motion 32',bpm:118,swing:7,notes:[36,43,48,43,39,46,51,46,36,43,48,55,39,46,51,58,36,43,51,48,39,46,55,51,41,48,55,60,39,46,53,58],gates:repeat(.62,32),velocities:Array.from({length:32},(_,i)=>i%4===0?122:i%4===2?108:94),flags:flags({0:SEQ_ACCENT,7:SEQ_SLIDE,8:SEQ_ACCENT,15:SEQ_TIE,16:SEQ_ACCENT,23:SEQ_SLIDE,24:SEQ_ACCENT,31:SEQ_TIE},32),transpose:repeat(0,32)},
{name:'Funk Lock Test',bpm:106,swing:31,notes:[36,36,43,-1,46,36,48,34,36,-1,43,46,48,36,34,43],gates:[.34,.18,.48,.2,.28,.56,.68,.22,.4,.2,.36,.44,.72,.2,.24,.58],velocities:velocities([0,5,8,12]),flags:flags({0:SEQ_ACCENT,5:SEQ_ACCENT,6:SEQ_SLIDE,8:SEQ_ACCENT,12:SEQ_ACCENT|SEQ_SLIDE}),transpose:repeat(0)},
{name:'Prog Tie Lines',bpm:132,swing:0,notes:[48,55,60,62,67,62,60,55,50,57,62,64,69,64,62,57],gates:[.72,.5,.5,.92,.65,.5,.5,.92,.72,.5,.5,.92,.65,.5,.5,.92],velocities:velocities([0,4,8,12],104),flags:flags({0:SEQ_ACCENT,3:SEQ_TIE,4:SEQ_ACCENT,7:SEQ_TIE,8:SEQ_ACCENT,11:SEQ_TIE,12:SEQ_ACCENT,15:SEQ_TIE}),transpose:repeat(0)},
{name:'Motorik Accent',bpm:124,swing:5,notes:[40,40,47,40,45,40,47,40,40,43,47,40,45,43,47,50],gates:repeat(.44),velocities:velocities([0,4,8,12],98),flags:flags({0:SEQ_ACCENT,4:SEQ_ACCENT,8:SEQ_ACCENT,12:SEQ_ACCENT}),transpose:repeat(0)},
{name:'Orbit Ratchet Proxy',bpm:138,swing:14,notes:[48,55,60,55,50,57,62,57,53,60,65,60,55,62,67,62],gates:[.18,.18,.52,.18,.18,.18,.52,.18,.18,.18,.52,.18,.18,.18,.52,.18],velocities:velocities([2,6,10,14],96),flags:flags({2:SEQ_ACCENT,6:SEQ_ACCENT,10:SEQ_ACCENT,14:SEQ_ACCENT}),transpose:[0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0]},
{name:'Dark Space 24',bpm:82,swing:9,notes:[36,48,43,55,39,51,46,58,36,55,43,51,39,58,46,48,34,46,41,53,38,50,45,57],gates:repeat(.84,24),velocities:Array.from({length:24},(_,i)=>i%6===0?118:88),flags:flags({0:SEQ_ACCENT,6:SEQ_SLIDE,12:SEQ_ACCENT,18:SEQ_SLIDE},24),transpose:repeat(0,24)},
{name:'Slide Calibration',bpm:96,swing:0,notes:[36,48,36,55,36,43,36,60,36,48,36,55,36,43,36,60],gates:repeat(.8),velocities:repeat(110),flags:flags({1:SEQ_SLIDE,3:SEQ_SLIDE,5:SEQ_SLIDE,7:SEQ_SLIDE,9:SEQ_SLIDE,11:SEQ_SLIDE,13:SEQ_SLIDE,15:SEQ_SLIDE}),transpose:repeat(0)}
];

export const DRUM_PATTERNS:DrumPattern[]=[
{name:'Analog Drive 01',bpm:126,swing:18,steps:Array.from({length:16},(_,i)=>({kick:[0,4,8,11,12].includes(i)?(i===0?127:110):undefined,snare:[4,12].includes(i)?118:undefined,hat:i%2===0?82:undefined,openHat:i===14?95:undefined,clap:i===12?84:undefined}))},
{name:'Berlin Pulse Kit',bpm:118,swing:7,steps:Array.from({length:16},(_,i)=>({kick:[0,8].includes(i)?118:undefined,snare:[4,12].includes(i)?102:undefined,hat:[2,6,10,14].includes(i)?76:undefined,perc:[3,7,11,15].includes(i)?68:undefined}))},
{name:'Broken Funk Kit',bpm:106,swing:31,steps:Array.from({length:16},(_,i)=>({kick:[0,3,7,10,14].includes(i)?112:undefined,snare:[4,12].includes(i)?120:undefined,hat:[1,2,5,6,9,13,15].includes(i)?72:undefined,clap:i===12?96:undefined,perc:[6,15].includes(i)?88:undefined}))},
{name:'Slow Machine Kit',bpm:82,swing:9,steps:Array.from({length:16},(_,i)=>({kick:[0,7,10].includes(i)?110:undefined,snare:[4,12].includes(i)?98:undefined,hat:i%4===2?62:undefined,tom:[11,15].includes(i)?80:undefined}))}
];

export const STUDIO_SCENES:StudioScene[]=[
{name:'Neon Basement',style:'Electro / Acid',description:'Hard mono bass, sliding accents, hot delay and compact drum machine groove.',synthA:'Neon Mono Bass',synthB:'Glass Ladder Lead',sequence:'Neon Slide 01',drums:'Analog Drive 01',fx:{delay:'BBD 3/16',reverb:'Dark Plate',character:'Hot'},macros:['CUTOFF','ACCENT','DIRT','SPACE']},
{name:'Berlin Afterhours',style:'Berlin School',description:'Classic repeating bass motion with a second drifting lead layer and restrained vintage ambience.',synthA:'Aged Berlin Bass',synthB:'Broken Satellite',sequence:'Berlin Motion 32',drums:'Berlin Pulse Kit',fx:{delay:'Tape 1/4D',reverb:'Vintage Room',character:'Aged'},macros:['BRIGHT','MOVE','AGE','ECHO']},
{name:'Rubber Funk Lab',style:'Funk / Electro',description:'Swing-heavy mono funk designed to expose accents, rests and slide transitions.',synthA:'P-Funk Snap',synthB:'Orbit Pluck',sequence:'Funk Lock Test',drums:'Broken Funk Kit',fx:{delay:'Stereo Slap',reverb:'Spring',character:'Classic'},macros:['SNAP','FILTER','DRIVE','ROOM']},
{name:'Arena Circuit',style:'Prog / Lead',description:'Longer gated phrases with ties, bright ladder movement and a complementary brass layer.',synthA:'Hot Circuit Lead',synthB:'Midnight Brass',sequence:'Prog Tie Lines',drums:'Analog Drive 01',fx:{delay:'Ping Pong 1/8D',reverb:'Hall',character:'Hot'},macros:['BITE','GLIDE','WIDTH','SPACE']},
{name:'Motorik Wire',style:'Motorik',description:'Straight machine pulse with repeating accents; useful for timing and envelope regression tests.',synthA:'Motorik Mono',synthB:'Clean Lab Init',sequence:'Motorik Accent',drums:'Berlin Pulse Kit',fx:{delay:'Tape 1/8',reverb:'Room',character:'Clean'},macros:['TONE','PULSE','DRIVE','AIR']},
{name:'Orbit Plucks',style:'Minimal / Techno',description:'Short plucks and octave-transpose events for testing fast envelopes and per-step transpose.',synthA:'Orbit Pluck',synthB:'Neon Mono Bass',sequence:'Orbit Ratchet Proxy',drums:'Analog Drive 01',fx:{delay:'Multi Tap',reverb:'Plate',character:'Classic'},macros:['PLUCK','OCTAVE','FEEDBACK','SPACE']},
{name:'Dark Satellite',style:'Ambient / Experimental',description:'Slow dark sequence intended to stress long envelopes, resonance, drift and future motion lanes.',synthA:'Broken Satellite',synthB:'Cosmic Drone',sequence:'Dark Space 24',drums:'Slow Machine Kit',fx:{delay:'Dub Tape',reverb:'Dark Space',character:'Broken'},macros:['AGE','DRIFT','FEEDBACK','VOID']},
{name:'Calibration Bench',style:'Test / Utility',description:'Deliberately exposed source material for checking slide, glide, cutoff and envelope behavior.',synthA:'Clean Lab Init',synthB:'Init Classic',sequence:'Slide Calibration',drums:'Berlin Pulse Kit',fx:{delay:'Off',reverb:'Off',character:'Clean'},macros:['CUTOFF','GLIDE','ENV','DRIVE']}
];
