import React, {useEffect,useMemo,useRef,useState} from 'react';
import {PATCHES, SEQS, type Patch} from './data';
import {engine, type EngineMode, type Meter} from './audio/engine';
import './styles.css';

function Knob({label,value,min,max,onChange,unit=''}:{label:string,value:number,min:number,max:number,onChange:(v:number)=>void,unit?:string}){
  return <label className="knob">
    <span>{label}</span>
    <input type="range" min={min} max={max} step={(max-min)/200} value={value} onChange={e=>onChange(+e.target.value)}/>
    <b>{Math.round(value*100)/100}{unit}</b>
  </label>;
}

function Diagnostics(){
  const canvas=useRef<HTMLCanvasElement|null>(null);
  const [mode,setMode]=useState<EngineMode>(engine.mode);
  const [meter,setMeter]=useState<Meter>({peak:0,rms:0,step:0});

  useEffect(()=>{
    const offMode=engine.onMode(setMode);
    const offMeter=engine.onMeter(setMeter);
    let frame=0;
    const draw=()=>{
      const c=canvas.current,a=engine.analyser;
      if(c&&a){
        const g=c.getContext('2d');
        if(g){
          const wave=new Uint8Array(a.fftSize);
          const bins=new Uint8Array(a.frequencyBinCount);
          a.getByteTimeDomainData(wave);a.getByteFrequencyData(bins);
          g.clearRect(0,0,c.width,c.height);
          g.strokeStyle='#f2a640';g.lineWidth=1.5;g.beginPath();
          for(let i=0;i<wave.length;i+=4){const x=i/(wave.length-1)*c.width,y=(wave[i]/255)*c.height*.52;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();
          const base=c.height*.58;
          g.fillStyle='rgba(242,166,64,.45)';
          const count=64,bw=c.width/count;
          for(let i=0;i<count;i++){const v=bins[Math.floor(i*bins.length/count)]/255;g.fillRect(i*bw,c.height,Math.max(1,bw-1),-(c.height-base)*v)}
        }
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>{offMode();offMeter();cancelAnimationFrame(frame)};
  },[]);

  return <div className="diagnostics">
    <div className="diagHead"><strong>DSP MONITOR</strong><span>STEP {String((meter.step??0)+1).padStart(2,'0')}</span><span className={`engineMode ${mode}`}>{mode==='native-wasm'?'NATIVE DSP / WASM':mode==='web-audio-fallback'?'WEB AUDIO FALLBACK':'DSP IDLE'}</span></div>
    <canvas ref={canvas} width={620} height={118}/>
    <div className="meters"><span>PEAK {(meter.peak*100).toFixed(1)}%</span><i><b style={{width:`${Math.min(100,meter.peak*100)}%`}}/></i><span>RMS {(meter.rms*100).toFixed(1)}%</span><i><b style={{width:`${Math.min(100,meter.rms*100)}%`}}/></i></div>
  </div>;
}

export default function App(){
  const [patch,setPatch]=useState(PATCHES[0]);
  const [page,setPage]=useState('OSC');
  const [seq,setSeq]=useState(SEQS[0]);
  const [playing,setPlaying]=useState(false);
  const [midi,setMidi]=useState('not connected');

  const update=(k:keyof Patch,v:Patch[keyof Patch])=>{
    const n={...patch,[k]:v} as Patch;
    setPatch(n);engine.applyPatch(n);
  };
  const choosePatch=(p:Patch)=>{setPatch(p);engine.applyPatch(p)};
  const play=(n:number)=>engine.noteOn(n,patch);
  const stop=()=>engine.noteOff(patch);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      const map:Record<string,number>={a:48,w:49,s:50,e:51,d:52,f:53,t:54,g:55,z:56,h:57,u:58,j:59,k:60,o:61,l:62};
      if(map[e.key]!=null&&!e.repeat)play(map[e.key]);
    };
    const up=(e:KeyboardEvent)=>{if('awsedftgzhujkol'.includes(e.key))stop()};
    addEventListener('keydown',down);addEventListener('keyup',up);
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up)};
  },[patch]);

  useEffect(()=>()=>engine.stopSequence(),[]);

  const toggleSeq=async()=>{
    if(playing){engine.stopSequence();setPlaying(false);return}
    await engine.startSequence(seq);
    setPlaying(true);
  };

  const chooseSequence=async(name:string)=>{
    const next=SEQS.find(x=>x.name===name)!;
    setSeq(next);
    if(playing)await engine.startSequence(next);
  };

  const connectMidi=async()=>{
    try{
      const access=await navigator.requestMIDIAccess({sysex:true});
      const out=[...access.outputs.values()][0];
      if(!out){setMidi('No MIDI output');return}
      setMidi(out.name||'FM-1 MIDI');out.send([0x90,60,1]);out.send([0x80,60,0],performance.now()+20);
    }catch{setMidi('permission/connection failed')}
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
    <header><div><h1>FMiniMug1</h1><p>FM-1 · native 3-OSC ladder performance synth</p></div><button onClick={connectMidi}>MIDI · {midi}</button></header>
    <section className="panel">
      <div className="panelTitle"><span>PERFORMANCE CONTROL</span><strong>{patch.name}</strong><select value={patch.name} onChange={e=>choosePatch(PATCHES.find(x=>x.name===e.target.value)!)}>{PATCHES.map(p=><option key={p.name}>{p.name} · {p.category}</option>)}</select></div>
      <nav>{['OSC','MIX','FILTER','CONTOUR','MOD','SEQ'].map(x=><button key={x} className={page===x?'active':''} onClick={()=>setPage(x)}>{x}</button>)}</nav>
      <div className="screen"><div className="lcd"><span>FMiniMug1 / {page}</span><strong>{patch.name}</strong><i>{page==='FILTER'?`CUT ${Math.round(patch.cutoff)}  EMP ${Math.round(patch.res*100)}%`:page==='CONTOUR'?`A ${patch.attack.toFixed(2)} D ${patch.decay.toFixed(2)} S ${Math.round(patch.sustain*100)} R ${patch.release.toFixed(2)}`:'4 ENCODERS · HOLD = FINE · PRESS = FOCUS'}</i></div><div className="controls">{controls}</div></div>
      <Diagnostics/>
      <div className="seqbar"><select value={seq.name} onChange={e=>void chooseSequence(e.target.value)}>{SEQS.map(s=><option key={s.name}>{s.name} · {s.bpm} BPM</option>)}</select><button className={playing?'stop':''} onClick={()=>void toggleSeq()}>{playing?'STOP':'PLAY SEQUENCE'}</button><span>{PATCHES.length} patches · {SEQS.length} sequences · native sample-clock transport · Keyboard: A W S E D F T G Z H U J K O L</span></div>
      <div className="keyboard">{keys.map(n=><button key={n} onMouseDown={()=>play(n)} onMouseUp={stop} onMouseLeave={stop}>{['C','D','E','F','G','A','B'][[0,2,4,5,7,9,11].indexOf(n%12)]||'•'}<small>{n}</small></button>)}</div>
    </section>
    <footer>Original FMiniMug1 UI and sound bank · native DSP and sequencer shared with the firmware target · not affiliated with Moog Music or M-VAVE.</footer>
  </main>;
}
