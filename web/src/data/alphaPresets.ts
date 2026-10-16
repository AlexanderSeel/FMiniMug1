import {ALPHA_PARAM,type AlphaPatch} from '../audio/alpha';

const make=(name:string,v:number[]):AlphaPatch=>({name,values:Object.fromEntries(v.map((value,id)=>[id,value]))});

export const ALPHA_PRESETS:AlphaPatch[]=[
  make('Glass Strings',[.72,.24,.34,.015,1850,.20,2250,.36,.74,0,.28,0,.42,.80,.76,1.35,.24,.42,.055,105,2,.31,.58,.42,.50,.15,.34,80,0,.8]),
  make('Night Brass',[.84,.34,.18,.01,920,.36,3100,.44,.82,0,.38,0,.055,.46,.68,.32,.18,.12,.028,160,1,.22,.32,.25,.46,.08,.24,120,0,2.2]),
  make('Soft Poly',[.46,.54,.22,.008,2600,.12,900,.25,.70,0,.52,0,.22,.62,.80,1.10,.34,.55,.035,80,1,.28,.42,.34,.52,.20,.48,40,0,.3]),
  make('Hoover Lift',[.92,.72,.48,.02,1450,.48,3600,.38,.76,0,.42,0,.055,.52,.60,.72,1.8,.18,.22,420,2,.62,.82,.56,.34,.28,1.8,90,-12,5.0]),
  make('Pulse Keys',[.18,.88,.12,.005,3200,.18,1600,.48,.76,0,.58,0,.008,.22,.52,.18,4.2,.05,.018,60,1,.64,.24,.18,.28,.20,3.2,180,0,1.2]),
  make('Dark Choir',[.52,.30,.45,.035,780,.28,1800,.22,.72,0,.18,0,1.2,1.4,.82,2.4,.15,1.1,.045,240,2,.19,.74,.48,.58,.09,.18,260,-12,.4]),
  make('Metal Pad',[.64,.66,.14,.055,2100,.52,1400,.30,.68,0,.32,0,.72,1.1,.66,2.8,.11,.65,.085,360,2,.42,.68,.62,.38,.24,.76,540,0,-2.0]),
  make('Alpha Init',[.72,.28,.34,.02,1800,.22,2100,.35,.72,0,.32,0,.018,.42,.68,.48,.38,.25,.06,120,1,.28,.46,.34,.50,.12,.30,0,0,0])
];

// Complete Alpha Juno-1/2 factory tone-name layout (Preset and Memory banks).
// The names/positions mirror the documented factory banks. Parameter values are
// currently translated into this project's original DSP model rather than bundling
// Roland SysEx/ROM data; exact SysEx-to-native conversion is tracked separately.
const FACTORY_P=[
  'PolySynth1','JazzGuitar','Xylophone','Low String','LeadSynth1','ChorusGuit','SynthBass1','ElectroDrm',
  'HighString','TeknoStrng','StringOrgn','FastString','LongString','Cello','SoloViolin','Pizzicato',
  'Piano 1','E Piano 1','E Piano 2','Piano 2','E Piano 3','Clav','Harpsichrd','PianoPad',
  'Organ 1','Organ 2','CheesyOrgn','PipeOrgan1','PipeOrgan2','VoicePad','sinusoidal','Voices 1',
  'Brass 1','Syn Rise','Spit Valve','Fat Synth','Arpeggiatr','Velo-Reso1','Big Brass','Pad 1',
  'LeadSynth2','LeadSynth3','Flute','LeadSynth4','Sax','E Bass 1','SynthBass2','SequencrBs',
  'Bells 1','BellChime1','BellChime2','Syn-Bello','Marimba','Syn Koto','StlDrumBnd','Harp',
  'Tron Blast','NoiseShots','TwiliteZne','Scratchin','Syn Echo','PolePositn','--U-F-O--','Timps'
] as const;

