import {useEffect,useMemo,useState} from 'react';
import {WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {workstation} from './audio/workstation';
import {bass808,BASS808_PARAM} from './audio/bass808';
import {ALPHA_PARAM} from './audio/alpha';
import {PARAM} from './generated/params';
import {WORKSTATION_SCENES} from './data/workstationScenes';
import './fm1Virtual.css';

type Binding={id:number;min:number;max:number;step:number;initial:number;unit?:string;kind?:'toggle'|'wave'|'mode'};

const PARTS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];
const NOTE_NAMES=['F','F#','G','G#','A','A#','B','C','C#','D','D#','E'];
const ALPHA_CHORDS=[[48,55,60],[45,52,57],[50,57,62],[43,50,55],[48,52,55]];
const MINI_DRONES=[60,64,55,48,60];

const MINI:Record<string,(Binding|null)[]>={
  osc:[
    {id:PARAM.osc1Level,min:0,max:1,step:.04,initial:.8},
    {id:PARAM.osc2Level,min:0,max:1,step:.04,initial:.55},
    {id:PARAM.osc3Level,min:0,max:1,step:.04,initial:.35},
    {id:PARAM.glide,min:0,max:1.5,step:.02,initial:.05,unit:'s'}
  ],
  mix:[
    {id:PARAM.mixerDrive,min:.5,max:4,step:.08,initial:1.2},
    {id:PARAM.filterDrive,min:.5,max:4,step:.08,initial:1.1},
    {id:PARAM.feedback,min:0,max:.95,step:.03,initial:.08},null
  ],
  filter:[
    {id:PARAM.cutoff,min:40,max:12000,step:100,initial:1800,unit:'Hz'},
    {id:PARAM.res,min:0,max:1,step:.03,initial:.35},
    {id:PARAM.env,min:-6000,max:6000,step:100,initial:2200,unit:'Hz'},
    {id:PARAM.keytrack,min:0,max:1,step:1,initial:1,kind:'toggle'}
  ],
  env:[
    {id:PARAM.attack,min:.001,max:4,step:.03,initial:.01,unit:'s'},
    {id:PARAM.decay,min:.01,max:5,step:.03,initial:.32,unit:'s'},
    {id:PARAM.sustain,min:0,max:1,step:.03,initial:.82},
    {id:PARAM.release,min:.01,max:6,step:.03,initial:.2,unit:'s'}
  ],
  mod:[
    {id:PARAM.drift,min:0,max:1,step:.03,initial:.08},null,
    {id:PARAM.notePriority,min:0,max:2,step:1,initial:2,kind:'mode'},
    {id:PARAM.retrigger,min:0,max:1,step:1,initial:1,kind:'toggle'}
  ],seq:[null,null,null,null]
};

const BASS:Record<string,(Binding|null)[]>={
  osc:[
    {id:BASS808_PARAM.wave,min:0,max:1,step:1,initial:0,kind:'wave'},
    {id:BASS808_PARAM.tune,min:-12,max:12,step:.25,initial:0},
    {id:BASS808_PARAM.sub,min:0,max:.7,step:.03,initial:.12},
    {id:BASS808_PARAM.drive,min:.5,max:4,step:.08,initial:1.35}
  ],
  filter:[
    {id:BASS808_PARAM.cutoff,min:35,max:8000,step:80,initial:640,unit:'Hz'},
    {id:BASS808_PARAM.resonance,min:0,max:1,step:.03,initial:.62},
    {id:BASS808_PARAM.envMod,min:0,max:6000,step:80,initial:2200,unit:'Hz'},
    {id:BASS808_PARAM.accent,min:0,max:1.25,step:.03,initial:.62}
  ],
  env:[
    {id:BASS808_PARAM.decay,min:.02,max:2,step:.02,initial:.28,unit:'s'},
    {id:BASS808_PARAM.slide,min:.005,max:.5,step:.01,initial:.085,unit:'s'},null,
    {id:BASS808_PARAM.accentDecay,min:.02,max:1,step:.02,initial:.16,unit:'s'}
  ],seq:[null,null,null,null],perf:[null,null,null,null]
};

