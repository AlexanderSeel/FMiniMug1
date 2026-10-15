import React, {useEffect,useMemo,useRef,useState} from 'react';
import {PATCHES, SEQS, type Patch} from './data';
import './styles.css';

const midiToHz=(n:number)=>440*Math.pow(2,(n-69)/12);

class MiniEngine {
  ctx:AudioContext|null=null;
  master:GainNode|null=null;
  filter:BiquadFilterNode|null=null;
  active:{o:OscillatorNode,g:GainNode}[]=[];
  noise:AudioBufferSourceNode|null=null;
  patch=PATCHES[0];
  lastHz=110;

  async start(){
    if(!this.ctx){
      this.ctx=new AudioContext();
      this.master=this.ctx.createGain();
      this.master.gain.value=.45;
      this.master.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended') await this.ctx.resume();
  }

  stop(){
    this.active.forEach(x=>{try{x.o.stop()}catch{}});
    this.active=[];
    if(this.noise){try{this.noise.stop()}catch{};this.noise=null}
  }

  async noteOn(note:number,p=this.patch){
    await this.start();
    this.stop();
    this.patch=p;
    const c=this.ctx!,now=c.currentTime;
    const f=c.createBiquadFilter();
    f.type='lowpass';
    f.Q.value=p.res*22;
    f.frequency.setValueAtTime(Math.max(80,p.cutoff*.55),now);
    f.frequency.exponentialRampToValueAtTime(Math.min(15000,p.cutoff+p.env),now+p.attack+.01);
    f.frequency.exponentialRampToValueAtTime(Math.max(80,p.cutoff+p.env*p.sustain),now+p.attack+p.decay+.02);
    const sh=c.createWaveShaper();
    const curve=new Float32Array(1024);
    for(let i=0;i<1024;i++){
      const x=i/511.5-1;
      curve[i]=Math.tanh(x*p.drive);
    }
    sh.curve=curve;
    sh.oversample='2x';
    f.connect(sh);
    sh.connect(this.master!);
    this.filter=f;
    const target=midiToHz(note);
    for(let i=0;i<3;i++){
      const o=c.createOscillator(),g=c.createGain();
      o.type=p.osc[i];
      const drift=(Math.random()-.5)*p.drift*3;
      o.frequency.setValueAtTime(this.lastHz*Math.pow(2,(p.detune[i]+drift)/12),now);
      o.frequency.exponentialRampToValueAtTime(target*Math.pow(2,(p.detune[i]+drift)/12),now+Math.max(.003,p.glide));
      g.gain.setValueAtTime(.0001,now);
      g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]),now+p.attack+.002);
      g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]*p.sustain),now+p.attack+p.decay+.004);
      o.connect(g);
      g.connect(f);
      o.start();
      this.active.push({o,g});
    }
    this.lastHz=target;
  }

  noteOff(p=this.patch){
    if(!this.ctx)return;
    const now=this.ctx.currentTime;
    this.active.forEach(x=>{
      x.g.gain.cancelScheduledValues(now);
      x.g.gain.setTargetAtTime(.0001,now,Math.max(.01,p.release/4));
      setTimeout(()=>{try{x.o.stop()}catch{}},Math.max(40,p.release*1200));
    });
    this.active=[];
  }
}

const engine=new MiniEngine();

function Knob({label,value,min,max,onChange,unit=''}:{label:string,value:number,min:number,max:number,onChange:(v:number)=>void,unit?:string}){
  return <label className="knob">
    <span>{label}</span>
    <input type="range" min={min} max={max} step={(max-min)/200} value={value} onChange={e=>onChange(+e.target.value)}/>
    <b>{Math.round(value*100)/100}{unit}</b>
  </label>;
}

