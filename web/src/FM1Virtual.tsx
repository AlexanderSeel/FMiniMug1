import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {WORKSTATION_GLOBAL_PAGES,WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {workstation} from './audio/workstation';
import {BASS808_PARAM} from './audio/bass808';
import {ALPHA_PARAM} from './audio/alpha';
import {PARAM} from './generated/params';
import {WORKSTATION_SCENES} from './data/workstationScenes';
import './fm1Virtual.css';

type Binding={id:number;min:number;max:number;step:number;initial:number;unit?:string;kind?:'toggle'|'wave'|'mode'};
type ActiveNote={note:number;index:number;part:WorkstationPartId};

const PARTS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const COMPUTER_KEYS=['KeyZ','KeyS','KeyX','KeyD','KeyC','KeyV','KeyG','KeyB','KeyH','KeyN','KeyJ','KeyM','Comma','KeyL','Period','Semicolon','Slash','KeyQ','Digit2','KeyW','Digit3','KeyE','KeyR','Digit5','KeyT','Digit6','KeyY'];
const ALPHA_CHORDS=[[48,55,60],[45,52,57],[50,57,62],[43,50,55],[48,52,55]];
const MINI_DRONES=[60,64,55,48,60];

const MINI:Record<string,(Binding|null)[]>={
  osc:[{id:PARAM.osc1Level,min:0,max:1,step:.04,initial:.8},{id:PARAM.osc2Level,min:0,max:1,step:.04,initial:.55},{id:PARAM.osc3Level,min:0,max:1,step:.04,initial:.35},{id:PARAM.glide,min:0,max:1.5,step:.02,initial:.05,unit:'s'}],
  mix:[{id:PARAM.mixerDrive,min:.5,max:4,step:.08,initial:1.2},{id:PARAM.filterDrive,min:.5,max:4,step:.08,initial:1.1},{id:PARAM.feedback,min:0,max:.95,step:.03,initial:.08},null],
  filter:[{id:PARAM.cutoff,min:40,max:12000,step:100,initial:1800,unit:'Hz'},{id:PARAM.res,min:0,max:1,step:.03,initial:.35},{id:PARAM.env,min:-6000,max:6000,step:100,initial:2200,unit:'Hz'},{id:PARAM.keytrack,min:0,max:1,step:1,initial:1,kind:'toggle'}],
  env:[{id:PARAM.attack,min:.001,max:4,step:.03,initial:.01,unit:'s'},{id:PARAM.decay,min:.01,max:5,step:.03,initial:.32,unit:'s'},{id:PARAM.sustain,min:0,max:1,step:.03,initial:.82},{id:PARAM.release,min:.01,max:6,step:.03,initial:.2,unit:'s'}],
  mod:[{id:PARAM.drift,min:0,max:1,step:.03,initial:.08},null,{id:PARAM.notePriority,min:0,max:2,step:1,initial:2,kind:'mode'},{id:PARAM.retrigger,min:0,max:1,step:1,initial:1,kind:'toggle'}],
  seq:[null,null,null,null]
};
const BASS:Record<string,(Binding|null)[]>={
  osc:[{id:BASS808_PARAM.wave,min:0,max:1,step:1,initial:0,kind:'wave'},{id:BASS808_PARAM.tune,min:-12,max:12,step:.25,initial:0},{id:BASS808_PARAM.sub,min:0,max:.7,step:.03,initial:.12},{id:BASS808_PARAM.drive,min:.5,max:4,step:.08,initial:1.35}],
  filter:[{id:BASS808_PARAM.cutoff,min:35,max:8000,step:80,initial:640,unit:'Hz'},{id:BASS808_PARAM.resonance,min:0,max:1,step:.03,initial:.62},{id:BASS808_PARAM.envMod,min:0,max:6000,step:80,initial:2200,unit:'Hz'},{id:BASS808_PARAM.accent,min:0,max:1.25,step:.03,initial:.62}],
  env:[{id:BASS808_PARAM.decay,min:.02,max:2,step:.02,initial:.28,unit:'s'},{id:BASS808_PARAM.slide,min:.005,max:.5,step:.01,initial:.085,unit:'s'},null,{id:BASS808_PARAM.accentDecay,min:.02,max:1,step:.02,initial:.16,unit:'s'}],
  seq:[null,null,null,null],perf:[null,null,null,null]
};
const ALPHA:Record<string,(Binding|null)[]>={
  dco:[{id:ALPHA_PARAM.saw,min:0,max:1,step:.04,initial:.72},{id:ALPHA_PARAM.pulse,min:0,max:1,step:.04,initial:.2},{id:ALPHA_PARAM.sub,min:0,max:1,step:.04,initial:.18},{id:ALPHA_PARAM.noise,min:0,max:.5,step:.02,initial:.03}],
  vcf:[{id:ALPHA_PARAM.cutoff,min:45,max:12000,step:100,initial:2600,unit:'Hz'},{id:ALPHA_PARAM.resonance,min:0,max:1,step:.03,initial:.18},{id:ALPHA_PARAM.env,min:0,max:6500,step:80,initial:1800,unit:'Hz'},{id:ALPHA_PARAM.keytrack,min:0,max:1,step:.03,initial:.45}],
  vca:[{id:ALPHA_PARAM.level,min:0,max:1.2,step:.04,initial:.78},{id:ALPHA_PARAM.envMode,min:0,max:1,step:1,initial:0,kind:'toggle'},{id:ALPHA_PARAM.velocity,min:0,max:1,step:.04,initial:.55},null],
  env:[{id:ALPHA_PARAM.attack,min:.001,max:4,step:.03,initial:.08,unit:'s'},{id:ALPHA_PARAM.decay,min:.01,max:5,step:.03,initial:.6,unit:'s'},{id:ALPHA_PARAM.sustain,min:0,max:1,step:.03,initial:.75},{id:ALPHA_PARAM.release,min:.01,max:6,step:.03,initial:1.2,unit:'s'}],
  lfo:[{id:ALPHA_PARAM.lfoRate,min:.02,max:15,step:.08,initial:.7,unit:'Hz'},{id:ALPHA_PARAM.lfoDelay,min:0,max:5,step:.04,initial:.25,unit:'s'},{id:ALPHA_PARAM.dcoMod,min:0,max:2,step:.03,initial:.08},{id:ALPHA_PARAM.vcfMod,min:0,max:2000,step:25,initial:120,unit:'Hz'}],
  chorus:[{id:ALPHA_PARAM.chorusMode,min:0,max:2,step:1,initial:1,kind:'mode'},{id:ALPHA_PARAM.chorusRate,min:.02,max:5,step:.04,initial:.32,unit:'Hz'},{id:ALPHA_PARAM.chorusDepth,min:0,max:1,step:.03,initial:.55},{id:ALPHA_PARAM.chorusMix,min:0,max:.85,step:.03,initial:.42}],
  seq:[null,null,null,null]
};

function initialValues(map:Record<string,(Binding|null)[]>){const out:Record<number,number>={};for(const p of Object.values(map))for(const b of p)if(b&&out[b.id]===undefined)out[b.id]=b.initial;return out}
function pretty(binding:Binding|null,value:number|undefined){if(!binding||value===undefined)return '—';if(binding.kind==='wave')return value>=.5?'SQUARE':'SAW';if(binding.kind==='toggle')return value>=.5?'ON':'OFF';if(binding.kind==='mode')return String(Math.round(value));if(binding.unit==='Hz')return `${Math.round(value)} Hz`;if(binding.unit==='s')return `${value.toFixed(value<.1?3:2)} s`;return value.toFixed(2)}
function ratio(binding:Binding|null,value:number|undefined){if(!binding||value===undefined||binding.max===binding.min)return .5;return Math.max(0,Math.min(1,(value-binding.min)/(binding.max-binding.min)))}

export function FM1Virtual(){
  const [partId,setPartId]=useState<WorkstationPartId>('mini');
  const [pageIndex,setPageIndex]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [globalPage,setGlobalPage]=useState<number|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [step,setStep]=useState(0);
  const [peak,setPeak]=useState(0);
  const [master,setMaster]=useState(.72);
  const [octave,setOctave]=useState(0);
  const [fine,setFine]=useState(false);
  const [audioState,setAudioState]=useState<'idle'|'ready'|'error'>('idle');
  const [audioError,setAudioError]=useState('');
  const [miniValues,setMiniValues]=useState(()=>initialValues(MINI));
  const [bassValues,setBassValues]=useState(()=>initialValues(BASS));
  const [alphaValues,setAlphaValues]=useState(()=>initialValues(ALPHA));
  const [drumVoice,setDrumVoice]=useState(0);
  const [drumValues,setDrumValues]=useState<Record<number,number>>({0:.92,1:52,2:.34,3:.55});
  const [partLevels,setPartLevels]=useState<[number,number,number,number]>([.72,.42,.38,.62]);
  const [held,setHeld]=useState<number[]>([]);
  const activeRef=useRef(new Map<string,ActiveNote>());
  const syncedRef=useRef(false);
  const partRef=useRef(partId);partRef.current=partId;

  const part=useMemo(()=>WORKSTATION_PARTS.find(p=>p.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pageIndex[partId]??0]??part.pages[0];
  const scene=WORKSTATION_SCENES[sceneIndex];
  const bindings=partId==='mini'?MINI[page.id]:partId==='bass808'?BASS[page.id]:partId==='alpha'?ALPHA[page.id]:null;
  const values=partId==='mini'?miniValues:partId==='bass808'?bassValues:partId==='alpha'?alphaValues:drumValues;
  const visiblePage=globalPage===null?page:WORKSTATION_GLOBAL_PAGES[globalPage];

  useEffect(()=>workstation.onMeter(m=>{setStep(m.step);setPeak(m.peak)}),[]);
  useEffect(()=>workstation.onError(message=>{setAudioState('error');setAudioError(message)}),[]);

  const ensureAudio=useCallback(async()=>{
    try{
      await workstation.start();
      if(!syncedRef.current){
        workstation.setMaster(master);
        partLevels.forEach((v,i)=>workstation.setPartLevel(i as 0|1|2|3,v));
        Object.entries(miniValues).forEach(([id,v])=>workstation.setMiniParam(+id,v));
        Object.entries(bassValues).forEach(([id,v])=>workstation.setBassParam(+id as never,v));
        Object.entries(alphaValues).forEach(([id,v])=>workstation.setAlphaParam(+id as never,v));
        Object.entries(drumValues).forEach(([id,v])=>workstation.setDrumVoiceParam(drumVoice as 0|1|2|3|4|5|6|7,+id,v));
        syncedRef.current=true;
      }
      setAudioState('ready');setAudioError('');
      return true;
    }catch(error){setAudioState('error');setAudioError(error instanceof Error?error.message:String(error));return false}
  },[alphaValues,bassValues,drumValues,drumVoice,master,miniValues,partLevels]);

  const releaseSource=useCallback((source:string)=>{
    const entry=activeRef.current.get(source);if(!entry)return;
    activeRef.current.delete(source);
    if(entry.part==='mini')workstation.miniNoteOff(entry.note);
    else if(entry.part==='alpha')workstation.alphaNoteOff(entry.note);
    else if(entry.part==='bass808'){
      const remaining=[...activeRef.current.values()].filter(v=>v.part==='bass808');
      if(remaining.length){const last=remaining[remaining.length-1];workstation.bassNoteOn(last.note)}else workstation.bassNoteOff();
    }
    setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))]);
  },[]);

  const releaseAll=useCallback(()=>{for(const key of [...activeRef.current.keys()])releaseSource(key)},[releaseSource]);

  const triggerSource=useCallback(async(source:string,note:number,index:number)=>{
    if(activeRef.current.has(source))return;
    if(!await ensureAudio())return;
    const currentPart=partRef.current;
    const entry={note,index,part:currentPart};activeRef.current.set(source,entry);
    if(currentPart==='mini')workstation.miniNoteOn(note,110);
    else if(currentPart==='alpha')workstation.alphaNoteOn(note,110);
    else if(currentPart==='bass808')workstation.bassNoteOn(note);
    else workstation.triggerDrum((index%8) as 0|1|2|3|4|5|6|7,116,false);
    setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))]);
  },[ensureAudio]);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;const index=COMPUTER_KEYS.indexOf(e.code);if(index<0||e.repeat)return;e.preventDefault();void triggerSource(`kbd:${e.code}`,53+index+octave*12,index)};
    const up=(e:KeyboardEvent)=>{if(!activeRef.current.has(`kbd:${e.code}`))return;e.preventDefault();releaseSource(`kbd:${e.code}`)};
    const blur=()=>releaseAll();window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)};
  },[octave,releaseAll,releaseSource,triggerSource]);

  const changePart=(next:WorkstationPartId)=>{releaseAll();setGlobalPage(null);setPartId(next)};
  const cyclePart=(delta=1)=>{const current=PARTS.indexOf(partId);changePart(PARTS[(current+delta+PARTS.length)%PARTS.length])};
  const cyclePage=(delta=1)=>{if(globalPage!==null){setGlobalPage((globalPage+delta+WORKSTATION_GLOBAL_PAGES.length)%WORKSTATION_GLOBAL_PAGES.length);return}const count=part.pages.length;setPageIndex(p=>({...p,[partId]:((p[partId]??0)+delta+count)%count}))};
  const jumpPage=(id:string)=>{setGlobalPage(null);const i=part.pages.findIndex(p=>p.id===id);if(i>=0)setPageIndex(p=>({...p,[partId]:i}))};

  const loadSceneIndex=async(next:number,start=playing)=>{
    const normalized=(next+WORKSTATION_SCENES.length)%WORKSTATION_SCENES.length;
    if(playing){workstation.stop();workstation.miniNoteOff(MINI_DRONES[sceneIndex%MINI_DRONES.length]);for(const n of ALPHA_CHORDS[sceneIndex%ALPHA_CHORDS.length])workstation.alphaNoteOff(n)}
    setSceneIndex(normalized);
    if(start){const s=WORKSTATION_SCENES[normalized];await workstation.loadScene(s);workstation.play();workstation.miniNoteOn(MINI_DRONES[normalized%MINI_DRONES.length],76);for(const n of ALPHA_CHORDS[normalized%ALPHA_CHORDS.length])workstation.alphaNoteOn(n,74);setPlaying(true)}
  };

  const adjustGlobal=async(index:number,delta:number)=>{
    if(globalPage===null)return;await ensureAudio();const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;
    if(id==='mixer'){
      const next=[...partLevels] as [number,number,number,number];next[index]=Math.max(0,Math.min(1.25,next[index]+delta*(fine?.01:.04)));setPartLevels(next);workstation.setPartLevel(index as 0|1|2|3,next[index]);return;
    }
    if(id==='scene'&&index===0){void loadSceneIndex(sceneIndex+delta);return}
    if(id==='clock'&&(index===0||index===1)){
      const s={...scene,bpm:index===0?Math.max(40,Math.min(300,scene.bpm+delta)):scene.bpm,swing:index===1?Math.max(0,Math.min(75,scene.swing+delta)):scene.swing};
      await workstation.loadScene(s);if(playing)workstation.play();return;
    }
    if(id==='fx'&&index===3){const v=Math.max(0,Math.min(1.2,master+delta*(fine?.01:.04)));setMaster(v);workstation.setMaster(v)}
  };

  const adjust=async(index:number,delta:number)=>{
    if(globalPage!==null){await adjustGlobal(index,delta);return}
    if(!await ensureAudio())return;const scale=fine?.25:1;
    if(partId==='drum808'){
      if(page.id==='kit'){
        if(index===0){setDrumVoice((drumVoice+delta+8)%8);return}
        const map=[null,{id:0,min:0,max:1.2,step:.04},{id:1,min:20,max:14000,step:drumVoice===0?2:20},{id:2,min:.02,max:2,step:.02}] as const;const b=map[index];if(!b)return;const v=Math.max(b.min,Math.min(b.max,(drumValues[b.id]??0)+delta*b.step*scale));setDrumValues(x=>({...x,[b.id]:v}));workstation.setDrumVoiceParam(drumVoice as 0|1|2|3|4|5|6|7,b.id,v);return;
      }
      if(page.id==='tone'&&index===0){const v=Math.max(0,Math.min(1,(drumValues[3]??.55)+delta*.04*scale));setDrumValues(x=>({...x,3:v}));workstation.setDrumVoiceParam(drumVoice as 0|1|2|3|4|5|6|7,3,v)}
      return;
    }
    const b=bindings?.[index];if(!b)return;const current=values[b.id]??b.initial;let v=Math.max(b.min,Math.min(b.max,current+delta*b.step*scale));if(b.kind==='toggle'||b.kind==='wave'||b.kind==='mode')v=Math.round(v);
    if(partId==='mini'){setMiniValues(x=>({...x,[b.id]:v}));workstation.setMiniParam(b.id,v)}
    else if(partId==='bass808'){setBassValues(x=>({...x,[b.id]:v}));workstation.setBassParam(b.id as never,v)}
    else if(partId==='alpha'){setAlphaValues(x=>({...x,[b.id]:v}));workstation.setAlphaParam(b.id as never,v)}
  };

  const startScene=async()=>{releaseAll();if(!await ensureAudio())return;await workstation.loadScene(scene);workstation.setMaster(master);workstation.play();workstation.miniNoteOn(MINI_DRONES[sceneIndex%MINI_DRONES.length],76);for(const n of ALPHA_CHORDS[sceneIndex%ALPHA_CHORDS.length])workstation.alphaNoteOn(n,74);setPlaying(true)};
  const stopScene=()=>{workstation.stop();workstation.miniNoteOff(MINI_DRONES[sceneIndex%MINI_DRONES.length]);for(const n of ALPHA_CHORDS[sceneIndex%ALPHA_CHORDS.length])workstation.alphaNoteOff(n);setPlaying(false)};
  const toggleTransport=()=>playing?stopScene():void startScene();

  const saveSnapshot=()=>{localStorage.setItem('fminimug1.virtual.snapshot',JSON.stringify({sceneIndex,partId,pageIndex,master,octave,miniValues,bassValues,alphaValues,drumVoice,drumValues,partLevels}));setAudioError('Snapshot saved locally')};
  const loadSnapshot=()=>{try{const raw=localStorage.getItem('fminimug1.virtual.snapshot');if(!raw){setAudioError('No local snapshot saved');return}const s=JSON.parse(raw);if(Number.isInteger(s.sceneIndex))setSceneIndex(s.sceneIndex);if(PARTS.includes(s.partId))setPartId(s.partId);if(s.pageIndex)setPageIndex(s.pageIndex);if(typeof s.master==='number')setMaster(s.master);if(typeof s.octave==='number')setOctave(s.octave);if(s.miniValues)setMiniValues(s.miniValues);if(s.bassValues)setBassValues(s.bassValues);if(s.alphaValues)setAlphaValues(s.alphaValues);if(s.drumValues)setDrumValues(s.drumValues);if(Array.isArray(s.partLevels))setPartLevels(s.partLevels);syncedRef.current=false;setAudioError('Snapshot loaded')}catch(error){setAudioError(`Snapshot load failed: ${String(error)}`)}};

  const knobValue=(i:number)=>{
    if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[i].toFixed(2);if(id==='scene')return i===0?scene.name:i===2?'SAVE':i===3?'LOAD':'—';if(id==='clock')return [scene.bpm,scene.swing,'INT','ON'][i]?.toString()??'—';if(id==='fx')return i===3?`${Math.round(master*100)}%`:'N/A';return '—'}
    if(partId==='drum808'){if(page.id==='kit')return [String(drumVoice+1),(drumValues[0]??.92).toFixed(2),`${Math.round(drumValues[1]??52)} Hz`,`${(drumValues[2]??.34).toFixed(2)} s`][i]??'—';if(page.id==='tone'&&i===0)return (drumValues[3]??.55).toFixed(2);return '—'}
    return pretty(bindings?.[i]??null,bindings?.[i]?values[bindings[i]!.id]:undefined);
  };
  const knobRatio=(i:number)=>{if(globalPage!==null){if(WORKSTATION_GLOBAL_PAGES[globalPage].id==='mixer')return partLevels[i]/1.25;if(WORKSTATION_GLOBAL_PAGES[globalPage].id==='scene')return sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1);if(WORKSTATION_GLOBAL_PAGES[globalPage].id==='fx'&&i===3)return master/1.2;return .5}if(partId==='drum808')return i===0?drumVoice/7:.5;const b=bindings?.[i]??null;return ratio(b,b?values[b.id]:undefined)};

  const functionButton=(label:string)=>{
    if(label==='SEL')cyclePart();else if(label==='HOME'){setGlobalPage(null);setPageIndex(p=>({...p,[partId]:0}))}else if(label==='ENV')jumpPage('env');else if(label==='LFO')jumpPage(partId==='alpha'?'lfo':'mod');else if(label==='SEQ')jumpPage('seq');else if(label==='ARP')jumpPage('perf');else if(label==='PLAY/STOP')toggleTransport();else if(label==='FX')setGlobalPage(1);else if(label==='GLO')setGlobalPage(globalPage===null?0:null);else if(label==='EDIT')setFine(v=>!v);else if(label==='SAVE')saveSnapshot();
  };

  const keys=Array.from({length:27},(_,i)=>53+i+octave*12);
  const displayTitle=globalPage===null?part.title:'GLOBAL';
  const displayPageTitle=visiblePage.title;
  const displayParams=visiblePage.params;

  return <main className="fm1Stage">
    <div className="fm1Title"><strong>FMiniMug1 WORKSTATION V2</strong><span>VIRTUAL FM-1 · native WASM · {audioState.toUpperCase()}</span></div>
    <section className="fm1Device">
      <div className="fm1Top">
        <div className="fm1LeftControls">
          <HardwareKnob label="MASTER" value={`${Math.round(master*100)}%`} normalized={master/1.2} onDelta={async d=>{await ensureAudio();const v=Math.max(0,Math.min(1.2,master+d*(fine?.01:.04)));setMaster(v);workstation.setMaster(v)}}/>
          <HardwareKnob label="SELECT" value={part.title} normalized={PARTS.indexOf(partId)/(PARTS.length-1)} onDelta={cyclePart}/>
          <HardwareKnob label="PRESETS" value={String(sceneIndex+1).padStart(2,'0')} normalized={sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1)} onDelta={d=>void loadSceneIndex(sceneIndex+d)}/>
          <HardwareKnob label="ALGORITHM" value={globalPage===null?`${(pageIndex[partId]??0)+1}/${part.pages.length}`:`G${globalPage+1}`} normalized={globalPage===null?(pageIndex[partId]??0)/Math.max(1,part.pages.length-1):globalPage/Math.max(1,WORKSTATION_GLOBAL_PAGES.length-1)} onDelta={cyclePage}/>
          <button className="fm1Oct" onClick={()=>setOctave(v=>Math.max(-3,v-1))}>OCT−</button><button className="fm1Oct" onClick={()=>setOctave(v=>Math.min(3,v+1))}>OCT+</button>
          <div className="octReadout">OCT {octave>=0?'+':''}{octave}</div>
        </div>

        <div className="fm1DisplayBezel"><div className="fm1Display">
          <div className="displayHeader"><b>{displayTitle}</b><span>{playing?`▶ ${String(step+1).padStart(2,'0')}`:'■ READY'}</span></div>
          <div className="displayScene">{scene.name}<small>{scene.bpm} BPM · {scene.swing}% SWING · PEAK {(peak*100).toFixed(0)}% · OCT {octave>=0?'+':''}{octave}</small></div>
          <div className="displayPage"><strong>{displayPageTitle}</strong><span>{fine?'FINE':'NORMAL'}</span></div>
          <div className="displayParams">{displayParams.map((name,i)=><div key={`${name}-${i}`}><small>K{i+1}</small><b>{name}</b><em>{knobValue(i)}</em></div>)}</div>
          <div className="displayFooter"><span className={partId==='mini'?'selected':''}>MINI</span><span className={partId==='drum808'?'selected':''}>808D</span><span className={partId==='bass808'?'selected':''}>808B</span><span className={partId==='alpha'?'selected':''}>ALPHA</span></div>
        </div></div>

        <div className="fm1RightControls">
          <div className="fm1KnobRow">{displayParams.map((name,i)=><HardwareKnob key={`${name}-${i}`} label={`KNOB${i+1}`} value={knobValue(i)} normalized={knobRatio(i)} onDelta={d=>void adjust(i,d)}/>)}</div>
          <div className="fm1FunctionGrid">{['FX','SEL','ENV','LFO','EDIT','GLO','HOME','SAVE','ARP','SEQ','PLAY/STOP','REC'].map(label=>{const disabled=label==='REC';const active=(label==='PLAY/STOP'&&playing)||(label==='EDIT'&&fine)||(label==='GLO'&&globalPage!==null);return <button key={label} disabled={disabled} className={active?'active':disabled?'disabled':''} title={disabled?'Recording is not implemented yet':''} onClick={()=>functionButton(label)}>{label}</button>})}</div>
        </div>
      </div>

      <div className="fm1UpperPads">{['OP1','OP2','OP3','OP4','OP5','OP6','P1','GLO','MONO','POLY'].map((x,i)=><button key={x} className={i<4&&PARTS[i]===partId?'active':''} onClick={()=>{if(i<4)changePart(PARTS[i]);else if(x==='P1')void loadSceneIndex(sceneIndex+1);else if(x==='GLO')setGlobalPage(globalPage===null?0:null);else if(x==='MONO')changePart('mini');else if(x==='POLY')changePart('alpha')}}>{x}<span>{i<4?WORKSTATION_PARTS[i].title:''}</span></button>)}</div>
      <div className="fm1Keybed">{keys.map((note,i)=><button key={`${note}-${i}`} className={held.includes(note)?'held':''} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);void triggerSource(`ptr:${e.pointerId}`,note,i)}} onPointerUp={e=>{e.preventDefault();releaseSource(`ptr:${e.pointerId}`)}} onPointerCancel={e=>releaseSource(`ptr:${e.pointerId}`)}><i/><small>{NOTE_NAMES[note%12]}{Math.floor(note/12)-1}</small><kbd>{i<COMPUTER_KEYS.length?COMPUTER_KEYS[i].replace('Key','').replace('Digit',''):''}</kbd></button>)}</div>
    </section>
    <section className="fm1Status">
      <span><b>PC KEYS</b> Z/S/X/D/C… + Q/2/W/3/E… play the selected part</span>
      <span><b>DRAG/WHEEL KNOBS</b> vertical drag or mouse wheel; EDIT = fine mode</span>
      <span><b>OCT− / OCT+</b> now change keyboard octave</span>
      <span><b>PLAY/STOP</b> runs the complete workstation scene</span>
    </section>
    {audioError&&<div className={audioState==='error'?'fm1Message error':'fm1Message'}>{audioError}{audioState==='error'&&<button onClick={()=>void ensureAudio()}>RETRY AUDIO</button>}</div>}
  </main>;
}

function HardwareKnob({label,value,normalized,onDelta}:{label:string;value:string;normalized:number;onDelta:(delta:number)=>void|Promise<void>}){
  const drag=useRef<{y:number;carry:number;moved:boolean}|null>(null);
  const angle=-135+Math.max(0,Math.min(1,normalized))*270;
  const style={'--knob-angle':`${angle}deg`} as CSSProperties;
  const move=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!drag.current)return;const dy=drag.current.y-e.clientY;drag.current.y=e.clientY;drag.current.carry+=dy;while(Math.abs(drag.current.carry)>=5){const direction=drag.current.carry>0?1:-1;drag.current.carry-=direction*5;drag.current.moved=true;void onDelta(direction)}};
  return <div className="hardwareKnob"><label>{label}</label><button style={style} title="Drag vertically or use mouse wheel" onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,carry:0,moved:false}}} onPointerMove={move} onPointerUp={e=>{if(!drag.current)return;const moved=drag.current.moved;try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}drag.current=null;if(!moved)void onDelta(e.shiftKey?-1:1)}} onPointerCancel={()=>{drag.current=null}} onWheel={e=>{e.preventDefault();void onDelta(e.deltaY<0?1:-1)}}><span/></button><small>{value}</small></div>;
}
