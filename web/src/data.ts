export type Wave='sawtooth'|'square'|'triangle';

export type Patch={
  name:string;
  category:string;
  osc:[Wave,Wave,Wave];
  detune:[number,number,number];
  levels:[number,number,number];
  cutoff:number;
  res:number;
  env:number;
  attack:number;
  decay:number;
  sustain:number;
  release:number;
  glide:number;
  drive:number;
  drift:number;
};

export type Sequence={name:string;bpm:number;notes:number[];gates:number[]};

/*
 * Original FMiniMug1 parameter sets. Names describe classic Minimoog sound
 * categories and recording-era techniques; they are not copied preset sheets.
 * A Minimoog Model D itself did not have patch memory.
 */
export const PATCHES:Patch[]=[
{name:'Round Bass 70',category:'Bass',osc:['sawtooth','square','triangle'],detune:[0,-7,0],levels:[.9,.55,.16],cutoff:520,res:.18,env:1500,attack:.005,decay:.28,sustain:.32,release:.12,glide:.035,drive:1.6,drift:.12},
{name:'Rubber Bass',category:'Bass',osc:['square','sawtooth','triangle'],detune:[0,7,-12],levels:[.8,.62,.12],cutoff:360,res:.52,env:2600,attack:.003,decay:.18,sustain:.14,release:.08,glide:.018,drive:2.0,drift:.09},
{name:'Deep Mono Bass',category:'Bass',osc:['sawtooth','sawtooth','square'],detune:[0,-12,-24],levels:[.78,.55,.22],cutoff:250,res:.12,env:1350,attack:.003,decay:.38,sustain:.48,release:.13,glide:.025,drive:1.9,drift:.08},
{name:'Disco Octave Bass',category:'Bass',osc:['sawtooth','square','triangle'],detune:[0,12,-12],levels:[.76,.36,.18],cutoff:610,res:.2,env:2100,attack:.004,decay:.24,sustain:.27,release:.1,glide:.018,drive:1.7,drift:.1},
{name:'P-Funk Snap',category:'Bass',osc:['square','sawtooth','square'],detune:[0,7,-12],levels:[.72,.48,.2],cutoff:430,res:.58,env:3200,attack:.002,decay:.14,sustain:.08,release:.07,glide:.055,drive:2.15,drift:.12},
{name:'Sub Foundation',category:'Bass',osc:['triangle','square','triangle'],detune:[0,-12,-24],levels:[.9,.22,.12],cutoff:220,res:.08,env:600,attack:.008,decay:.5,sustain:.72,release:.22,glide:.03,drive:1.45,drift:.06},
{name:'Lucky Lead',category:'Lead',osc:['sawtooth','sawtooth','square'],detune:[0,5,-7],levels:[.72,.62,.35],cutoff:1850,res:.28,env:3100,attack:.012,decay:.36,sustain:.58,release:.38,glide:.085,drive:1.35,drift:.16},
{name:'Prog Arena Lead',category:'Lead',osc:['sawtooth','square','sawtooth'],detune:[0,12,-12],levels:[.72,.42,.35],cutoff:1350,res:.42,env:4300,attack:.008,decay:.26,sustain:.46,release:.22,glide:.12,drive:1.55,drift:.18},
{name:'Searing Unison',category:'Lead',osc:['sawtooth','sawtooth','sawtooth'],detune:[0,4,-5],levels:[.66,.6,.58],cutoff:2600,res:.22,env:2500,attack:.005,decay:.31,sustain:.7,release:.28,glide:.07,drive:1.8,drift:.2},
{name:'Soft Solo',category:'Lead',osc:['triangle','sawtooth','triangle'],detune:[0,7,-12],levels:[.58,.38,.24],cutoff:1500,res:.3,env:1900,attack:.025,decay:.48,sustain:.72,release:.5,glide:.16,drive:1.2,drift:.19},
{name:'Portamento Cry',category:'Lead',osc:['square','sawtooth','triangle'],detune:[0,12,-12],levels:[.58,.52,.15],cutoff:2100,res:.48,env:3600,attack:.015,decay:.5,sustain:.4,release:.65,glide:.28,drive:1.45,drift:.17},
{name:'Bright Sync Illusion',category:'Lead',osc:['sawtooth','square','sawtooth'],detune:[0,19,-12],levels:[.63,.47,.22],cutoff:3900,res:.35,env:4400,attack:.002,decay:.22,sustain:.52,release:.19,glide:.04,drive:1.6,drift:.11},
{name:'Soft Brass',category:'Brass',osc:['sawtooth','sawtooth','triangle'],detune:[0,-5,7],levels:[.7,.64,.2],cutoff:920,res:.16,env:3300,attack:.085,decay:.55,sustain:.68,release:.45,glide:.02,drive:1.25,drift:.15},
{name:'Analog Horn',category:'Brass',osc:['sawtooth','square','sawtooth'],detune:[0,-7,12],levels:[.62,.4,.25],cutoff:780,res:.2,env:2800,attack:.12,decay:.62,sustain:.74,release:.55,glide:.015,drive:1.35,drift:.16},
{name:'Low Brass Stack',category:'Brass',osc:['sawtooth','sawtooth','triangle'],detune:[0,-12,-24],levels:[.64,.55,.22],cutoff:590,res:.13,env:2200,attack:.095,decay:.7,sustain:.71,release:.48,glide:.02,drive:1.5,drift:.17},
{name:'Vintage Keys',category:'Keys',osc:['square','triangle','sawtooth'],detune:[0,12,-12],levels:[.58,.32,.19],cutoff:2200,res:.12,env:1200,attack:.012,decay:.42,sustain:.5,release:.62,glide:0,drive:1.15,drift:.12},
{name:'Clav Bite',category:'Keys',osc:['square','square','triangle'],detune:[0,12,-12],levels:[.6,.28,.12],cutoff:1800,res:.38,env:3400,attack:.001,decay:.11,sustain:.05,release:.08,glide:0,drive:1.75,drift:.06},
{name:'Organ Mono',category:'Keys',osc:['square','square','square'],detune:[0,12,-12],levels:[.55,.31,.18],cutoff:4800,res:.05,env:300,attack:.008,decay:.12,sustain:.92,release:.18,glide:0,drive:1.15,drift:.09},
{name:'Berlin Sequence',category:'Seq',osc:['sawtooth','square','triangle'],detune:[0,7,-12],levels:[.72,.5,.2],cutoff:720,res:.48,env:3600,attack:.004,decay:.2,sustain:.18,release:.08,glide:.025,drive:1.55,drift:.12},
{name:'Clockwork Pulse',category:'Seq',osc:['square','sawtooth','triangle'],detune:[0,-12,7],levels:[.66,.45,.15],cutoff:640,res:.42,env:2800,attack:.002,decay:.16,sustain:.12,release:.06,glide:.014,drive:1.65,drift:.08},
{name:'Motorik Mono',category:'Seq',osc:['sawtooth','triangle','square'],detune:[0,12,-12],levels:[.7,.26,.2],cutoff:1050,res:.31,env:2300,attack:.003,decay:.2,sustain:.24,release:.09,glide:.018,drive:1.45,drift:.09},
{name:'Electro Step',category:'Seq',osc:['square','square','sawtooth'],detune:[0,7,-12],levels:[.58,.45,.24],cutoff:880,res:.55,env:3900,attack:.002,decay:.13,sustain:.07,release:.05,glide:.038,drive:1.9,drift:.08},
{name:'Space Whistle',category:'SFX',osc:['triangle','triangle','sawtooth'],detune:[0,12,24],levels:[.5,.34,.12],cutoff:4100,res:.78,env:5100,attack:.12,decay:1.2,sustain:.25,release:1.8,glide:.22,drive:1.1,drift:.24},
{name:'Filter Siren',category:'SFX',osc:['triangle','sawtooth','triangle'],detune:[0,24,-24],levels:[.16,.08,.05],cutoff:2500,res:.93,env:6800,attack:.55,decay:1.4,sustain:.2,release:2.2,glide:.4,drive:1.15,drift:.25},
{name:'Sci-Fi Alarm',category:'SFX',osc:['square','square','triangle'],detune:[0,19,-12],levels:[.52,.36,.12],cutoff:3200,res:.7,env:4800,attack:.025,decay:.24,sustain:.58,release:.7,glide:.33,drive:1.35,drift:.21},
{name:'Dark Drone',category:'Drone',osc:['sawtooth','square','triangle'],detune:[0,-12,-24],levels:[.62,.43,.38],cutoff:390,res:.67,env:420,attack:1.2,decay:1.8,sustain:.85,release:2.5,glide:.08,drive:2.1,drift:.36},
{name:'Cosmic Drone',category:'Drone',osc:['sawtooth','triangle','square'],detune:[0,7,-19],levels:[.5,.42,.3],cutoff:760,res:.72,env:900,attack:1.8,decay:2.5,sustain:.78,release:3.4,glide:.15,drive:1.8,drift:.48},
{name:'Machine Hum',category:'Drone',osc:['square','triangle','triangle'],detune:[0,-12,-24],levels:[.44,.38,.31],cutoff:310,res:.46,env:260,attack:.8,decay:1.5,sustain:.9,release:2.8,glide:.04,drive:2.25,drift:.4},
{name:'Percussive Zap',category:'Perc',osc:['square','sawtooth','triangle'],detune:[0,12,-12],levels:[.5,.38,.1],cutoff:1250,res:.62,env:6200,attack:.001,decay:.08,sustain:.01,release:.04,glide:0,drive:1.9,drift:.03},
{name:'Analog Tom',category:'Perc',osc:['triangle','square','triangle'],detune:[0,-12,-24],levels:[.72,.14,.08],cutoff:480,res:.28,env:1800,attack:.001,decay:.18,sustain:.01,release:.05,glide:.06,drive:1.65,drift:.03},
{name:'Laser Drop',category:'Perc',osc:['sawtooth','square','triangle'],detune:[12,0,-12],levels:[.58,.25,.09],cutoff:1700,res:.52,env:5200,attack:.001,decay:.1,sustain:.01,release:.04,glide:.42,drive:1.7,drift:.02},
{name:'Init Classic',category:'Utility',osc:['sawtooth','sawtooth','triangle'],detune:[0,0,-12],levels:[.8,0,0],cutoff:8000,res:0,env:0,attack:.005,decay:.3,sustain:.8,release:.2,glide:0,drive:1,drift:0}
];