const ALPHA:Record<string,(Binding|null)[]>={
  dco:[
    {id:ALPHA_PARAM.saw,min:0,max:1,step:.04,initial:.72},
    {id:ALPHA_PARAM.pulse,min:0,max:1,step:.04,initial:.2},
    {id:ALPHA_PARAM.sub,min:0,max:1,step:.04,initial:.18},
    {id:ALPHA_PARAM.noise,min:0,max:.5,step:.02,initial:.03}
  ],
  vcf:[
    {id:ALPHA_PARAM.cutoff,min:45,max:12000,step:100,initial:2600,unit:'Hz'},
    {id:ALPHA_PARAM.resonance,min:0,max:1,step:.03,initial:.18},
    {id:ALPHA_PARAM.env,min:0,max:6500,step:80,initial:1800,unit:'Hz'},
    {id:ALPHA_PARAM.keytrack,min:0,max:1,step:.03,initial:.45}
  ],
  vca:[
    {id:ALPHA_PARAM.level,min:0,max:1.2,step:.04,initial:.78},
    {id:ALPHA_PARAM.envMode,min:0,max:1,step:1,initial:0,kind:'toggle'},
    {id:ALPHA_PARAM.velocity,min:0,max:1,step:.04,initial:.55},null
  ],
  env:[
    {id:ALPHA_PARAM.attack,min:.001,max:4,step:.03,initial:.08,unit:'s'},
    {id:ALPHA_PARAM.decay,min:.01,max:5,step:.03,initial:.6,unit:'s'},
    {id:ALPHA_PARAM.sustain,min:0,max:1,step:.03,initial:.75},
    {id:ALPHA_PARAM.release,min:.01,max:6,step:.03,initial:1.2,unit:'s'}
  ],
  lfo:[
    {id:ALPHA_PARAM.lfoRate,min:.02,max:15,step:.08,initial:.7,unit:'Hz'},
    {id:ALPHA_PARAM.lfoDelay,min:0,max:5,step:.04,initial:.25,unit:'s'},
    {id:ALPHA_PARAM.dcoMod,min:0,max:2,step:.03,initial:.08},
    {id:ALPHA_PARAM.vcfMod,min:0,max:2000,step:25,initial:120,unit:'Hz'}
  ],
  chorus:[
    {id:ALPHA_PARAM.chorusMode,min:0,max:2,step:1,initial:1,kind:'mode'},
    {id:ALPHA_PARAM.chorusRate,min:.02,max:5,step:.04,initial:.32,unit:'Hz'},
    {id:ALPHA_PARAM.chorusDepth,min:0,max:1,step:.03,initial:.55},
    {id:ALPHA_PARAM.chorusMix,min:0,max:.85,step:.03,initial:.42}
  ],seq:[null,null,null,null]
};

function initialValues(map:Record<string,(Binding|null)[]>){
  const out:Record<number,number>={};
  for(const page of Object.values(map))for(const binding of page)if(binding&&out[binding.id]===undefined)out[binding.id]=binding.initial;
  return out;
}

function pretty(binding:Binding|null,value:number|undefined){
  if(!binding||value===undefined)return '—';
  if(binding.kind==='wave')return value>=.5?'SQUARE':'SAW';
  if(binding.kind==='toggle')return value>=.5?'ON':'OFF';
  if(binding.kind==='mode')return String(Math.round(value));
  if(binding.unit==='Hz')return `${Math.round(value)} Hz`;
  if(binding.unit==='s')return `${value.toFixed(value<.1?3:2)} s`;
  return value.toFixed(2);
}