export default function App(){
  const [patch,setPatch]=useState(PATCHES[0]);
  const [page,setPage]=useState('OSC');
  const [seq,setSeq]=useState(SEQS[0]);
  const [playing,setPlaying]=useState(false);
  const timer=useRef<number|undefined>(undefined);
  const step=useRef(0);
  const [midi,setMidi]=useState('not connected');

  const update=(k:keyof Patch,v:Patch[keyof Patch])=>{
    const n={...patch,[k]:v} as Patch;
    setPatch(n);
    engine.patch=n;
  };
  const play=(n:number)=>engine.noteOn(n,patch);
  const stop=()=>engine.noteOff(patch);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      const map:Record<string,number>={a:48,w:49,s:50,e:51,d:52,f:53,t:54,g:55,z:56,h:57,u:58,j:59,k:60,o:61,l:62};
      if(map[e.key]!=null&&!e.repeat)play(map[e.key]);
    };
    const up=(e:KeyboardEvent)=>{if('awsedftgzhujkol'.includes(e.key))stop()};
    addEventListener('keydown',down);
    addEventListener('keyup',up);
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up)};
  },[patch]);

  useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);

  const toggleSeq=()=>{
    if(playing){
      if(timer.current)clearInterval(timer.current);
      timer.current=undefined;
      setPlaying(false);
      stop();
      return;
    }
    setPlaying(true);
    step.current=0;
    const tick=()=>{
      const i=step.current++%seq.notes.length;
      play(seq.notes[i]);
      setTimeout(stop,60000/seq.bpm*seq.gates[i]);
    };
    tick();
    timer.current=window.setInterval(tick,60000/seq.bpm);
  };

  const connectMidi=async()=>{
    try{
      const access=await navigator.requestMIDIAccess({sysex:true});
      const out=[...access.outputs.values()][0];
      if(!out){setMidi('No MIDI output');return}
      setMidi(out.name||'FM-1 MIDI');
      out.send([0x90,60,1]);
      out.send([0x80,60,0],performance.now()+20);
    }catch{
      setMidi('permission/connection failed');
    }
  };

  const controls=useMemo(()=>({
    OSC:<><Knob label="OSC1" value={patch.levels[0]} min={0} max={1} onChange={v=>update('levels',[v,patch.levels[1],patch.levels[2]])}/><Knob label="OSC2" value={patch.levels[1]} min={0} max={1} onChange={v=>update('levels',[patch.levels[0],v,patch.levels[2]])}/><Knob label="OSC3" value={patch.levels[2]} min={0} max={1} onChange={v=>update('levels',[patch.levels[0],patch.levels[1],v])}/><Knob label="Glide" value={patch.glide} min={0} max={.5} onChange={v=>update('glide',v)} unit="s"/></>,
    MIX:<><Knob label="Drive" value={patch.drive} min={.5} max={3} onChange={v=>update('drive',v)}/><Knob label="Drift" value={patch.drift} min={0} max={1} onChange={v=>update('drift',v)}/><Knob label="Detune 2" value={patch.detune[1]} min={-24} max={24} onChange={v=>update('detune',[patch.detune[0],v,patch.detune[2]])}/><Knob label="Detune 3" value={patch.detune[2]} min={-24} max={24} onChange={v=>update('detune',[patch.detune[0],patch.detune[1],v])}/></>,
    FILTER:<><Knob label="Cutoff" value={patch.cutoff} min={80} max={9000} onChange={v=>update('cutoff',v)} unit="Hz"/><Knob label="Emphasis" value={patch.res} min={0} max={1} onChange={v=>update('res',v)}/><Knob label="Contour" value={patch.env} min={0} max={7000} onChange={v=>update('env',v)}/><Knob label="Drive" value={patch.drive} min={.5} max={3} onChange={v=>update('drive',v)}/></>,
    CONTOUR:<><Knob label="Attack" value={patch.attack} min={.001} max={2} onChange={v=>update('attack',v)} unit="s"/><Knob label="Decay" value={patch.decay} min={.02} max={3} onChange={v=>update('decay',v)} unit="s"/><Knob label="Sustain" value={patch.sustain} min={.01} max={1} onChange={v=>update('sustain',v)}/><Knob label="Release" value={patch.release} min={.02} max={3} onChange={v=>update('release',v)} unit="s"/></>,
    MOD:<><Knob label="Drift" value={patch.drift} min={0} max={1} onChange={v=>update('drift',v)}/><Knob label="Glide" value={patch.glide} min={0} max={.5} onChange={v=>update('glide',v)}/><Knob label="Res" value={patch.res} min={0} max={1} onChange={v=>update('res',v)}/><Knob label="Env" value={patch.env} min={0} max={7000} onChange={v=>update('env',v)}/></>,
    SEQ:<div className="steps">{seq.notes.map((n,i)=><button key={i} onMouseDown={()=>play(n)} onMouseUp={stop}><small>{i+1}</small>{n}</button>)}</div>
  })[page],[patch,seq]);

  const keys=[48,50,52,53,55,57,59,60,62,64,65,67,69,71,72];

  return <main>
    <header>
      <div><h1>FMiniMug1</h1><p>FM-1 · classic 3-OSC ladder performance synth</p></div>
      <button onClick={connectMidi}>MIDI · {midi}</button>
    </header>
    <section className="panel">
      <div className="panelTitle">
        <span>PERFORMANCE CONTROL</span>
        <strong>{patch.name}</strong>
        <select value={patch.name} onChange={e=>{const p=PATCHES.find(x=>x.name===e.target.value)!;setPatch(p);engine.patch=p}}>
          {PATCHES.map(p=><option key={p.name}>{p.name} · {p.category}</option>)}
        </select>
      </div>
      <nav>{['OSC','MIX','FILTER','CONTOUR','MOD','SEQ'].map(x=><button key={x} className={page===x?'active':''} onClick={()=>setPage(x)}>{x}</button>)}</nav>
      <div className="screen">
        <div className="lcd">
          <span>FMiniMug1 / {page}</span>
          <strong>{patch.name}</strong>
          <i>{page==='FILTER'?`CUT ${Math.round(patch.cutoff)}  EMP ${Math.round(patch.res*100)}%`:page==='CONTOUR'?`A ${patch.attack.toFixed(2)} D ${patch.decay.toFixed(2)} S ${Math.round(patch.sustain*100)} R ${patch.release.toFixed(2)}`:'4 ENCODERS · HOLD = FINE'}</i>
        </div>
        <div className="controls">{controls}</div>
      </div>
      <div className="seqbar">
        <select value={seq.name} onChange={e=>setSeq(SEQS.find(x=>x.name===e.target.value)!)}>
          {SEQS.map(s=><option key={s.name}>{s.name} · {s.bpm} BPM</option>)}
        </select>
        <button className={playing?'stop':''} onClick={toggleSeq}>{playing?'STOP':'PLAY SEQUENCE'}</button>
        <span>{PATCHES.length} patches · {SEQS.length} sequences · Keyboard: A W S E D F T G Z H U J K O L</span>
      </div>
      <div className="keyboard">{keys.map(n=><button key={n} onMouseDown={()=>play(n)} onMouseUp={stop} onMouseLeave={stop}>{['C','D','E','F','G','A','B'][[0,2,4,5,7,9,11].indexOf(n%12)]||'•'}<small>{n}</small></button>)}</div>
    </section>
    <footer>Original FMiniMug1 UI and factory patches · Minimoog-inspired workflow · not affiliated with Moog Music or M-VAVE.</footer>
  </main>;
}
