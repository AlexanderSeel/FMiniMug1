import {useMemo,useState} from 'react';
import {WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {bass808,BASS808_PARAM,type Bass808ParamId,type Bass808Pattern} from './audio/bass808';
import {drum808,DRUM808_GLOBAL_PARAM,DRUM808_VOICE_PARAM,DRUM808_VOICES,type Drum808VoiceId,type Drum808Pattern} from './audio/drum808';
import {alpha,ALPHA_PARAM,type AlphaParamId} from './audio/alpha';
import {DRUM808_PATTERNS,DRUM808_VOICE_SHORT} from './data/drum808Patterns';
import {BASS808_DEFAULT_PATTERN,BASS808_DEFAULT_PRESET,BASS808_PATTERNS,BASS808_PRESETS} from './data/bass808Patterns';
import {ALPHA_DEFAULT,ALPHA_PRESETS} from './data/alphaPresets';
import './workstation.css';

const PART_KEYS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];
type BassBinding={id:Bass808ParamId,min:number,max:number,step:number};
type AlphaBinding={id:AlphaParamId,min:number,max:number,step:number};
const BASS_BINDINGS:Record<string,(BassBinding|null)[]>={
  osc:[
    {id:BASS808_PARAM.wave,min:0,max:1,step:1},
    {id:BASS808_PARAM.tune,min:-12,max:12,step:.25},
    {id:BASS808_PARAM.sub,min:0,max:.7,step:.02},
    {id:BASS808_PARAM.drive,min:.5,max:4,step:.05}
  ],
  filter:[
    {id:BASS808_PARAM.cutoff,min:35,max:8000,step:40},
    {id:BASS808_PARAM.resonance,min:0,max:1,step:.02},
    {id:BASS808_PARAM.envMod,min:0,max:6000,step:50},
    {id:BASS808_PARAM.accent,min:0,max:1.25,step:.02}
  ],
  env:[
    {id:BASS808_PARAM.decay,min:.02,max:2,step:.02},
    {id:BASS808_PARAM.slide,min:.005,max:.5,step:.005},
    null,
    {id:BASS808_PARAM.accentDecay,min:.02,max:1,step:.01}
  ],
  seq:[null,null,null,null],perf:[null,null,null,null]
};
const ALPHA_BINDINGS:Record<string,(AlphaBinding|null)[]>={
  dco:[
    {id:ALPHA_PARAM.saw,min:0,max:1,step:.03},{id:ALPHA_PARAM.pulse,min:0,max:1,step:.03},
    {id:ALPHA_PARAM.sub,min:0,max:1,step:.03},{id:ALPHA_PARAM.noise,min:0,max:.5,step:.02}
  ],
  vcf:[
    {id:ALPHA_PARAM.cutoff,min:45,max:12000,step:80},{id:ALPHA_PARAM.resonance,min:0,max:1,step:.02},
    {id:ALPHA_PARAM.env,min:0,max:6500,step:60},{id:ALPHA_PARAM.keytrack,min:0,max:1,step:.02}
  ],
  vca:[
    {id:ALPHA_PARAM.level,min:0,max:1.2,step:.03},{id:ALPHA_PARAM.envMode,min:0,max:1,step:1},
    {id:ALPHA_PARAM.velocity,min:0,max:1,step:.03},null
  ],
  env:[
    {id:ALPHA_PARAM.attack,min:.001,max:4,step:.02},{id:ALPHA_PARAM.decay,min:.01,max:5,step:.03},
    {id:ALPHA_PARAM.sustain,min:0,max:1,step:.03},{id:ALPHA_PARAM.release,min:.01,max:6,step:.03}
  ],
  lfo:[
    {id:ALPHA_PARAM.lfoRate,min:.02,max:15,step:.06},{id:ALPHA_PARAM.lfoDelay,min:0,max:5,step:.04},
    {id:ALPHA_PARAM.dcoMod,min:0,max:2,step:.02},{id:ALPHA_PARAM.vcfMod,min:0,max:2000,step:20}
  ],
  chorus:[
    {id:ALPHA_PARAM.chorusMode,min:0,max:2,step:1},{id:ALPHA_PARAM.chorusRate,min:.02,max:5,step:.03},
    {id:ALPHA_PARAM.chorusDepth,min:0,max:1,step:.03},{id:ALPHA_PARAM.chorusMix,min:0,max:.85,step:.03}
  ],
  seq:[null,null,null,null]
};

