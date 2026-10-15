import React, {useEffect,useRef,useState} from 'react';
import {PATCHES, SEQS, type Patch} from './data';
import {engine, type EngineMode, type Meter} from './audio/engine';
import './styles.css';

type Page='OSC'|'MIX'|'FILTER'|'CONTOUR'|'MOD'|'SEQ';

function Knob({label,value,min,max,onChange,unit=''}:{label:string,value:number,min:number,max:number,onChange:(v:number)=>void,unit?:string}){
  return <label className="knob">
    <span>{label}</span>
    <input type="range" min={min} max={max} step={(max-min)/200} value={value} onChange={e=>onChange(+e.target.value)}/>
    <b>{Math.round(value*100)/100}{unit}</b>
  </label>;
}

const RANGE_LABELS=["32'","16'","8'","4'","2'"];
const PRIORITY_LABELS=['LOW','HIGH','LAST'];
const GLIDE_LABELS=['TIME','RATE'];
const PAGES:Page[]=['OSC','MIX','FILTER','CONTOUR','MOD','SEQ'];

function RangeControl({label,value,onChange}:{label:string,value:number,onChange:(v:number)=>void}){
  return <label className="knob rangeControl">
    <span>{label} RANGE</span>
    <strong>{RANGE_LABELS[value]??"8'"}</strong>
    <select value={value} onChange={e=>onChange(+e.target.value)}>{RANGE_LABELS.map((x,i)=><option value={i} key={x}>{x}</option>)}</select>
    <b>classic octave</b>
  </label>;
}

