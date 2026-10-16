import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {WORKSTATION_GLOBAL_PAGES,WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {workstation,type WorkstationScene,type WorkstationMiniStep} from './audio/workstation';
import {BASS808_PARAM,type Bass808Pattern} from './audio/bass808';
import {type Drum808Pattern,type Drum808VoiceId} from './audio/drum808';
import {ALPHA_PARAM} from './audio/alpha';
import {PARAM} from './generated/params';
import {WORKSTATION_SCENES} from './data/workstationScenes';
import './fm1Virtual.css';

type Binding={id:number;min:number;max:number;step:number;initial:number;unit?:string;kind?:'toggle'|'wave'|'mode'};
type ActiveNote={note:number;index:number;part:WorkstationPartId};
type DrumVoiceState={level:number;tune:number;decay:number;tone:number};
type AlphaLaneStep={chord:number;gate:number;velocity:number};

const PARTS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const DRUM_SHORT=['BD','SD','CH','OH','CP','TM','CB','RS'];
const COMPUTER_KEYS=['KeyZ','KeyS','KeyX','KeyD','KeyC','KeyV','KeyG','KeyB','KeyH','KeyN','KeyJ','KeyM','Comma','KeyL','Period','Semicolon','Slash','KeyQ','Digit2','KeyW','Digit3','KeyE','KeyR','Digit5','KeyT','Digit6','KeyY'];
const ALPHA_CHORDS:[[number,number,number,number],[number,number,number,number],[number,number,number,number],[number,number,number,number],[number,number,number,number]]=[[48,55,60,64],[45,52,57,60],[50,57,62,65],[43,50,55,59],[48,52,55,60]];

const MINI:Record<string,(Binding|null)[]>={
  osc:[{id:PARAM.osc1Level,min:0,max:1,step:.04,initial:.8},{id:PARAM.osc2Level,min:0,max:1,step:.04,initial:.55},{id:PARAM.osc3Level,min:0,max:1,step:.04,initial:.35},{id:PARAM.glide,min:0,max:1.5,step:.02,initial:.05,unit:'s'}],
  mix:[{id:PARAM.mixerDrive,min:.5,max:4,step:.08,initial:1.2},{id:PARAM.filterDrive,min:.5,max:4,step:.08,initial:1.1},{id:PARAM.feedback,min:0,max:.95,step:.03,initial:.08},{id:PARAM.oversample,min:0,max:1,step:1,initial:0,kind:'toggle'}],
  filter:[{id:PARAM.cutoff,min:40,max:12000,step:100,initial:1800,unit:'Hz'},{id:PARAM.res,min:0,max:1,step:.03,initial:.35},{id:PARAM.env,min:-6000,max:6000,step:100,initial:2200,unit:'Hz'},{id:PARAM.keytrack,min:0,max:1,step:.05,initial:.65}],
  env:[{id:PARAM.attack,min:.001,max:4,step:.03,initial:.01,unit:'s'},{id:PARAM.decay,min:.01,max:5,step:.03,initial:.32,unit:'s'},{id:PARAM.sustain,min:0,max:1,step:.03,initial:.82},{id:PARAM.release,min:.01,max:6,step:.03,initial:.2,unit:'s'}],
  mod:[{id:PARAM.drift,min:0,max:1,step:.03,initial:.08},{id:PARAM.glideMode,min:0,max:1,step:1,initial:0,kind:'toggle'},{id:PARAM.notePriority,min:0,max:2,step:1,initial:2,kind:'mode'},{id:PARAM.retrigger,min:0,max:1,step:1,initial:1,kind:'toggle'}]
};
const BASS:Record<string,(Binding|null)[]>={
  osc:[{id:BASS808_PARAM.wave,min:0,max:1,step:1,initial:0,kind:'wave'},{id:BASS808_PARAM.tune,min:-12,max:12,step:.25,initial:0},{id:BASS808_PARAM.sub,min:0,max:.7,step:.03,initial:.12},{id:BASS808_PARAM.drive,min:.5,max:4,step:.08,initial:1.35}],
  filter:[{id:BASS808_PARAM.cutoff,min:35,max:8000,step:80,initial:640,unit:'Hz'},{id:BASS808_PARAM.resonance,min:0,max:1,step:.03,initial:.62},{id:BASS808_PARAM.envMod,min:0,max:6000,step:80,initial:2200,unit:'Hz'},{id:BASS808_PARAM.accent,min:0,max:1.25,step:.03,initial:.62}],
  env:[{id:BASS808_PARAM.decay,min:.02,max:2,step:.02,initial:.28,unit:'s'},{id:BASS808_PARAM.slide,min:.005,max:.5,step:.01,initial:.085,unit:'s'},null,{id:BASS808_PARAM.accentDecay,min:.02,max:1,step:.02,initial:.16,unit:'s'}]
};
const ALPHA:Record<string,(Binding|null)[]>={
  dco:[{id:ALPHA_PARAM.saw,min:0,max:1,step:.04,initial:.72},{id:ALPHA_PARAM.pulse,min:0,max:1,step:.04,initial:.2},{id:ALPHA_PARAM.sub,min:0,max:1,step:.04,initial:.18},{id:ALPHA_PARAM.noise,min:0,max:.5,step:.02,initial:.03}],
  vcf:[{id:ALPHA_PARAM.cutoff,min:45,max:12000,step:100,initial:2600,unit:'Hz'},{id:ALPHA_PARAM.resonance,min:0,max:1,step:.03,initial:.18},{id:ALPHA_PARAM.env,min:0,max:6500,step:80,initial:1800,unit:'Hz'},{id:ALPHA_PARAM.keytrack,min:0,max:1,step:.03,initial:.45}],
  vca:[{id:ALPHA_PARAM.level,min:0,max:1.2,step:.04,initial:.78},{id:ALPHA_PARAM.envMode,min:0,max:1,step:1,initial:0,kind:'toggle'},{id:ALPHA_PARAM.velocity,min:0,max:1,step:.04,initial:.55},{id:ALPHA_PARAM.chorusMix,min:0,max:.85,step:.03,initial:.42}],
  env:[{id:ALPHA_PARAM.attack,min:.001,max:4,step:.03,initial:.08,unit:'s'},{id:ALPHA_PARAM.decay,min:.01,max:5,step:.03,initial:.6,unit:'s'},{id:ALPHA_PARAM.sustain,min:0,max:1,step:.03,initial:.75},{id:ALPHA_PARAM.release,min:.01,max:6,step:.03,initial:1.2,unit:'s'}],
  lfo:[{id:ALPHA_PARAM.lfoRate,min:.02,max:15,step:.08,initial:.7,unit:'Hz'},{id:ALPHA_PARAM.lfoDelay,min:0,max:5,step:.04,initial:.25,unit:'s'},{id:ALPHA_PARAM.dcoMod,min:0,max:2,step:.03,initial:.08},{id:ALPHA_PARAM.vcfMod,min:0,max:2000,step:25,initial:120,unit:'Hz'}],
  chorus:[{id:ALPHA_PARAM.chorusMode,min:0,max:2,step:1,initial:1,kind:'mode'},{id:ALPHA_PARAM.chorusRate,min:.02,max:5,step:.04,initial:.32,unit:'Hz'},{id:ALPHA_PARAM.chorusDepth,min:0,max:1,step:.03,initial:.55},{id:ALPHA_PARAM.chorusMix,min:0,max:.85,step:.03,initial:.42}]
};

const DRUM_TUNES=[52,185,6800,4800,1200,120,540,1800];
const DRUM_DECAYS=[.42,.34,.08,.42,.28,.38,.22,.08];
function initialDrumKit():DrumVoiceState[]{return Array.from({length:8},(_,i)=>({level:i<4?.9:.72,tune:DRUM_TUNES[i],decay:DRUM_DECAYS[i],tone:.55}))}
function initialValues(map:Record<string,(Binding|null)[]>){const out:Record<number,number>={};for(const p of Object.values(map))for(const b of p)if(b&&out[b.id]===undefined)out[b.id]=b.initial;return out}
function pretty(b:Binding|null,v:number|undefined){if(!b||v===undefined)return '—';if(b.kind==='wave')return v>=.5?'SQUARE':'SAW';if(b.kind==='toggle')return v>=.5?'ON':'OFF';if(b.kind==='mode')return String(Math.round(v));if(b.unit==='Hz')return `${Math.round(v)} Hz`;if(b.unit==='s')return `${v.toFixed(v<.1?3:2)} s`;return v.toFixed(2)}
function ratio(b:Binding|null,v:number|undefined){if(!b||v===undefined||b.max===b.min)return .5;return Math.max(0,Math.min(1,(v-b.min)/(b.max-b.min)))}
function noteName(note:number){return note<0?'REST':`${NOTE_NAMES[(note+120)%12]}${Math.floor(note/12)-1}`}
function cloneBass(index:number):Bass808Pattern{const p=WORKSTATION_SCENES[index].bassPattern;return {...p,steps:p.steps.map(s=>({...s}))}}
function cloneDrums(index:number):Drum808Pattern{const p=WORKSTATION_SCENES[index].drumPattern;return {...p,steps:p.steps.map(s=>({...s}))}}
function sceneRoot(index:number){const note=WORKSTATION_SCENES[index].bassPattern.steps.find(s=>s.note>=0)?.note??48;return Math.max(24,Math.min(84,note+12))}
function createMiniLane(index:number):WorkstationMiniStep[]{const root=sceneRoot(index);const offsets=[0,0,7,0];return Array.from({length:16},(_,i)=>i%4===0?{note:Math.min(127,root+offsets[(i/4)%4]),velocity:92,gate:3.55}:{note:-1,velocity:92,gate:.9})}
function createAlphaLane(index:number):AlphaLaneStep[]{const progression=[index%ALPHA_CHORDS.length,(index+1)%ALPHA_CHORDS.length,(index+3)%ALPHA_CHORDS.length,index%ALPHA_CHORDS.length];return Array.from({length:16},(_,i)=>i%4===0?{chord:progression[(i/4)%4],gate:3.55,velocity:82}:{chord:-1,gate:.9,velocity:82})}

export function FM1Workstation(){
  const [partId,setPartId]=useState<WorkstationPartId>('mini');
  const [pageIndex,setPageIndex]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [globalPage,setGlobalPage]=useState<number|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [tempo,setTempo]=useState(WORKSTATION_SCENES[0].bpm);
  const [swing,setSwing]=useState(WORKSTATION_SCENES[0].swing);
  const [miniLane,setMiniLane]=useState<WorkstationMiniStep[]>(()=>createMiniLane(0));
  const [bassPattern,setBassPattern]=useState(()=>cloneBass(0));
  const [drumPattern,setDrumPattern]=useState(()=>cloneDrums(0));
  const [alphaLane,setAlphaLane]=useState<AlphaLaneStep[]>(()=>createAlphaLane(0));
  const [seqCursor,setSeqCursor]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [step,setStep]=useState(0);
  const [peak,setPeak]=useState(0);
  const [master,setMaster]=useState(.72);
  const [delayMix,setDelayMix]=useState(.14);
  const [ambienceMix,setAmbienceMix]=useState(.10);
  const [masterDrive,setMasterDrive]=useState(1.0);
  const [octave,setOctave]=useState(0);
  const [fine,setFine]=useState(false);
  const [audioState,setAudioState]=useState<'idle'|'ready'|'error'>('idle');
  const [message,setMessage]=useState('');
  const [miniValues,setMiniValues]=useState<Record<number,number>>(()=>initialValues(MINI));
  const [bassValues,setBassValues]=useState<Record<number,number>>(()=>({...initialValues(BASS),...WORKSTATION_SCENES[0].bassPatch.values}));
  const [alphaValues,setAlphaValues]=useState<Record<number,number>>(()=>({...initialValues(ALPHA),...WORKSTATION_SCENES[0].alphaPatch.values}));
  const [drumVoice,setDrumVoice]=useState(0);
  const [drumKit,setDrumKit]=useState<DrumVoiceState[]>(initialDrumKit);
  const [drumAccent,setDrumAccent]=useState(.7);
  const [drumDrive,setDrumDrive]=useState(1.15);
  const [drumMuted,setDrumMuted]=useState(false);
  const [partLevels,setPartLevels]=useState<[number,number,number,number]>([.72,.42,.38,.62]);
  const [held,setHeld]=useState<number[]>([]);
  const activeRef=useRef(new Map<string,ActiveNote>());
  const syncedRef=useRef(false);
  const partRef=useRef(partId);partRef.current=partId;

  const part=useMemo(()=>WORKSTATION_PARTS.find(p=>p.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pageIndex[partId]??0]??part.pages[0];
  const scene=WORKSTATION_SCENES[sceneIndex];
  const bindingPage=partId==='mini'?MINI[page.id]:partId==='bass808'?BASS[page.id]:partId==='alpha'?ALPHA[page.id]:undefined;
  const bindingValues:Record<number,number>=partId==='mini'?miniValues:partId==='bass808'?bassValues:alphaValues;
  const visiblePage=globalPage===null?page:WORKSTATION_GLOBAL_PAGES[globalPage];
  const currentDrum=drumKit[drumVoice];
  const miniStep=miniLane[seqCursor%miniLane.length];
  const bassStep=bassPattern.steps[seqCursor%bassPattern.steps.length];
  const drumStep=drumPattern.steps[seqCursor%drumPattern.steps.length];
  const alphaStep=alphaLane[seqCursor%alphaLane.length];

  useEffect(()=>workstation.onMeter(m=>{setStep(m.step);setPeak(m.peak)}),[]);
  useEffect(()=>workstation.onError(error=>{setAudioState('error');setMessage(error)}),[]);

  const pushSequence=useCallback((ml=miniLane,bp=bassPattern,dp=drumPattern,al=alphaLane,bpm=tempo,sw=swing)=>{
    const length=Math.max(ml.length,bp.steps.length,dp.steps.length,al.length);
    workstation.setSequenceMeta(length,bpm,sw);
    for(let i=0;i<length;i++){
      const m=ml[i%ml.length];workstation.setMiniStep(i,m.note,{velocity:m.velocity,gate:m.gate});
      const b=bp.steps[i%bp.steps.length];workstation.setBassStep(i,b.note,{accent:!!b.accent,slide:!!b.slide,gate:b.gate??.72});
      const d=dp.steps[i%dp.steps.length];workstation.setDrumStep(i,d.hits,d.accent);
      const a=al[i%al.length];const notes=a.chord>=0?ALPHA_CHORDS[a.chord%ALPHA_CHORDS.length]:[-1,-1,-1,-1];workstation.setAlphaStep(i,notes,{velocity:a.velocity,gate:a.gate});
    }
  },[alphaLane,bassPattern,drumPattern,miniLane,swing,tempo]);

  const ensureAudio=useCallback(async()=>{
    try{
      await workstation.start();
      if(!syncedRef.current){
        workstation.setMaster(master);
        workstation.setFxParam(0,delayMix);workstation.setFxParam(1,ambienceMix);workstation.setFxParam(2,masterDrive);
        partLevels.forEach((v,i)=>workstation.setPartLevel(i as 0|1|2|3,i===1&&drumMuted?0:v));
        Object.entries(miniValues).forEach(([id,v])=>workstation.setMiniParam(+id,v));
        Object.entries(bassValues).forEach(([id,v])=>workstation.setBassParam(+id as never,v));
        Object.entries(alphaValues).forEach(([id,v])=>workstation.setAlphaParam(+id as never,v));
        drumKit.forEach((voice,i)=>{workstation.setDrumVoiceParam(i as Drum808VoiceId,0,voice.level);workstation.setDrumVoiceParam(i as Drum808VoiceId,1,voice.tune);workstation.setDrumVoiceParam(i as Drum808VoiceId,2,voice.decay);workstation.setDrumVoiceParam(i as Drum808VoiceId,3,voice.tone)});
        workstation.setDrumGlobalParam(0,drumAccent);workstation.setDrumGlobalParam(1,drumDrive);pushSequence();syncedRef.current=true;
      }
      setAudioState('ready');return true;
    }catch(error){setAudioState('error');setMessage(error instanceof Error?error.message:String(error));return false}
  },[alphaValues,ambienceMix,bassValues,delayMix,drumAccent,drumDrive,drumKit,drumMuted,master,masterDrive,miniValues,partLevels,pushSequence]);

  const releaseSource=useCallback((source:string)=>{const entry=activeRef.current.get(source);if(!entry)return;activeRef.current.delete(source);if(entry.part==='mini')workstation.miniNoteOff(entry.note);else if(entry.part==='alpha')workstation.alphaNoteOff(entry.note);else if(entry.part==='bass808'){const rest=[...activeRef.current.values()].filter(v=>v.part==='bass808');if(rest.length)workstation.bassNoteOn(rest[rest.length-1].note);else workstation.bassNoteOff()}setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))])},[]);
  const releaseAll=useCallback(()=>{for(const source of [...activeRef.current.keys()])releaseSource(source)},[releaseSource]);
  const triggerSource=useCallback(async(source:string,note:number,index:number)=>{if(activeRef.current.has(source)||!await ensureAudio())return;const p=partRef.current;activeRef.current.set(source,{note,index,part:p});if(p==='mini')workstation.miniNoteOn(note,110);else if(p==='alpha')workstation.alphaNoteOn(note,110);else if(p==='bass808')workstation.bassNoteOn(note);else workstation.triggerDrum((index%8) as Drum808VoiceId,116,false);setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))])},[ensureAudio]);

  useEffect(()=>{const down=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(t?.matches('input,textarea,select,[contenteditable="true"]'))return;const i=COMPUTER_KEYS.indexOf(e.code);if(i<0||e.repeat)return;e.preventDefault();void triggerSource(`kbd:${e.code}`,53+i+octave*12,i)};const up=(e:KeyboardEvent)=>{const key=`kbd:${e.code}`;if(!activeRef.current.has(key))return;e.preventDefault();releaseSource(key)};const blur=()=>releaseAll();window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)}},[octave,releaseAll,releaseSource,triggerSource]);

  const runtimeScene=():WorkstationScene=>({...scene,bpm:tempo,swing,bassPattern:{...bassPattern,bpm:tempo,swing},drumPattern:{...drumPattern,bpm:tempo,swing},bassPatch:{...scene.bassPatch,values:{...bassValues} as typeof scene.bassPatch.values},alphaPatch:{...scene.alphaPatch,values:{...alphaValues} as typeof scene.alphaPatch.values}});
  const startTransport=async()=>{releaseAll();if(!await ensureAudio())return;await workstation.loadScene(runtimeScene());pushSequence();workstation.play();setPlaying(true)};
  const stopTransport=()=>{workstation.stop();setPlaying(false)};
  const toggleTransport=()=>playing?stopTransport():void startTransport();

  const loadScene=async(next:number)=>{const n=(next+WORKSTATION_SCENES.length)%WORKSTATION_SCENES.length;const wasPlaying=playing;if(wasPlaying)workstation.stop();const s=WORKSTATION_SCENES[n];const bp=cloneBass(n),dp=cloneDrums(n),ml=createMiniLane(n),al=createAlphaLane(n);setSceneIndex(n);setTempo(s.bpm);setSwing(s.swing);setMiniLane(ml);setBassPattern(bp);setDrumPattern(dp);setAlphaLane(al);setSeqCursor(0);setBassValues({...initialValues(BASS),...s.bassPatch.values});setAlphaValues({...initialValues(ALPHA),...s.alphaPatch.values});if(await ensureAudio()){await workstation.loadScene(s);pushSequence(ml,bp,dp,al,s.bpm,s.swing);if(wasPlaying)workstation.play()}};

  const changePart=(next:WorkstationPartId)=>{releaseAll();setGlobalPage(null);setPartId(next)};
  const cyclePart=(delta=1)=>{const i=PARTS.indexOf(partId);changePart(PARTS[(i+delta+PARTS.length)%PARTS.length])};
  const cyclePage=(delta=1)=>{if(globalPage!==null){setGlobalPage((globalPage+delta+WORKSTATION_GLOBAL_PAGES.length)%WORKSTATION_GLOBAL_PAGES.length);return}setPageIndex(p=>({...p,[partId]:((p[partId]??0)+delta+part.pages.length)%part.pages.length}))};
  const jumpPage=(id:string)=>{setGlobalPage(null);const i=part.pages.findIndex(p=>p.id===id);if(i>=0)setPageIndex(p=>({...p,[partId]:i}))};
  const setTempoLive=(v:number)=>{const next=Math.max(40,Math.min(300,Math.round(v)));setTempo(next);workstation.setSequenceMeta(Math.max(miniLane.length,bassPattern.steps.length,drumPattern.steps.length,alphaLane.length),next,swing)};
  const setSwingLive=(v:number)=>{const next=Math.max(0,Math.min(75,Math.round(v)));setSwing(next);workstation.setSequenceMeta(Math.max(miniLane.length,bassPattern.steps.length,drumPattern.steps.length,alphaLane.length),tempo,next)};
  const setCursor=(v:number)=>setSeqCursor((Math.round(v)+16)%16);

  const updateMiniStep=(patch:Partial<WorkstationMiniStep>)=>{const steps=miniLane.map((s,i)=>i===seqCursor?{...s,...patch}:s);setMiniLane(steps);const s=steps[seqCursor];workstation.setMiniStep(seqCursor,s.note,{velocity:s.velocity,gate:s.gate})};
  const updateBassStep=(patch:Partial<typeof bassStep>)=>{const steps=bassPattern.steps.map((s,i)=>i===seqCursor?{...s,...patch}:s);const next={...bassPattern,steps};setBassPattern(next);const s=steps[seqCursor];workstation.setBassStep(seqCursor,s.note,{accent:!!s.accent,slide:!!s.slide,gate:s.gate??.72})};
  const updateDrumStep=(hits:number,accent:number)=>{const steps=drumPattern.steps.map((s,i)=>i===seqCursor?{...s,hits,accent}:s);setDrumPattern({...drumPattern,steps});workstation.setDrumStep(seqCursor,hits,accent)};
  const updateAlphaStep=(patch:Partial<AlphaLaneStep>)=>{const steps=alphaLane.map((s,i)=>i===seqCursor?{...s,...patch}:s);setAlphaLane(steps);const s=steps[seqCursor];const notes=s.chord>=0?ALPHA_CHORDS[s.chord%ALPHA_CHORDS.length]:[-1,-1,-1,-1];workstation.setAlphaStep(seqCursor,notes,{velocity:s.velocity,gate:s.gate})};
  const updateDrumVoice=(voice:number,patch:Partial<DrumVoiceState>)=>{setDrumKit(kit=>kit.map((v,i)=>i===voice?{...v,...patch}:v))};

  const adjustGlobal=async(i:number,d:number)=>{if(globalPage===null||!await ensureAudio())return;const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer'){const n=[...partLevels] as [number,number,number,number];n[i]=Math.max(0,Math.min(1.25,n[i]+d*(fine?.01:.04)));setPartLevels(n);workstation.setPartLevel(i as 0|1|2|3,i===1&&drumMuted?0:n[i])}else if(id==='scene'&&i===0)void loadScene(sceneIndex+d);else if(id==='clock'&&i===0)setTempoLive(tempo+d);else if(id==='clock'&&i===1)setSwingLive(swing+d);else if(id==='fx'){if(i===0){const v=Math.max(0,Math.min(.8,delayMix+d*(fine?.01:.04)));setDelayMix(v);workstation.setFxParam(0,v)}else if(i===1){const v=Math.max(0,Math.min(.8,ambienceMix+d*(fine?.01:.04)));setAmbienceMix(v);workstation.setFxParam(1,v)}else if(i===2){const v=Math.max(.5,Math.min(3,masterDrive+d*(fine?.02:.08)));setMasterDrive(v);workstation.setFxParam(2,v)}else if(i===3){const v=Math.max(0,Math.min(1.2,master+d*(fine?.01:.04)));setMaster(v);workstation.setMaster(v)}}};

  const adjust=async(i:number,d:number)=>{
    if(globalPage!==null){await adjustGlobal(i,d);return}if(!await ensureAudio())return;const scale=fine?.25:1;
    if(partId==='mini'&&page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1)updateMiniStep({note:Math.max(-1,Math.min(127,miniStep.note+d))});else if(i===2)updateMiniStep({gate:Math.max(.05,Math.min(4,miniStep.gate+d*.05*scale))});else if(i===3)toggleTransport();return}
    if(partId==='drum808'){
      if(page.id==='kit'){if(i===0){setDrumVoice((drumVoice+d+8)%8);return}const key=(['','level','tune','decay'] as const)[i];if(!key)return;const current=currentDrum[key];const stepSize=key==='tune'?(drumVoice===0?2:20):key==='level'?.04:.02;const min=key==='tune'?20:key==='level'?0:.02;const max=key==='tune'?14000:key==='level'?1.2:2;const v=Math.max(min,Math.min(max,current+d*stepSize*scale));updateDrumVoice(drumVoice,{[key]:v});workstation.setDrumVoiceParam(drumVoice as Drum808VoiceId,i-1,v);return}
      if(page.id==='tone'){if(i===0){const v=Math.max(0,Math.min(1,currentDrum.tone+d*.04*scale));updateDrumVoice(drumVoice,{tone:v});workstation.setDrumVoiceParam(drumVoice as Drum808VoiceId,3,v)}else if(i===1){const v=Math.max(0,Math.min(1.5,drumAccent+d*.04*scale));setDrumAccent(v);workstation.setDrumGlobalParam(0,v)}else if(i===2){const v=Math.max(.5,Math.min(4,drumDrive+d*.08*scale));setDrumDrive(v);workstation.setDrumGlobalParam(1,v)}else if(i===3)workstation.triggerDrum(drumVoice as Drum808VoiceId,118,true);return}
      if(page.id==='mix'){const groups=[[0],[1],[2,3],[4,5,6,7]];const ids=groups[i];const avg=ids.reduce((s,id)=>s+drumKit[id].level,0)/ids.length;const v=Math.max(0,Math.min(1.2,avg+d*.04*scale));const next=drumKit.map((voice,id)=>ids.includes(id)?{...voice,level:v}:voice);setDrumKit(next);ids.forEach(id=>workstation.setDrumVoiceParam(id as Drum808VoiceId,0,v));return}
      if(page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1){const mask=1<<drumVoice;updateDrumStep(drumStep.hits^mask,drumStep.accent&~mask)}else if(i===2){const mask=1<<drumVoice;const hits=drumStep.hits|mask;updateDrumStep(hits,drumStep.accent^mask)}else if(i===3)setDrumVoice((drumVoice+d+8)%8);return}
      if(page.id==='perf'){if(i===0)setSwingLive(swing+d);else if(i===1){[0,1,2,4].forEach(v=>workstation.triggerDrum(v as Drum808VoiceId,120,true))}else if(i===2){const muted=!drumMuted;setDrumMuted(muted);workstation.setPartLevel(1,muted?0:partLevels[1])}else if(i===3)void loadScene(sceneIndex+d);return}
    }
    if(partId==='bass808'){
      if(page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1)updateBassStep({note:Math.max(-1,Math.min(127,bassStep.note+d))});else if(i===2)updateBassStep({accent:!bassStep.accent});else if(i===3)updateBassStep({slide:!bassStep.slide});return}
      if(page.id==='perf'){if(i===0)setTempoLive(tempo+d);else if(i===1)setSwingLive(swing+d);else if(i===2)void loadScene(sceneIndex+d);else if(i===3)toggleTransport();return}
      if(page.id==='env'&&i===2){const gate=Math.max(.05,Math.min(1,(bassStep.gate??.72)+d*.05*scale));updateBassStep({gate});return}
    }
    if(partId==='alpha'&&page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1)updateAlphaStep({chord:Math.max(-1,Math.min(ALPHA_CHORDS.length-1,alphaStep.chord+d))});else if(i===2)updateAlphaStep({gate:Math.max(.05,Math.min(4,alphaStep.gate+d*.05*scale))});else if(i===3)toggleTransport();return}
    const b=bindingPage?.[i];if(!b)return;const current=bindingValues[b.id]??b.initial;let v=Math.max(b.min,Math.min(b.max,current+d*b.step*scale));if(b.kind)v=Math.round(v);if(partId==='mini'){setMiniValues(x=>({...x,[b.id]:v}));workstation.setMiniParam(b.id,v)}else if(partId==='bass808'){setBassValues(x=>({...x,[b.id]:v}));workstation.setBassParam(b.id as never,v)}else if(partId==='alpha'){setAlphaValues(x=>({...x,[b.id]:v}));workstation.setAlphaParam(b.id as never,v)}
  };

  const saveSnapshot=()=>{localStorage.setItem('fminimug1.virtual.snapshot',JSON.stringify({sceneIndex,partId,pageIndex,master,delayMix,ambienceMix,masterDrive,octave,tempo,swing,miniValues,bassValues,alphaValues,drumKit,drumVoice,drumAccent,drumDrive,partLevels,miniLane,bassPattern,drumPattern,alphaLane}));setMessage('Snapshot saved locally')};
  const loadSnapshot=()=>{try{const raw=localStorage.getItem('fminimug1.virtual.snapshot');if(!raw){setMessage('No local snapshot saved');return}const s=JSON.parse(raw);if(Number.isInteger(s.sceneIndex))setSceneIndex(s.sceneIndex);if(PARTS.includes(s.partId))setPartId(s.partId);if(s.pageIndex)setPageIndex(s.pageIndex);if(typeof s.master==='number')setMaster(s.master);if(typeof s.delayMix==='number')setDelayMix(s.delayMix);if(typeof s.ambienceMix==='number')setAmbienceMix(s.ambienceMix);if(typeof s.masterDrive==='number')setMasterDrive(s.masterDrive);if(typeof s.octave==='number')setOctave(s.octave);if(typeof s.tempo==='number')setTempo(s.tempo);if(typeof s.swing==='number')setSwing(s.swing);if(s.miniValues)setMiniValues(s.miniValues);if(s.bassValues)setBassValues(s.bassValues);if(s.alphaValues)setAlphaValues(s.alphaValues);if(s.drumKit)setDrumKit(s.drumKit);if(Number.isInteger(s.drumVoice))setDrumVoice(s.drumVoice);if(typeof s.drumAccent==='number')setDrumAccent(s.drumAccent);if(typeof s.drumDrive==='number')setDrumDrive(s.drumDrive);if(Array.isArray(s.partLevels))setPartLevels(s.partLevels);if(s.miniLane)setMiniLane(s.miniLane);if(s.bassPattern)setBassPattern(s.bassPattern);if(s.drumPattern)setDrumPattern(s.drumPattern);if(s.alphaLane)setAlphaLane(s.alphaLane);syncedRef.current=false;setMessage('Snapshot loaded — touch a control to resync DSP')}catch(error){setMessage(`Snapshot load failed: ${String(error)}`)}};

  const controlValue=(i:number)=>{
    if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[i].toFixed(2);if(id==='scene')return i===0?scene.name:i===2?'PRESS':i===3?'PRESS':'—';if(id==='clock')return [tempo,swing,'INT','ON'][i]?.toString()??'—';if(id==='fx')return [`${Math.round(delayMix*100)}%`,`${Math.round(ambienceMix*100)}%`,`${masterDrive.toFixed(2)}x`,`${Math.round(master*100)}%`][i]??'—'}
    if(partId==='mini'&&page.id==='seq')return [seqCursor+1,noteName(miniStep.note),`${Math.round(miniStep.gate*100)}%`,playing?'STOP':'PLAY'][i]?.toString()??'—';
    if(partId==='drum808'){if(page.id==='kit')return [DRUM_SHORT[drumVoice],currentDrum.level.toFixed(2),`${Math.round(currentDrum.tune)} Hz`,`${currentDrum.decay.toFixed(2)} s`][i];if(page.id==='tone')return [currentDrum.tone.toFixed(2),drumAccent.toFixed(2),drumDrive.toFixed(2),'HIT'][i];if(page.id==='mix'){const g=[[0],[1],[2,3],[4,5,6,7]][i];return (g.reduce((s,id)=>s+drumKit[id].level,0)/g.length).toFixed(2)}if(page.id==='seq'){const mask=1<<drumVoice;return [seqCursor+1,(drumStep.hits&mask)?'ON':'OFF',(drumStep.accent&mask)?'ON':'OFF',DRUM_SHORT[drumVoice]][i]?.toString()??'—'}if(page.id==='perf')return [swing,'FILL',drumMuted?'MUTED':'ON',sceneIndex+1][i]?.toString()??'—'}
    if(partId==='bass808'){if(page.id==='seq')return [seqCursor+1,noteName(bassStep.note),bassStep.accent?'ON':'OFF',bassStep.slide?'ON':'OFF'][i]?.toString()??'—';if(page.id==='perf')return [tempo,swing,sceneIndex+1,playing?'STOP':'PLAY'][i]?.toString()??'—';if(page.id==='env'&&i===2)return `${Math.round((bassStep.gate??.72)*100)}%`}
    if(partId==='alpha'&&page.id==='seq')return [seqCursor+1,alphaStep.chord<0?'REST':`CH${alphaStep.chord+1}`,`${Math.round(alphaStep.gate*100)}%`,playing?'STOP':'PLAY'][i]?.toString()??'—';
    const b=bindingPage?.[i]??null;return pretty(b,b?bindingValues[b.id]:undefined)
  };
  const controlRatio=(i:number)=>{if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[i]/1.25;if(id==='scene'&&i===0)return sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1);if(id==='clock'&&i===0)return (tempo-40)/260;if(id==='clock'&&i===1)return swing/75;if(id==='fx')return [delayMix/.8,ambienceMix/.8,(masterDrive-.5)/2.5,master/1.2][i]??.5;return .5}if(partId==='mini'&&page.id==='seq')return [seqCursor/15,Math.max(0,miniStep.note)/127,miniStep.gate/4,playing?1:0][i];if(partId==='drum808'){if(page.id==='kit')return [drumVoice/7,currentDrum.level/1.2,Math.min(1,currentDrum.tune/14000),Math.min(1,currentDrum.decay/2)][i];if(page.id==='tone')return [currentDrum.tone,drumAccent/1.5,(drumDrive-.5)/3.5,.5][i];if(page.id==='seq')return [seqCursor/15,(drumStep.hits&(1<<drumVoice))?1:0,(drumStep.accent&(1<<drumVoice))?1:0,drumVoice/7][i];if(page.id==='perf')return [swing/75,.5,drumMuted?1:0,sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1)][i]}if(partId==='bass808'){if(page.id==='seq')return [seqCursor/15,Math.max(0,bassStep.note)/127,bassStep.accent?1:0,bassStep.slide?1:0][i];if(page.id==='perf')return [(tempo-40)/260,swing/75,sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1),playing?1:0][i];if(page.id==='env'&&i===2)return bassStep.gate??.72}if(partId==='alpha'&&page.id==='seq')return [seqCursor/15,alphaStep.chord<0?0:(alphaStep.chord+1)/ALPHA_CHORDS.length,alphaStep.gate/4,playing?1:0][i];const b=bindingPage?.[i]??null;return ratio(b,b?bindingValues[b.id]:undefined)};
  const available=(i:number)=>{if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;return id==='mixer'||id==='fx'||(id==='scene'&&(i===0||i===2||i===3))||(id==='clock'&&(i===0||i===1))}if(partId==='drum808')return true;if(partId==='mini'&&page.id==='seq')return true;if(partId==='bass808'&&(page.id==='seq'||page.id==='perf'||(page.id==='env'&&i===2)))return true;if(partId==='alpha'&&page.id==='seq')return true;return !!bindingPage?.[i]};
  const pressControl=(i:number)=>{if(globalPage!==null&&WORKSTATION_GLOBAL_PAGES[globalPage].id==='scene'){if(i===2)saveSnapshot();if(i===3)loadSnapshot();return}const label=visiblePage.params[i];if(label==='PLAY')toggleTransport();else if(label==='TRIGGER')workstation.triggerDrum(drumVoice as Drum808VoiceId,118,true);else if(label==='FILL')[0,1,2,4].forEach(v=>workstation.triggerDrum(v as Drum808VoiceId,120,true));else if(label==='HIT'||label==='ACCENT'||label==='SLIDE')void adjust(i,1)};

  const functionButton=(label:string)=>{if(label==='SEL')cyclePart();else if(label==='HOME'){setGlobalPage(null);setPageIndex(p=>({...p,[partId]:0}))}else if(label==='ENV')jumpPage('env');else if(label==='LFO')jumpPage(partId==='alpha'?'lfo':'mod');else if(label==='SEQ')jumpPage('seq');else if(label==='ARP')jumpPage('perf');else if(label==='PLAY/STOP')toggleTransport();else if(label==='FX')setGlobalPage(1);else if(label==='GLO')setGlobalPage(globalPage===null?0:null);else if(label==='EDIT')setFine(v=>!v);else if(label==='SAVE')saveSnapshot()};
  const keys=Array.from({length:27},(_,i)=>53+i+octave*12);
  const displayParams=visiblePage.params;
  const stepStrip=page.id==='seq'&&globalPage===null;
  const stepActive=(i:number)=>partId==='mini'?miniLane[i%miniLane.length].note>=0:partId==='bass808'?bassPattern.steps[i%bassPattern.steps.length].note>=0:partId==='drum808'?drumPattern.steps[i%drumPattern.steps.length].hits!==0:alphaLane[i%alphaLane.length].chord>=0;

  return <main className="fm1Stage">
    <div className="fm1Title"><strong>FMiniMug1 WORKSTATION V2</strong><span>VIRTUAL FM-1 · native WASM · {audioState.toUpperCase()}</span></div>
    <section className="fm1Device">
      <div className="fm1Top">
        <div className="fm1LeftControls">
          <HardwareKnob label="MASTER" value={`${Math.round(master*100)}%`} normalized={master/1.2} onDelta={async d=>{await ensureAudio();const v=Math.max(0,Math.min(1.2,master+d*(fine?.01:.04)));setMaster(v);workstation.setMaster(v)}}/>
          <HardwareKnob label="SELECT" value={part.title} normalized={PARTS.indexOf(partId)/(PARTS.length-1)} onDelta={cyclePart}/>
          <HardwareKnob label="PRESETS" value={String(sceneIndex+1).padStart(2,'0')} normalized={sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1)} onDelta={d=>void loadScene(sceneIndex+d)}/>
          <HardwareKnob label="ALGORITHM" value={globalPage===null?`${(pageIndex[partId]??0)+1}/${part.pages.length}`:`G${globalPage+1}`} normalized={globalPage===null?(pageIndex[partId]??0)/Math.max(1,part.pages.length-1):globalPage/Math.max(1,WORKSTATION_GLOBAL_PAGES.length-1)} onDelta={cyclePage}/>
          <button className="fm1Oct" onClick={()=>setOctave(v=>Math.max(-3,v-1))}>OCT−</button><button className="fm1Oct" onClick={()=>setOctave(v=>Math.min(3,v+1))}>OCT+</button><div className="octReadout">OCT {octave>=0?'+':''}{octave}</div>
        </div>
        <div className="fm1DisplayBezel"><div className="fm1Display">
          <div className="displayHeader"><b>{globalPage===null?part.title:'GLOBAL'}</b><span>{playing?`▶ ${String(step+1).padStart(2,'0')}`:'■ READY'}</span></div>
          <div className="displayScene">{scene.name}<small>{tempo} BPM · {swing}% SWING · PEAK {(peak*100).toFixed(0)}% · OCT {octave>=0?'+':''}{octave}</small></div>
          <div className="displayPage"><strong>{visiblePage.title}</strong><span>{fine?'FINE':'NORMAL'}</span></div>
          <div className="displayParams">{displayParams.map((name,i)=><div key={`${name}-${i}`} className={available(i)?'':'unavailable'}><small>K{i+1}</small><b>{name}</b><em>{available(i)?controlValue(i):'N/A'}</em></div>)}</div>
          {stepStrip&&<div className="displaySteps">{Array.from({length:16},(_,i)=><span key={i} className={`${stepActive(i)?'on':''} ${i===seqCursor?'cursor':''} ${playing&&i===step?'play':''}`}>{i+1}</span>)}</div>}
          <div className="displayFooter"><span className={partId==='mini'?'selected':''}>MINI</span><span className={partId==='drum808'?'selected':''}>808D</span><span className={partId==='bass808'?'selected':''}>808B</span><span className={partId==='alpha'?'selected':''}>ALPHA</span></div>
        </div></div>
        <div className="fm1RightControls"><div className="fm1KnobRow">{displayParams.map((name,i)=><HardwareKnob key={`${name}-${i}`} label={`KNOB${i+1}`} value={available(i)?controlValue(i):'N/A'} normalized={controlRatio(i)} disabled={!available(i)} onDelta={d=>void adjust(i,d)} onPress={()=>pressControl(i)}/>)}</div><div className="fm1FunctionGrid">{['FX','SEL','ENV','LFO','EDIT','GLO','HOME','SAVE','ARP','SEQ','PLAY/STOP','REC'].map(label=>{const disabled=label==='REC';const active=(label==='PLAY/STOP'&&playing)||(label==='EDIT'&&fine)||(label==='GLO'&&globalPage!==null)||(label==='FX'&&globalPage===1);return <button key={label} disabled={disabled} className={active?'active':disabled?'disabled':''} title={disabled?'Recording is not implemented yet':''} onClick={()=>functionButton(label)}>{label}</button>})}</div></div>
      </div>
      <div className="fm1UpperPads">{['OP1','OP2','OP3','OP4','OP5','OP6','P1','GLO','MONO','POLY'].map((x,i)=><button key={x} className={i<4&&PARTS[i]===partId?'active':''} onClick={()=>{if(i<4)changePart(PARTS[i]);else if(x==='P1')void loadScene(sceneIndex+1);else if(x==='GLO')setGlobalPage(globalPage===null?0:null);else if(x==='MONO')changePart('mini');else if(x==='POLY')changePart('alpha')}}>{x}<span>{i<4?WORKSTATION_PARTS[i].title:''}</span></button>)}</div>
      <div className="fm1Keybed">{keys.map((note,i)=><button key={`${note}-${i}`} className={held.includes(note)?'held':''} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);void triggerSource(`ptr:${e.pointerId}`,note,i)}} onPointerUp={e=>{e.preventDefault();releaseSource(`ptr:${e.pointerId}`)}} onPointerCancel={e=>releaseSource(`ptr:${e.pointerId}`)}><i/><small>{partId==='drum808'?DRUM_SHORT[i%8]:`${NOTE_NAMES[note%12]}${Math.floor(note/12)-1}`}</small><kbd>{COMPUTER_KEYS[i]?.replace('Key','').replace('Digit','')??''}</kbd></button>)}</div>
    </section>
    <section className="fm1Status"><span><b>PC KEYS</b> Z/S/X/D/C… + Q/2/W/3/E… play the selected part</span><span><b>ENCODERS</b> drag/wheel to turn, click to press; EDIT = fine mode</span><span><b>SEQ</b> all four parts edit the native sample-clock lanes</span><span><b>FX</b> delay / ambience / drive run inside native workstation DSP</span></section>
    {message&&<div className={audioState==='error'?'fm1Message error':'fm1Message'}>{message}{audioState==='error'&&<button onClick={()=>void ensureAudio()}>RETRY AUDIO</button>}</div>}
  </main>;
}

