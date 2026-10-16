import {useMemo,useState} from 'react';
import {WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';

const PART_KEYS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];

export function WorkstationPrototype(){
  const [partId,setPartId]=useState<WorkstationPartId>('mini');
  const [pages,setPages]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [focus,setFocus]=useState<number|null>(null);
  const [hold,setHold]=useState(false);
  const part=useMemo(()=>WORKSTATION_PARTS.find(x=>x.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pages[partId]??0]??part.pages[0];

  const choosePart=(id:WorkstationPartId)=>{setPartId(id);setFocus(null)};
  const movePage=(delta:number)=>{
    const count=part.pages.length;
    const current=pages[partId]??0;
    const next=(current+delta+count)%count;
    setPages({...pages,[partId]:next});setFocus(null);
  };
  const rotate=(index:number,delta:number)=>{
    // UI-parity prototype: native engines will bind these four slots to values.
    const event=new CustomEvent('fmw-encoder',{detail:{part:partId,page:page.id,index,delta,hold}});
    window.dispatchEvent(event);
  };

  return <section className="workstationPrototype">
    <div className="workstationHeading"><div><strong>WORKSTATION V2 · SHARED HARDWARE/VIRTUAL UI</strong><span>generated from shared/workstation.json</span></div><b>{part.title}</b></div>
    <div className="partStrip">{PART_KEYS.map(id=>{const p=WORKSTATION_PARTS.find(x=>x.id===id)!;return <button key={id} className={partId===id?'active':''} onClick={()=>choosePart(id)}>{p.title}<small>{p.subtitle}</small></button>})}</div>
    <div className="virtualHardware">
      <div className="sideButtons"><button onClick={()=>movePage(-1)}>◀ PAGE</button><button className={hold?'active':''} onMouseDown={()=>setHold(true)} onMouseUp={()=>setHold(false)} onMouseLeave={()=>setHold(false)}>HOLD</button></div>
      <div className="nativeScreen">
        <header><span>{part.title}</span><b>{page.title}</b></header>
        <div className="screenMeta">{part.subtitle} · {part.polyphony} voice{part.polyphony===1?'':'s'}</div>
        <div className="screenParams">{page.params.map((name,index)=><button key={name} className={focus===index?'focused':''} onClick={()=>setFocus(focus===index?null:index)}><small>E{index+1}</small><strong>{name}</strong><em>{hold?'HOLD':'PRIMARY'}</em></button>)}</div>
        <footer><span>{String((pages[partId]??0)+1).padStart(2,'0')}/{String(part.pages.length).padStart(2,'0')}</span><span>{focus===null?'TURN ENCODERS':'FOCUS E'+(focus+1)}</span></footer>
      </div>
      <div className="sideButtons"><button onClick={()=>movePage(1)}>PAGE ▶</button><button>PLAY</button></div>
      <div className="virtualEncoders">{page.params.map((name,index)=><div key={name}><button onClick={()=>rotate(index,-1)}>−</button><button className={focus===index?'active':''} onClick={()=>setFocus(focus===index?null:index)}>E{index+1}</button><button onClick={()=>rotate(index,1)}>+</button><span>{name}</span></div>)}</div>
    </div>
    <p className="prototypeNote">This is the new canonical interaction shell. MINI audio is already native/WASM; 808 DRUM, 808 BASS and ALPHA are connected to this same shell as their native engines land.</p>
  </section>;
}
