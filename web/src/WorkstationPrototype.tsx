import {useMemo,useState} from 'react';
import {WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {bass808,BASS808_PARAM,type Bass808ParamId} from './audio/bass808';
import './workstation.css';

const PART_KEYS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];
type BassBinding={id:Bass808ParamId,min:number,max:number,step:number,initial:number};
const BASS_BINDINGS:Record<string,(BassBinding|null)[]>={
  osc:[
    {id:BASS808_PARAM.wave,min:0,max:1,step:1,initial:0},
    {id:BASS808_PARAM.tune,min:-12,max:12,step:.25,initial:0},
    {id:BASS808_PARAM.sub,min:0,max:.7,step:.02,initial:.12},
    {id:BASS808_PARAM.drive,min:.5,max:4,step:.05,initial:1.35}
  ],
  filter:[
    {id:BASS808_PARAM.cutoff,min:35,max:8000,step:40,initial:640},
    {id:BASS808_PARAM.resonance,min:0,max:1,step:.02,initial:.62},
    {id:BASS808_PARAM.envMod,min:0,max:6000,step:50,initial:2200},
    {id:BASS808_PARAM.accent,min:0,max:1.25,step:.02,initial:.62}
  ],
  env:[
    {id:BASS808_PARAM.decay,min:.02,max:2,step:.02,initial:.28},
    {id:BASS808_PARAM.slide,min:.005,max:.5,step:.005,initial:.085},
    null,
    {id:BASS808_PARAM.accentDecay,min:.02,max:1,step:.01,initial:.16}
  ],
  seq:[null,null,null,null],perf:[null,null,null,null]
};
const INITIAL_BASS:Record<number,number>={};
for(const bindings of Object.values(BASS_BINDINGS))for(const b of bindings)if(b)INITIAL_BASS[b.id]=b.initial;

export function WorkstationPrototype(){
  const [partId,setPartId]=useState<WorkstationPartId>('mini');
  const [pages,setPages]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [focus,setFocus]=useState<number|null>(null);
  const [hold,setHold]=useState(false);
  const [bassValues,setBassValues]=useState<Record<number,number>>({...INITIAL_BASS});
  const [bassPlaying,setBassPlaying]=useState(false);
  const part=useMemo(()=>WORKSTATION_PARTS.find(x=>x.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pages[partId]??0]??part.pages[0];

  const choosePart=(id:WorkstationPartId)=>{setPartId(id);setFocus(null)};
  const movePage=(delta:number)=>{
    const count=part.pages.length;
    const current=pages[partId]??0;
    const next=(current+delta+count)%count;
    setPages({...pages,[partId]:next});setFocus(null);
  };
  const rotate=async(index:number,delta:number)=>{
    const event=new CustomEvent('fmw-encoder',{detail:{part:partId,page:page.id,index,delta,hold}});
    window.dispatchEvent(event);
    if(partId!=='bass808')return;
    const binding=BASS_BINDINGS[page.id]?.[index];
    if(!binding)return;
    const current=bassValues[binding.id]??binding.initial;
    const value=Math.max(binding.min,Math.min(binding.max,current+delta*binding.step));
    setBassValues({...bassValues,[binding.id]:value});
    await bass808.start();bass808.setParam(binding.id,value);
  };
  const bassTestOn=async()=>{if(partId!=='bass808')return;await bass808.start();for(const [id,value] of Object.entries(bassValues))bass808.setParam(+id as Bass808ParamId,value);await bass808.noteOn(36,{accent:hold});setBassPlaying(true)};
  const bassTestOff=()=>{if(partId!=='bass808')return;bass808.noteOff();setBassPlaying(false)};
  const valueFor=(index:number)=>{
    if(partId!=='bass808')return hold?'HOLD':'PRIMARY';
    const binding=BASS_BINDINGS[page.id]?.[index];if(!binding)return hold?'HOLD':'PRIMARY';
    const value=bassValues[binding.id]??binding.initial;
    if(binding.id===BASS808_PARAM.wave)return value>=.5?'SQUARE':'SAW';
    if(binding.id===BASS808_PARAM.cutoff||binding.id===BASS808_PARAM.envMod)return `${Math.round(value)} Hz`;
    if(binding.id===BASS808_PARAM.decay||binding.id===BASS808_PARAM.slide||binding.id===BASS808_PARAM.accentDecay)return `${value.toFixed(3)} s`;
    return value.toFixed(2);
  };

  return <section className="workstationPrototype">
    <div className="workstationHeading"><div><strong>WORKSTATION V2 · SHARED HARDWARE/VIRTUAL UI</strong><span>generated from shared/workstation.json</span></div><b>{part.title}</b></div>
    <div className="partStrip">{PART_KEYS.map(id=>{const p=WORKSTATION_PARTS.find(x=>x.id===id)!;return <button key={id} className={partId===id?'active':''} onClick={()=>choosePart(id)}>{p.title}<small>{p.subtitle}</small></button>})}</div>
    <div className="virtualHardware">
      <div className="sideButtons"><button onClick={()=>movePage(-1)}>◀ PAGE</button><button className={hold?'active':''} onMouseDown={()=>setHold(true)} onMouseUp={()=>setHold(false)} onMouseLeave={()=>setHold(false)}>HOLD</button></div>
      <div className="nativeScreen">
        <header><span>{part.title}</span><b>{page.title}</b></header>
        <div className="screenMeta">{part.subtitle} · {part.polyphony} voice{part.polyphony===1?'':'s'}{partId==='bass808'?' · NATIVE WASM':''}</div>
        <div className="screenParams">{page.params.map((name,index)=><button key={name} className={focus===index?'focused':''} onClick={()=>setFocus(focus===index?null:index)}><small>E{index+1}</small><strong>{name}</strong><em>{valueFor(index)}</em></button>)}</div>
        <footer><span>{String((pages[partId]??0)+1).padStart(2,'0')}/{String(part.pages.length).padStart(2,'0')}</span><span>{focus===null?'TURN ENCODERS':'FOCUS E'+(focus+1)}</span></footer>
      </div>
      <div className="sideButtons"><button onClick={()=>movePage(1)}>PAGE ▶</button>{partId==='bass808'?<button className={bassPlaying?'active':''} onMouseDown={()=>void bassTestOn()} onMouseUp={bassTestOff} onMouseLeave={bassTestOff}>TEST NOTE</button>:<button>PLAY</button>}</div>
      <div className="virtualEncoders">{page.params.map((name,index)=><div key={name}><button onClick={()=>void rotate(index,-1)}>−</button><button className={focus===index?'active':''} onClick={()=>setFocus(focus===index?null:index)}>E{index+1}</button><button onClick={()=>void rotate(index,1)}>+</button><span>{name}</span></div>)}</div>
    </div>
    <p className="prototypeNote">Canonical interaction shell. MINI remains the existing core. 808 BASS is already the same native C engine in WASM; DRUM and ALPHA follow this exact part/page/control contract.</p>
  </section>;
}