const DRUM_DEFAULTS={
  level:[.92,.72,.42,.40,.48,.54,.38,.42],
  tune:[52,185,7200,6500,1400,120,540,480],
  decay:[.34,.20,.055,.34,.22,.32,.17,.075],
  tone:[.55,.65,.72,.68,.62,.55,.60,.70]
};
const cloneDrumPattern=(p:Drum808Pattern):Drum808Pattern=>({...p,steps:p.steps.map(s=>({...s}))});
const cloneBassPattern=(p:Bass808Pattern):Bass808Pattern=>({...p,steps:p.steps.map(s=>({...s}))});

export function WorkstationPrototype(){
  const [partId,setPartId]=useState<WorkstationPartId>('mini');
  const [pages,setPages]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [focus,setFocus]=useState<number|null>(null);
  const [hold,setHold]=useState(false);

  const [bassValues,setBassValues]=useState<Record<number,number>>({...BASS808_DEFAULT_PRESET.values});
  const [bassPresetIndex,setBassPresetIndex]=useState(0);
  const [bassPatternIndex,setBassPatternIndex]=useState(0);
  const [bassPattern,setBassPattern]=useState<Bass808Pattern>(()=>cloneBassPattern(BASS808_DEFAULT_PATTERN));
  const [bassStep,setBassStep]=useState(0);
  const [bassPlaying,setBassPlaying]=useState(false);

  const [drumVoice,setDrumVoice]=useState<Drum808VoiceId>(0);
  const [drumLevel,setDrumLevel]=useState([...DRUM_DEFAULTS.level]);
  const [drumTune,setDrumTune]=useState([...DRUM_DEFAULTS.tune]);
  const [drumDecay,setDrumDecay]=useState([...DRUM_DEFAULTS.decay]);
  const [drumTone,setDrumTone]=useState([...DRUM_DEFAULTS.tone]);
  const [drumAccent,setDrumAccent]=useState(.38);
  const [drumDrive,setDrumDrive]=useState(1.15);
  const [drumPattern,setDrumPattern]=useState<Drum808Pattern>(()=>cloneDrumPattern(DRUM808_PATTERNS[0]));
  const [drumPatternIndex,setDrumPatternIndex]=useState(0);
  const [drumStep,setDrumStep]=useState(0);
  const [drumPlaying,setDrumPlaying]=useState(false);

  const [alphaValues,setAlphaValues]=useState<Record<number,number>>({...ALPHA_DEFAULT.values});
  const [alphaPresetIndex,setAlphaPresetIndex]=useState(ALPHA_PRESETS.length-1);
  const [alphaHeld,setAlphaHeld]=useState<number[]>([]);

  const part=useMemo(()=>WORKSTATION_PARTS.find(x=>x.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pages[partId]??0]??part.pages[0];

  const choosePart=(id:WorkstationPartId)=>{setPartId(id);setFocus(null)};
  const movePage=(delta:number)=>{const count=part.pages.length;const current=pages[partId]??0;setPages({...pages,[partId]:(current+delta+count)%count});setFocus(null)};

  const chooseBassPreset=async(delta:number)=>{
    const index=(bassPresetIndex+delta+BASS808_PRESETS.length)%BASS808_PRESETS.length;const patch=BASS808_PRESETS[index];
    setBassPresetIndex(index);setBassValues({...patch.values});await bass808.applyPatch(patch);
  };
  const chooseBassPattern=(delta:number)=>{
    const index=(bassPatternIndex+delta+BASS808_PATTERNS.length)%BASS808_PATTERNS.length;
    setBassPatternIndex(index);setBassPattern(cloneBassPattern(BASS808_PATTERNS[index]));setBassStep(0);
    if(bassPlaying){bass808.stopPattern();setBassPlaying(false)}
  };
  const rotateBass=async(index:number,delta:number)=>{
    if(page.id==='seq'){
      const next=cloneBassPattern(bassPattern);const step=next.steps[bassStep];
      if(index===0){setBassStep((bassStep+delta+next.steps.length)%next.steps.length);return}
      if(index===1){step.accent=!step.accent;setBassPattern(next);return}
      if(index===2){step.slide=!step.slide;setBassPattern(next);return}
      if(index===3&&step.note>=0){step.note=Math.max(12,Math.min(84,step.note+delta*12));setBassPattern(next);return}
    }
    if(page.id==='perf'){
      if(index===0){setBassPattern({...bassPattern,bpm:Math.max(50,Math.min(220,bassPattern.bpm+delta))});return}
      if(index===1){setBassPattern({...bassPattern,swing:Math.max(0,Math.min(75,bassPattern.swing+delta))});return}
      if(index===2){chooseBassPattern(delta);return}
      return;
    }
    const binding=BASS_BINDINGS[page.id]?.[index];if(!binding)return;
    const current=bassValues[binding.id]??0;const value=Math.max(binding.min,Math.min(binding.max,current+delta*binding.step));
    setBassValues({...bassValues,[binding.id]:value});await bass808.start();bass808.setParam(binding.id,value);
  };
  const toggleBassPattern=async()=>{if(bassPlaying){bass808.stopPattern();setBassPlaying(false);return}await bass808.applyPatch(BASS808_PRESETS[bassPresetIndex]);await bass808.playPattern(bassPattern,setBassStep);setBassPlaying(true)};
  const bassKeyDown=async(note:number)=>{await bass808.start();for(const [id,value] of Object.entries(bassValues))bass808.setParam(+id as Bass808ParamId,value);await bass808.noteOn(note,{accent:hold})};
  const bassKeyUp=()=>{if(!bassPlaying)bass808.noteOff()};

  const sendDrumVoiceParam=async(voice:Drum808VoiceId,param:number,value:number)=>{await drum808.start();drum808.setVoiceParam(voice,param,value)};
  const changeDrumArray=async(kind:'level'|'tune'|'decay'|'tone',param:number,value:number)=>{
    const setters={level:setDrumLevel,tune:setDrumTune,decay:setDrumDecay,tone:setDrumTone};
    const source={level:drumLevel,tune:drumTune,decay:drumDecay,tone:drumTone}[kind];
    const next=[...source];next[drumVoice]=value;setters[kind](next);await sendDrumVoiceParam(drumVoice,param,value);
  };
  const chooseDrumPattern=(delta:number)=>{const index=(drumPatternIndex+delta+DRUM808_PATTERNS.length)%DRUM808_PATTERNS.length;setDrumPatternIndex(index);setDrumPattern(cloneDrumPattern(DRUM808_PATTERNS[index]));setDrumStep(0);if(drumPlaying){drum808.stopPattern();setDrumPlaying(false)}};
  const toggleStepHit=(voice:Drum808VoiceId)=>{const next=cloneDrumPattern(drumPattern);next.steps[drumStep].hits^=1<<voice;setDrumPattern(next)};
  const rotateDrum=async(index:number,delta:number)=>{
    if(page.id==='kit'){
      if(index===0){setDrumVoice(((drumVoice+delta+8)%8) as Drum808VoiceId);return}
      if(index===1){const v=Math.max(0,Math.min(1.2,drumLevel[drumVoice]+delta*.03));await changeDrumArray('level',DRUM808_VOICE_PARAM.level,v);return}
      if(index===2){const st=drumVoice===2||drumVoice===3?180:drumVoice===0?2:8;const v=Math.max(20,Math.min(14000,drumTune[drumVoice]+delta*st));await changeDrumArray('tune',DRUM808_VOICE_PARAM.tune,v);return}
      if(index===3){const v=Math.max(.02,Math.min(2,drumDecay[drumVoice]+delta*.015));await changeDrumArray('decay',DRUM808_VOICE_PARAM.decay,v);return}
    }
    if(page.id==='tone'){
      if(index===0){const v=Math.max(0,Math.min(1,drumTone[drumVoice]+delta*.03));await changeDrumArray('tone',DRUM808_VOICE_PARAM.tone,v);return}
      if(index===1){const v=Math.max(0,Math.min(1,drumAccent+delta*.03));setDrumAccent(v);await drum808.start();drum808.setGlobalParam(DRUM808_GLOBAL_PARAM.accent,v);return}
      if(index===2){const v=Math.max(.5,Math.min(3,drumDrive+delta*.05));setDrumDrive(v);await drum808.start();drum808.setGlobalParam(DRUM808_GLOBAL_PARAM.drive,v);return}
    }
    if(page.id==='mix'){
      const groups:Drum808VoiceId[][]=[[0],[1],[2,3],[4,5,6,7]];const group=groups[index];if(!group)return;const levels=[...drumLevel];
      for(const voice of group){const next=Math.max(0,Math.min(1.2,levels[voice]+delta*.03));levels[voice]=next;await sendDrumVoiceParam(voice,DRUM808_VOICE_PARAM.level,next)}setDrumLevel(levels);return;
    }
    if(page.id==='seq'){
      if(index===0){setDrumStep((drumStep+delta+16)%16);return}
      if(index===1){const next=cloneDrumPattern(drumPattern);next.steps[drumStep].accent^=1<<drumVoice;setDrumPattern(next);return}
    }
    if(page.id==='perf'){
      if(index===0){setDrumPattern({...drumPattern,swing:Math.max(0,Math.min(75,drumPattern.swing+delta))});return}
      if(index===3){chooseDrumPattern(delta);return}
    }
  };
  const triggerDrum=async(voice:Drum808VoiceId)=>{setDrumVoice(voice);await drum808.trigger(voice,{accent:hold})};
  const toggleDrumPattern=async()=>{if(drumPlaying){drum808.stopPattern();setDrumPlaying(false);return}await drum808.playPattern(drumPattern,setDrumStep);setDrumPlaying(true)};

  const rotateAlpha=async(index:number,delta:number)=>{const binding=ALPHA_BINDINGS[page.id]?.[index];if(!binding)return;const current=alphaValues[binding.id]??0;const value=Math.max(binding.min,Math.min(binding.max,current+delta*binding.step));setAlphaValues({...alphaValues,[binding.id]:value});await alpha.start();alpha.setParam(binding.id,value)};
  const chooseAlphaPreset=async(delta:number)=>{const index=(alphaPresetIndex+delta+ALPHA_PRESETS.length)%ALPHA_PRESETS.length;const patch=ALPHA_PRESETS[index];setAlphaPresetIndex(index);setAlphaValues({...patch.values});await alpha.applyPatch(patch)};
  const alphaKeyDown=async(note:number)=>{if(alphaHeld.includes(note))return;await alpha.start();for(const [id,value] of Object.entries(alphaValues))alpha.setParam(+id as AlphaParamId,value);await alpha.noteOn(note,110);setAlphaHeld([...alphaHeld,note])};
  const alphaKeyUp=(note:number)=>{alpha.noteOff(note);setAlphaHeld(alphaHeld.filter(n=>n!==note))};

  const rotate=async(index:number,delta:number)=>{window.dispatchEvent(new CustomEvent('fmw-encoder',{detail:{part:partId,page:page.id,index,delta,hold}}));if(partId==='drum808')return rotateDrum(index,delta);if(partId==='bass808')return rotateBass(index,delta);if(partId==='alpha')return rotateAlpha(index,delta)};

  const valueFor=(index:number)=>{
    if(partId==='bass808'){
      if(page.id==='seq'){const st=bassPattern.steps[bassStep];return [st.note<0?'REST':String(st.note),st.accent?'ON':'OFF',st.slide?'ON':'OFF',st.note<0?'--':`${Math.floor(st.note/12)-1} OCT`][index]??'--'}
      if(page.id==='perf')return [`${bassPattern.bpm} BPM`,`${bassPattern.swing}%`,bassPattern.name,bassPlaying?'STOP':'PLAY'][index]??'--';
      const binding=BASS_BINDINGS[page.id]?.[index];if(!binding)return '--';const value=bassValues[binding.id]??0;
      if(binding.id===BASS808_PARAM.wave)return value>=.5?'SQUARE':'SAW';if(binding.id===BASS808_PARAM.cutoff||binding.id===BASS808_PARAM.envMod)return `${Math.round(value)} Hz`;if(binding.id===BASS808_PARAM.decay||binding.id===BASS808_PARAM.slide||binding.id===BASS808_PARAM.accentDecay)return `${value.toFixed(3)} s`;return value.toFixed(2);
    }
    if(partId==='drum808'){
      if(page.id==='kit')return [DRUM808_VOICES[drumVoice],drumLevel[drumVoice].toFixed(2),`${Math.round(drumTune[drumVoice])} Hz`,`${drumDecay[drumVoice].toFixed(3)} s`][index]??'--';
      if(page.id==='tone')return [drumTone[drumVoice].toFixed(2),drumAccent.toFixed(2),drumDrive.toFixed(2),'NEXT'][index]??'--';
      if(page.id==='mix')return [drumLevel[0],drumLevel[1],(drumLevel[2]+drumLevel[3])*.5,(drumLevel[4]+drumLevel[5]+drumLevel[6]+drumLevel[7])*.25][index]?.toFixed(2)??'--';
      if(page.id==='seq')return [String(drumStep+1),drumPattern.steps[drumStep].accent&(1<<drumVoice)?'ON':'OFF','NEXT','NEXT'][index]??'--';
      if(page.id==='perf')return [`${drumPattern.swing}%`,'NEXT','NEXT',drumPattern.name][index]??'--';
    }
    if(partId==='alpha'){
      const binding=ALPHA_BINDINGS[page.id]?.[index];if(!binding)return index===3&&page.id==='vca'?'STEREO NEXT':'--';const value=alphaValues[binding.id]??0;
      if(binding.id===ALPHA_PARAM.envMode)return value>=.5?'GATE':'ENV';if(binding.id===ALPHA_PARAM.chorusMode)return ['OFF','I','II'][Math.round(value)]??'OFF';if(binding.id===ALPHA_PARAM.cutoff||binding.id===ALPHA_PARAM.env||binding.id===ALPHA_PARAM.vcfMod)return `${Math.round(value)} Hz`;if(binding.id===ALPHA_PARAM.attack||binding.id===ALPHA_PARAM.decay||binding.id===ALPHA_PARAM.release||binding.id===ALPHA_PARAM.lfoDelay)return `${value.toFixed(2)} s`;if(binding.id===ALPHA_PARAM.lfoRate||binding.id===ALPHA_PARAM.chorusRate)return `${value.toFixed(2)} Hz`;return value.toFixed(2);
    }
    return hold?'HOLD':'PRIMARY';
  };
  const alphaKeys=[48,52,55,60,64,67];const bassKeys=[31,34,36,39,41,43,46,48];

  return <section className="workstationPrototype">
    <div className="workstationHeading"><div><strong>WORKSTATION V2 · SHARED HARDWARE/VIRTUAL UI</strong><span>generated from shared/workstation.json</span></div><b>{part.title}</b></div>
    <div className="partStrip">{PART_KEYS.map(id=>{const p=WORKSTATION_PARTS.find(x=>x.id===id)!;return <button key={id} className={partId===id?'active':''} onClick={()=>choosePart(id)}>{p.title}<small>{p.subtitle}</small></button>})}</div>
    <div className="virtualHardware">
      <div className="sideButtons"><button onClick={()=>movePage(-1)}>◀ PAGE</button><button className={hold?'active':''} onMouseDown={()=>setHold(true)} onMouseUp={()=>setHold(false)} onMouseLeave={()=>setHold(false)}>HOLD</button>{partId==='bass808'&&<button onClick={()=>void chooseBassPreset(1)}>PRESET</button>}{partId==='alpha'&&<button onClick={()=>void chooseAlphaPreset(1)}>PRESET</button>}</div>
      <div className="nativeScreen">
        <header><span>{part.title}</span><b>{page.title}</b></header>
        <div className="screenMeta">{part.subtitle} · {part.polyphony} voice{part.polyphony===1?'':'s'}{partId==='bass808'||partId==='drum808'||partId==='alpha'?' · NATIVE WASM':''}</div>
        <div className="screenParams">{page.params.map((name,index)=><button key={name} className={focus===index?'focused':''} onClick={()=>setFocus(focus===index?null:index)}><small>E{index+1}</small><strong>{name}</strong><em>{valueFor(index)}</em></button>)}</div>
        {partId==='drum808'&&page.id==='seq'&&<div className="miniStepGrid">{drumPattern.steps.map((s,i)=><i key={i} className={`${i===drumStep?'current':''} ${s.hits?'hit':''}`}>{i+1}</i>)}</div>}
        {partId==='bass808'&&page.id==='seq'&&<div className="miniStepGrid">{bassPattern.steps.map((s,i)=><i key={i} className={`${i===bassStep?'current':''} ${s.note>=0?'hit':''} ${s.accent?'accent':''} ${s.slide?'slide':''}`}>{s.note<0?'·':i+1}</i>)}</div>}
        <footer><span>{String((pages[partId]??0)+1).padStart(2,'0')}/{String(part.pages.length).padStart(2,'0')}</span><span>{partId==='alpha'?ALPHA_PRESETS[alphaPresetIndex].name:partId==='bass808'?BASS808_PRESETS[bassPresetIndex].name:focus===null?'TURN ENCODERS':'FOCUS E'+(focus+1)}</span></footer>
      </div>
      <div className="sideButtons"><button onClick={()=>movePage(1)}>PAGE ▶</button>{partId==='bass808'?<button className={bassPlaying?'active':''} onClick={()=>void toggleBassPattern()}>{bassPlaying?'STOP':'PLAY'}</button>:partId==='drum808'?<button className={drumPlaying?'active':''} onClick={()=>void toggleDrumPattern()}>{drumPlaying?'STOP':'PLAY'}</button>:partId==='alpha'?<button onClick={()=>{alpha.allNotesOff();setAlphaHeld([])}}>ALL OFF</button>:<button>PLAY</button>}</div>
      <div className="virtualEncoders">{page.params.map((name,index)=><div key={name}><button onClick={()=>void rotate(index,-1)}>−</button><button className={focus===index?'active':''} onClick={()=>setFocus(focus===index?null:index)}>E{index+1}</button><button onClick={()=>void rotate(index,1)}>+</button><span>{name}</span></div>)}</div>
    </div>
    {partId==='drum808'&&<div className="drumHardwareKeys"><strong>FM-1 KEYBOARD PADS</strong>{DRUM808_VOICE_SHORT.map((name,index)=><button key={name} className={drumVoice===index?'active':''} onClick={()=>void triggerDrum(index as Drum808VoiceId)} onDoubleClick={()=>toggleStepHit(index as Drum808VoiceId)}>{name}<small>{drumPattern.steps[drumStep].hits&(1<<index)?'STEP ON':'trigger'}</small></button>)}</div>}
    {partId==='bass808'&&<div className="alphaHardwareKeys"><strong>FM-1 BASS KEYS</strong>{bassKeys.map(note=><button key={note} onMouseDown={()=>void bassKeyDown(note)} onMouseUp={bassKeyUp} onMouseLeave={bassKeyUp}>{note}<small>{hold?'ACCENT':'audition'}</small></button>)}</div>}
    {partId==='alpha'&&<div className="alphaHardwareKeys"><strong>FM-1 POLY TEST</strong>{alphaKeys.map(note=><button key={note} className={alphaHeld.includes(note)?'active':''} onMouseDown={()=>void alphaKeyDown(note)} onMouseUp={()=>alphaKeyUp(note)} onMouseLeave={()=>alphaHeld.includes(note)&&alphaKeyUp(note)}>{['C','E','G','C','E','G'][alphaKeys.indexOf(note)]}<small>{note}</small></button>)}</div>}
    <p className="prototypeNote">Canonical interaction shell. MINI remains the existing core. 808 BASS, 808 DRUM and ALPHA share the native-C → WASM path. BASS and DRUM patterns are playable/editable now; their timing moves into the shared native sample-clock next.</p>
  </section>;
}