const FACTORY_M=[
  'Brass 2','Brass 3','BrassHorns','FatBrass 1','Trumpets','BrassSwell','PolySynth2','PolySynth3',
  'BowdStrngs','RichStrngs','Orchestra','SynOrchsta','StrngSweep','SoloVioln2','DblBasses','Ominous',
  'Piano 3','E Piano 4','Loud-Piano','Piano-FX','Clavichord','Harpsi 2','AccGuitar','BassPiano',
  'Organ 3','Organ 4','ChowaOrgan','PipeOrgan3','Accordion','Vocorder','Voices 2','Harmonica',
  'SynthSweep','Poly Pulse','CosmoSweep','ChrusPluck','Bells 2','Vibe','Koto','BellChime3',
  'Lead 5','Lead 6','Inv-Solo','Clarinet','Oboe','SynthBass3','SynthBass4','UpriteBass',
  'Machines','EchoXplosn','ooops','Jet Chord','Take-Off','Whistle','Surprise','Oct Jump',
  'Jet','Helicopter','DogsBark','WET','ooohSCARY','What the','SynthToms','Kick'
] as const;

function classify(name:string){
  const n=name.toLowerCase();
  if(n.includes('string')||n.includes('orch')||n.includes('pad')||n.includes('voice'))return 0;
  if(n.includes('brass')||n.includes('trump')||n.includes('horn'))return 1;
  if(n.includes('bass'))return 4;
  if(n.includes('lead')||n.includes('flute')||n.includes('sax')||n.includes('oboe')||n.includes('clar'))return 2;
  if(n.includes('piano')||n.includes('clav')||n.includes('harpsi')||n.includes('guitar')||n.includes('organ'))return 2;
  if(n.includes('bell')||n.includes('xylo')||n.includes('marimba')||n.includes('koto')||n.includes('harp'))return 4;
  if(n.includes('noise')||n.includes('jet')||n.includes('u-f-o')||n.includes('helicopter')||n.includes('scratch')||n.includes('echo'))return 6;
  return 7;
}

function modeledFactoryPatch(name:string,index:number,bank:'P'|'M'):AlphaPatch{
  const values={...ALPHA_PRESETS[classify(name)].values};
  const drift=((index%8)-3.5)/100;
  values[ALPHA_PARAM.cutoff]=Math.max(120,Math.min(9000,(values[ALPHA_PARAM.cutoff]??1800)*(1+drift*2.4)));
  values[ALPHA_PARAM.resonance]=Math.max(0,Math.min(.92,(values[ALPHA_PARAM.resonance]??.2)+drift));
  values[ALPHA_PARAM.chorusMix]=Math.max(0,Math.min(.8,(values[ALPHA_PARAM.chorusMix]??.3)+(index%3)*.025));
  values[ALPHA_PARAM.lfoRate]=Math.max(.05,Math.min(8,(values[ALPHA_PARAM.lfoRate]??.4)+(index%5)*.035));
  values[ALPHA_PARAM.pulseWidth]=Math.max(.12,Math.min(.88,(values[ALPHA_PARAM.pulseWidth]??.5)+drift*2));
  values[ALPHA_PARAM.pwmDepth]=Math.max(0,Math.min(.4,(values[ALPHA_PARAM.pwmDepth]??.12)+(index%4)*.025));
  values[ALPHA_PARAM.pwmRate]=Math.max(.05,Math.min(6,(values[ALPHA_PARAM.pwmRate]??.3)+(index%7)*.08));
  values[ALPHA_PARAM.hpf]=[0,80,180,420][index%4];
  return {name:`${bank}-${Math.floor(index/8)+1}${(index%8)+1} ${name}`,values};
}

export const ALPHA_FACTORY_PRESETS:AlphaPatch[]=[
  ...FACTORY_P.map((name,index)=>modeledFactoryPatch(name,index,'P')),
  ...FACTORY_M.map((name,index)=>modeledFactoryPatch(name,index,'M'))
];

export const ALPHA_ALL_PRESETS=[...ALPHA_FACTORY_PRESETS,...ALPHA_PRESETS];
export const ALPHA_DEFAULT=ALPHA_FACTORY_PRESETS[0]??ALPHA_PRESETS[ALPHA_PRESETS.length-1];