export function FM1Virtual(){
  const [partId,setPartId]=useState<WorkstationPartId>('mini');
  const [pageIndex,setPageIndex]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [sceneIndex,setSceneIndex]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [step,setStep]=useState(0);
  const [peak,setPeak]=useState(0);
  const [master,setMaster]=useState(.72);
  const [miniValues,setMiniValues]=useState(()=>initialValues(MINI));
  const [bassValues,setBassValues]=useState(()=>initialValues(BASS));
  const [alphaValues,setAlphaValues]=useState(()=>initialValues(ALPHA));
  const [drumVoice,setDrumVoice]=useState(0);
  const [drumValues,setDrumValues]=useState<Record<number,number>>({0:.92,1:52,2:.34,3:.55});
  const [held,setHeld]=useState<number[]>([]);

  const part=useMemo(()=>WORKSTATION_PARTS.find(p=>p.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pageIndex[partId]??0]??part.pages[0];
  const scene=WORKSTATION_SCENES[sceneIndex];

  useEffect(()=>workstation.onMeter(m=>{setStep(m.step);setPeak(m.peak)}),[]);

  const bindings=partId==='mini'?MINI[page.id]:partId==='bass808'?BASS[page.id]:partId==='alpha'?ALPHA[page.id]:null;
  const values=partId==='mini'?miniValues:partId==='bass808'?bassValues:partId==='alpha'?alphaValues:drumValues;

  const cyclePart=(delta=1)=>{
    const current=PARTS.indexOf(partId);setPartId(PARTS[(current+delta+PARTS.length)%PARTS.length]);
  };
  const cyclePage=(delta=1)=>{
    const count=part.pages.length;const current=pageIndex[partId]??0;
    setPageIndex({...pageIndex,[partId]:(current+delta+count)%count});
  };
  const jumpPage=(id:string)=>{const i=part.pages.findIndex(p=>p.id===id);if(i>=0)setPageIndex({...pageIndex,[partId]:i})};
  const cycleScene=(delta=1)=>setSceneIndex((sceneIndex+delta+WORKSTATION_SCENES.length)%WORKSTATION_SCENES.length);

  const adjust=async(index:number,delta:number)=>{
    await workstation.start();
    if(partId==='drum808'){
      if(page.id==='kit'){
        if(index===0){setDrumVoice((drumVoice+delta+8)%8);return}
        const map=[null,{id:0,min:0,max:1.2,step:.04},{id:1,min:20,max:14000,step:drumVoice===0?2:20},{id:2,min:.02,max:2,step:.02}] as const;
        const b=map[index];if(!b)return;const v=Math.max(b.min,Math.min(b.max,(drumValues[b.id]??0)+delta*b.step));
        setDrumValues({...drumValues,[b.id]:v});workstation.setDrumVoiceParam(drumVoice as 0|1|2|3|4|5|6|7,b.id,v);return;
      }
      if(page.id==='tone'&&index===0){const v=Math.max(0,Math.min(1,(drumValues[3]??.55)+delta*.04));setDrumValues({...drumValues,3:v});workstation.setDrumVoiceParam(drumVoice as 0|1|2|3|4|5|6|7,3,v)}
      return;
    }
    const b=bindings?.[index];if(!b)return;
    const current=values[b.id]??b.initial;let v=Math.max(b.min,Math.min(b.max,current+delta*b.step));
    if(b.kind==='toggle'||b.kind==='wave'||b.kind==='mode')v=Math.round(v);
    if(partId==='mini'){setMiniValues({...miniValues,[b.id]:v});workstation.setMiniParam(b.id,v)}
    if(partId==='bass808'){setBassValues({...bassValues,[b.id]:v});workstation.setBassParam(b.id as never,v);await bass808.start();bass808.setParam(b.id as never,v)}
    if(partId==='alpha'){setAlphaValues({...alphaValues,[b.id]:v});workstation.setAlphaParam(b.id as never,v)}
  };

  const startScene=async()=>{
    await workstation.loadScene(scene);workstation.setMaster(master);workstation.play();
    const mini=MINI_DRONES[sceneIndex%MINI_DRONES.length];workstation.miniNoteOn(mini,76);
    for(const n of ALPHA_CHORDS[sceneIndex%ALPHA_CHORDS.length])workstation.alphaNoteOn(n,74);
    setPlaying(true);
  };
  const stopScene=()=>{
    workstation.stop();workstation.miniNoteOff(MINI_DRONES[sceneIndex%MINI_DRONES.length]);
    for(const n of ALPHA_CHORDS[sceneIndex%ALPHA_CHORDS.length])workstation.alphaNoteOff(n);
    setPlaying(false);
  };
  const toggleTransport=()=>playing?stopScene():void startScene();

  const keyDown=async(note:number,index:number)=>{
    if(held.includes(note))return;setHeld([...held,note]);await workstation.start();
    if(partId==='mini')workstation.miniNoteOn(note,108);
    else if(partId==='alpha')workstation.alphaNoteOn(note,108);
    else if(partId==='drum808')workstation.triggerDrum((index%8) as 0|1|2|3|4|5|6|7,112,false);
    else {await bass808.start();for(const [id,v] of Object.entries(bassValues))bass808.setParam(+id as never,v);await bass808.noteOn(note,{accent:false})}
  };
  const keyUp=(note:number)=>{
    setHeld(held.filter(n=>n!==note));
    if(partId==='mini')workstation.miniNoteOff(note);
    else if(partId==='alpha')workstation.alphaNoteOff(note);
    else if(partId==='bass808')bass808.noteOff();
  };

  const knobValue=(i:number)=>{
    if(partId==='drum808'){
      if(page.id==='kit')return [String(drumVoice+1),(drumValues[0]??.92).toFixed(2),`${Math.round(drumValues[1]??52)} Hz`,`${(drumValues[2]??.34).toFixed(2)} s`][i]??'—';
      if(page.id==='tone'&&i===0)return (drumValues[3]??.55).toFixed(2);
      return '—';
    }
    return pretty(bindings?.[i]??null,bindings?.[i]?values[bindings[i]!.id]:undefined);
  };

  const functionButton=(label:string)=>{
    if(label==='SEL')cyclePart();
    else if(label==='HOME')setPageIndex({...pageIndex,[partId]:0});
    else if(label==='ENV')jumpPage('env');
    else if(label==='LFO')jumpPage(partId==='alpha'?'lfo':'mod');
    else if(label==='SEQ')jumpPage('seq');
    else if(label==='ARP')jumpPage('perf');
    else if(label==='PLAY/STOP')toggleTransport();
    else if(label==='FX')cyclePage();
  };

  const keys=Array.from({length:27},(_,i)=>53+i);
  return <main className="fm1Stage">
    <div className="fm1Title"><strong>FMiniMug1 WORKSTATION V2</strong><span>VIRTUAL FM-1 · native WASM</span></div>
    <section className="fm1Device">
      <div className="fm1Top">
        <div className="fm1LeftControls">
          <HardwareKnob label="MASTER" value={`${Math.round(master*100)}%`} onDelta={d=>{const v=Math.max(0,Math.min(1.2,master+d*.04));setMaster(v);workstation.setMaster(v)}}/>
          <HardwareKnob label="SELECT" value={part.title} onDelta={cyclePart}/>
          <HardwareKnob label="PRESETS" value={String(sceneIndex+1).padStart(2,'0')} onDelta={cycleScene}/>
          <HardwareKnob label="ALGORITHM" value={`${(pageIndex[partId]??0)+1}/${part.pages.length}`} onDelta={cyclePage}/>
          <button className="fm1Oct" onClick={()=>cyclePage(-1)}>OCT−</button><button className="fm1Oct" onClick={()=>cyclePage(1)}>OCT+</button>
        </div>

        <div className="fm1DisplayBezel">
          <div className="fm1Display">
            <div className="displayHeader"><b>{part.title}</b><span>{playing?`▶ ${String(step+1).padStart(2,'0')}`:'■ READY'}</span></div>
            <div className="displayScene">{scene.name}<small>{scene.bpm} BPM · {scene.swing}% SWING · PEAK {(peak*100).toFixed(0)}%</small></div>
            <div className="displayPage"><strong>{page.title}</strong><span>{pageIndex[partId]+1}/{part.pages.length}</span></div>
            <div className="displayParams">{page.params.map((name,i)=><div key={name}><small>K{i+1}</small><b>{name}</b><em>{knobValue(i)}</em></div>)}</div>
            <div className="displayFooter"><span>MINI</span><span>808D</span><span>808B</span><span>ALPHA</span></div>
          </div>
        </div>

        <div className="fm1RightControls">
          <div className="fm1KnobRow">{page.params.map((name,i)=><HardwareKnob key={name} label={`KNOB${i+1}`} value={name} onDelta={d=>void adjust(i,d)}/>)}</div>
          <div className="fm1FunctionGrid">{['FX','SEL','ENV','LFO','EDIT','GLO','HOME','SAVE','ARP','SEQ','PLAY/STOP','REC'].map(label=><button key={label} className={label==='PLAY/STOP'&&playing?'active':''} onClick={()=>functionButton(label)}>{label}</button>)}</div>
        </div>
      </div>

      <div className="fm1UpperPads">{['OP1','OP2','OP3','OP4','OP5','OP6','P1','GLO','MONO','POLY'].map((x,i)=><button key={x} onClick={()=>{if(i<4)setPartId(PARTS[i])}}>{x}<span>{i<4?WORKSTATION_PARTS[i].title:''}</span></button>)}</div>
      <div className="fm1Keybed">{keys.map((note,i)=><button key={note} className={held.includes(note)?'held':''} onMouseDown={()=>void keyDown(note,i)} onMouseUp={()=>keyUp(note)} onMouseLeave={()=>held.includes(note)&&keyUp(note)}><i/><small>{NOTE_NAMES[note%12]}{Math.floor(note/12)-1}</small></button>)}</div>
    </section>
    <section className="fm1Status">
      <span><b>SELECT</b> switches MINI / 808 DRUM / 808 BASS / ALPHA</span>
      <span><b>PRESETS</b> changes full V2 demo scene</span>
      <span><b>PLAY/STOP</b> runs the complete workstation scene</span>
      <span><b>KNOB1–4</b> control the four values shown on the FM-1 display</span>
    </section>
  </main>;
}

function HardwareKnob({label,value,onDelta}:{label:string;value:string;onDelta:(delta:number)=>void}){
  return <div className="hardwareKnob"><label>{label}</label><button title="Mouse wheel, click = +, Shift+click = −" onWheel={e=>{e.preventDefault();onDelta(e.deltaY<0?1:-1)}} onClick={e=>onDelta(e.shiftKey?-1:1)}><span/></button><small>{value}</small></div>;
}