function HardwareKnob({label,value,normalized,onDelta,onPress,disabled=false}:{label:string;value:string;normalized:number;onDelta:(delta:number)=>void|Promise<void>;onPress?:()=>void;disabled?:boolean}){
  const drag=useRef<{y:number;carry:number;moved:boolean}|null>(null);const angle=-135+Math.max(0,Math.min(1,normalized))*270;const style={'--knob-angle':`${angle}deg`} as CSSProperties;
  const move=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!drag.current||disabled)return;const dy=drag.current.y-e.clientY;drag.current.y=e.clientY;drag.current.carry+=dy;while(Math.abs(drag.current.carry)>=5){const dir=drag.current.carry>0?1:-1;drag.current.carry-=dir*5;drag.current.moved=true;void onDelta(dir)}};
  return <div className={`hardwareKnob ${disabled?'disabled':''}`}><label>{label}</label><button disabled={disabled} style={style} title={disabled?'Not implemented in the shared engine yet':'Drag/wheel = turn, click = encoder press'} onPointerDown={e=>{if(disabled||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,carry:0,moved:false}}} onPointerMove={move} onPointerUp={e=>{if(!drag.current)return;const moved=drag.current.moved;try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}drag.current=null;if(!moved){if(onPress)onPress();else void onDelta(e.shiftKey?-1:1)}}} onPointerCancel={()=>{drag.current=null}} onWheel={e=>{if(disabled)return;e.preventDefault();void onDelta(e.deltaY<0?1:-1)}}><span/></button><small>{value}</small></div>;
}