function SwitchControl({label,on,onToggle,onText='ON',offText='OFF',hint}:{label:string,on:boolean,onToggle:()=>void,onText?:string,offText?:string,hint:string}){
  return <label className="knob rangeControl">
    <span>{label}</span>
    <strong>{on?onText:offText}</strong>
    <button onClick={onToggle}>{on?'ENABLED':'DISABLED'}</button>
    <b>{hint}</b>
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
  const [page,setPage]=useState<Page>('OSC');
  const [seq,setSeq]=useState(SEQS[0]);
  const [playing,setPlaying]=useState(false);
  const [activeStep,setActiveStep]=useState(0);
  const [midi,setMidi]=useState('not connected');
  const [ranges,setRanges]=useState<[number,number,number]>([2,2,2]);
  const [filterContour,setFilterContour]=useState<[number,number,number,number]>([patch.attack,patch.decay,patch.sustain,patch.release]);
  const [contourTarget,setContourTarget]=useState<'amp'|'filter'>('amp');
  const [retrigger,setRetrigger]=useState(false);
  const [priority,setPriority]=useState(0);
  const [ampDecaySwitch,setAmpDecaySwitch]=useState(false);
  const [filterDecaySwitch,setFilterDecaySwitch]=useState(false);
  const [glideMode,setGlideMode]=useState(0);

  const update=(k:keyof Patch,v:Patch[keyof Patch])=>{
    const n={...patch,[k]:v} as Patch;
    setPatch(n);engine.applyPatch(n);
  };
  const choosePatch=(p:Patch)=>{
    const contour:[number,number,number,number]=[p.attack,p.decay,p.sustain,p.release];
    setPatch(p);setFilterContour(contour);engine.setFilterContour(contour);engine.applyPatch(p);
  };
  const choosePatchByName=(name:string)=>{
    const next=PATCHES.find(x=>x.name===name);
    if(!next){console.warn('Unknown FMiniMug1 patch',name);return}
    choosePatch(next);
  };
  const setRange=(index:0|1|2,value:number)=>{
    const next=[...ranges] as [number,number,number];next[index]=value;setRanges(next);engine.setOscRange(index,value);
  };
  const setFilterEnv=(index:0|1|2|3,value:number)=>{
    const next=[...filterContour] as [number,number,number,number];next[index]=value;setFilterContour(next);engine.setFilterContour(next);
  };
  const toggleRetrigger=()=>{const next=!retrigger;setRetrigger(next);engine.setRetrigger(next)};
  const changePriority=(value:number)=>{setPriority(value);engine.setNotePriority(value)};
  const toggleAmpDecay=()=>{const next=!ampDecaySwitch;setAmpDecaySwitch(next);engine.setAmpDecaySwitch(next)};
  const toggleFilterDecay=()=>{const next=!filterDecaySwitch;setFilterDecaySwitch(next);engine.setFilterDecaySwitch(next)};
  const changeGlideMode=(value:number)=>{setGlideMode(value);engine.setGlideMode(value)};
  const play=(n:number)=>engine.noteOn(n,patch);
  const stop=(n?:number)=>engine.noteOff(n,patch);

  useEffect(()=>{
    const map:Record<string,number>={a:48,w:49,s:50,e:51,d:52,f:53,t:54,g:55,z:56,h:57,u:58,j:59,k:60,o:61,l:62};
    const down=(e:KeyboardEvent)=>{if(map[e.key]!=null&&!e.repeat)play(map[e.key])};
    const up=(e:KeyboardEvent)=>{if(map[e.key]!=null)stop(map[e.key])};
    addEventListener('keydown',down);addEventListener('keyup',up);
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up)};
  },[patch,ranges,filterContour,priority,retrigger,ampDecaySwitch,filterDecaySwitch,glideMode]);

  useEffect(()=>{
    const off=engine.onMeter(m=>{if(m.step!==undefined)setActiveStep(m.step)});
    return()=>{off()};
  },[]);
  useEffect(()=>()=>engine.stopSequence(),[]);

  const toggleSeq=async()=>{
    if(playing){engine.stopSequence();setPlaying(false);setActiveStep(0);return}
    await engine.startSequence(seq);
    setActiveStep(0);setPlaying(true);
  };

  const chooseSequence=async(name:string)=>{
    const next=SEQS.find(x=>x.name===name);
    if(!next){console.warn('Unknown FMiniMug1 sequence',name);return}
    setSeq(next);setActiveStep(0);
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

  const ampControls=<><Knob label="A ATTACK" value={patch.attack} min={.001} max={2} onChange={v=>update('attack',v)} unit="s"/><Knob label="A DECAY" value={patch.decay} min={.02} max={3} onChange={v=>update('decay',v)} unit="s"/><Knob label="A SUSTAIN" value={patch.sustain} min={.01} max={1} onChange={v=>update('sustain',v)}/><SwitchControl label="LOUDNESS DECAY" on={ampDecaySwitch} onToggle={toggleAmpDecay} onText="DECAY" offText="RELEASE" hint={ampDecaySwitch?'release uses decay time':'independent release'}/></>;
  const filterControls=<><Knob label="F ATTACK" value={filterContour[0]} min={.001} max={2} onChange={v=>setFilterEnv(0,v)} unit="s"/><Knob label="F DECAY" value={filterContour[1]} min={.02} max={3} onChange={v=>setFilterEnv(1,v)} unit="s"/><Knob label="F SUSTAIN" value={filterContour[2]} min={.01} max={1} onChange={v=>setFilterEnv(2,v)}/><SwitchControl label="FILTER DECAY" on={filterDecaySwitch} onToggle={toggleFilterDecay} onText="DECAY" offText="RELEASE" hint={filterDecaySwitch?'release uses decay time':'independent release'}/></>;

  const panels:Record<Page,React.ReactNode>={
    OSC:<><RangeControl label="OSC1" value={ranges[0]} onChange={v=>setRange(0,v)}/><RangeControl label="OSC2" value={ranges[1]} onChange={v=>setRange(1,v)}/><RangeControl label="OSC3" value={ranges[2]} onChange={v=>setRange(2,v)}/><label className="knob rangeControl"><span>GLIDE</span><strong>{GLIDE_LABELS[glideMode]}</strong><select value={glideMode} onChange={e=>changeGlideMode(+e.target.value)}>{GLIDE_LABELS.map((x,i)=><option key={x} value={i}>{x}</option>)}</select><Knob label="TIME / RATE" value={patch.glide} min={0} max={.5} onChange={v=>update('glide',v)} unit="s"/></label></>,
    MIX:<><Knob label="Drive" value={patch.drive} min={.5} max={3} onChange={v=>update('drive',v)}/><Knob label="Drift" value={patch.drift} min={0} max={1} onChange={v=>update('drift',v)}/><Knob label="Detune 2" value={patch.detune[1]} min={-24} max={24} onChange={v=>update('detune',[patch.detune[0],v,patch.detune[2]])}/><Knob label="Detune 3" value={patch.detune[2]} min={-24} max={24} onChange={v=>update('detune',[patch.detune[0],patch.detune[1],v])}/></>,
    FILTER:<><Knob label="Cutoff" value={patch.cutoff} min={80} max={9000} onChange={v=>update('cutoff',v)} unit="Hz"/><Knob label="Emphasis" value={patch.res} min={0} max={1} onChange={v=>update('res',v)}/><Knob label="Contour" value={patch.env} min={0} max={7000} onChange={v=>update('env',v)}/><Knob label="Drive" value={patch.drive} min={.5} max={3} onChange={v=>update('drive',v)}/></>,
    CONTOUR:<>{contourTarget==='amp'?ampControls:filterControls}</>,
    MOD:<><Knob label="Drift" value={patch.drift} min={0} max={1} onChange={v=>update('drift',v)}/><Knob label="Glide" value={patch.glide} min={0} max={.5} onChange={v=>update('glide',v)}/><label className="knob rangeControl"><span>NOTE PRIORITY</span><strong>{PRIORITY_LABELS[priority]}</strong><select value={priority} onChange={e=>changePriority(+e.target.value)}>{PRIORITY_LABELS.map((x,i)=><option value={i} key={x}>{x}</option>)}</select><b>low / high / last</b></label><label className="knob rangeControl"><span>ENVELOPE MODE</span><strong>{retrigger?'RETRIGGER':'LEGATO'}</strong><button onClick={toggleRetrigger}>{retrigger?'EVERY NOTE':'SINGLE TRIGGER'}</button><b>classic legato behavior</b></label></>,
    SEQ:<div className="steps">{seq.notes.map((n,i)=><button key={i} className={playing&&activeStep===i?'activeStep':''} onMouseDown={()=>play(n)} onMouseUp={()=>stop(n)}><small>{i+1}</small>{n}</button>)}</div>
  };
  const controls=panels[page];

  const keys=[48,50,52,53,55,57,59,60,62,64,65,67,69,71,72];
  const contourText=contourTarget==='amp'?[patch.attack,patch.decay,patch.sustain,patch.release]:filterContour;
  const decayLinked=contourTarget==='amp'?ampDecaySwitch:filterDecaySwitch;

  return <main>
    <header><div><h1>FMiniMug1</h1><p>FM-1 · native 3-OSC ladder performance synth</p></div><button onClick={connectMidi}>MIDI · {midi}</button></header>
    <section className="panel">
      <div className="panelTitle"><span>PERFORMANCE CONTROL</span><strong>{patch.name}</strong><select value={patch.name} onChange={e=>choosePatchByName(e.target.value)}>{PATCHES.map(p=><option key={p.name} value={p.name}>{p.name} · {p.category}</option>)}</select></div>
      <nav>{PAGES.map(x=><button key={x} className={page===x?'active':''} onClick={()=>setPage(x)}>{x}</button>)}</nav>
      <div className="screen"><div className="lcd"><span>FMiniMug1 / {page}</span><strong>{patch.name}</strong><i>{page==='OSC'?`RANGE ${RANGE_LABELS[ranges[0]]} · ${RANGE_LABELS[ranges[1]]} · ${RANGE_LABELS[ranges[2]]} · GLIDE ${GLIDE_LABELS[glideMode]}`:page==='FILTER'?`CUT ${Math.round(patch.cutoff)}  EMP ${Math.round(patch.res*100)}%`:page==='CONTOUR'?`${contourTarget.toUpperCase()} · A ${contourText[0].toFixed(2)} D ${contourText[1].toFixed(2)} S ${Math.round(contourText[2]*100)} · ${decayLinked?'DECAY LINK':'FREE RELEASE'}`:page==='MOD'?`${PRIORITY_LABELS[priority]} PRIORITY · ${retrigger?'RETRIGGER':'SINGLE TRIGGER'}`:'4 ENCODERS · HOLD = SECONDARY · PRESS = FOCUS'}</i>{page==='CONTOUR'&&<button className="lcdMode" onClick={()=>setContourTarget(contourTarget==='amp'?'filter':'amp')}>{contourTarget==='amp'?'LOUDNESS → FILTER':'FILTER → LOUDNESS'}</button>}</div><div className="controls">{controls}</div></div>
      <Diagnostics/>
      <div className="seqbar"><select value={seq.name} onChange={e=>void chooseSequence(e.target.value)}>{SEQS.map(s=><option key={s.name} value={s.name}>{s.name} · {s.bpm} BPM</option>)}</select><button className={playing?'stop':''} onClick={()=>void toggleSeq()}>{playing?'STOP':'PLAY SEQUENCE'}</button><span>{PATCHES.length} patches · {SEQS.length} sequences · native sample-clock transport · Keyboard: A W S E D F T G Z H U J K O L</span></div>
      <div className="keyboard">{keys.map(n=><button key={n} onMouseDown={()=>play(n)} onMouseUp={()=>stop(n)} onMouseLeave={()=>stop(n)}>{['C','D','E','F','G','A','B'][[0,2,4,5,7,9,11].indexOf(n%12)]||'•'}<small>{n}</small></button>)}</div>
    </section>
    <footer>Original FMiniMug1 UI and sound bank · native DSP and sequencer shared with the firmware target · not affiliated with Moog Music or M-VAVE.</footer>
  </main>;
}