export const SEQS:Sequence[]=[
{name:'Berlin 01',bpm:118,notes:[36,43,48,43,39,46,51,46,36,43,48,55,39,46,51,58],gates:Array(16).fill(.68)},
{name:'Berlin Minor',bpm:122,notes:[36,43,48,51,43,48,55,51,36,46,48,53,43,46,51,55],gates:Array(16).fill(.56)},
{name:'Funk Steps',bpm:104,notes:[36,36,43,46,36,48,43,34,36,39,43,46,48,46,43,39],gates:[.45,.28,.5,.55,.35,.65,.4,.35,.45,.3,.45,.55,.7,.35,.4,.55]},
{name:'Funk Ghosts',bpm:108,notes:[36,43,36,46,48,36,43,34,36,48,39,43,46,36,34,43],gates:[.3,.16,.42,.22,.5,.18,.34,.2,.38,.48,.2,.28,.45,.18,.24,.52]},
{name:'Prog Pulse',bpm:132,notes:[48,55,60,62,67,62,60,55,50,57,62,64,69,64,62,57],gates:Array(16).fill(.52)},
{name:'Prog Fifths',bpm:126,notes:[48,55,60,67,50,57,62,69,53,60,65,72,55,62,67,74],gates:Array(16).fill(.6)},
{name:'Motorik 16',bpm:124,notes:[40,40,47,40,45,40,47,40,40,43,47,40,45,43,47,50],gates:Array(16).fill(.45)},
{name:'Electro Mono',bpm:116,notes:[36,48,36,43,39,51,39,46,34,46,34,41,36,48,43,39],gates:[.35,.55,.22,.42,.31,.58,.2,.46,.3,.5,.2,.4,.38,.6,.42,.32]},
{name:'Night Drive',bpm:112,notes:[36,43,51,48,39,46,53,51,41,48,55,53,39,46,51,55],gates:Array(16).fill(.63)},
{name:'Slow Orbit',bpm:76,notes:[36,48,43,55,39,51,46,58,36,55,43,51,39,58,46,48],gates:Array(16).fill(.82)},
{name:'Bass Lesson',bpm:96,notes:[36,36,43,36,48,43,36,34,36,39,43,48,43,39,36,31],gates:Array(16).fill(.58)},
{name:'Filter Demo',bpm:92,notes:[36,36,36,36,48,48,48,48,43,43,43,43,55,55,55,55],gates:Array(16).fill(.78)}
];
