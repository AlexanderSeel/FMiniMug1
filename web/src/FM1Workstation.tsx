import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {WORKSTATION_GLOBAL_PAGES,WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {workstation,type WorkstationMiniStep} from './audio/workstation';
import {BASS808_PARAM,type Bass808Pattern} from './audio/bass808';
import {type Drum808Pattern,type Drum808VoiceId} from './audio/drum808';
import {ALPHA_PARAM,type AlphaParamId} from './audio/alpha';
import {ALPHA_ALL_PRESETS} from './data/alphaPresets';
import {PARAM} from './generated/params';
import {WORKSTATION_SCENES} from './data/workstationScenes';
import './fm1Virtual.css';

type Binding={id:number;min:number;max:number;step:number;initial:number;unit?:string;kind?:'toggle'|'wave'|'mode'};
type DrumVoiceState={level:number;tune:number;decay:number;tone:number};
type AlphaLaneStep={chord:number;gate:number;velocity:number};
type ActiveNote={note:number;part:WorkstationPartId};

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
const ALPHA_DIAL_PARAMS=Object.entries(ALPHA).flatMap(([page,bindings])=>bindings.map((binding,index)=>binding?{page,label:`${page.toUpperCase()} ${['1','2','3','4'][index]}`,binding}:null).filter((x):x is {page:string;label:string;binding:Binding}=>!!x));
const ALPHA_DIAL_LABELS=['SAW','PULSE','SUB','NOISE','CUTOFF','RESONANCE','ENV MOD','KEYTRACK','VCA LEVEL','ENV MODE','VELOCITY','CHORUS MIX','ATTACK','DECAY','SUSTAIN','RELEASE','LFO RATE','LFO DELAY','DCO MOD','VCF MOD','CHORUS MODE','CHORUS RATE','CHORUS DEPTH','CHORUS MIX'];
const DRUM_TUNES=[52,185,6800,4800,1200,120,540,1800],DRUM_DECAYS=[.42,.34,.08,.42,.28,.38,.22,.08];

function initialValues(map:Record<string,(Binding|null)[]>){const out:Record<number,number>={};for(const p of Object.values(map))for(const b of p)if(b&&out[b.id]===undefined)out[b.id]=b.initial;return out}
function initialDrumKit():DrumVoiceState[]{return Array.from({length:8},(_,i)=>({level:i<4?.9:.72,tune:DRUM_TUNES[i],decay:DRUM_DECAYS[i],tone:.55}))}
function pretty(b:Binding|null,v:number|undefined){if(!b||v===undefined)return '—';if(b.kind==='wave')return v>=.5?'SQUARE':'SAW';if(b.kind==='toggle')return v>=.5?'ON':'OFF';if(b.kind==='mode')return String(Math.round(v));if(b.unit==='Hz')return `${Math.round(v)} Hz`;if(b.unit==='s')return `${v.toFixed(v<.1?3:2)} s`;return v.toFixed(2)}
function ratio(b:Binding|null,v:number|undefined){if(!b||v===undefined||b.max===b.min)return .5;return Math.max(0,Math.min(1,(v-b.min)/(b.max-b.min)))}
function noteName(note:number){return note<0?'REST':`${NOTE_NAMES[(note+120)%12]}${Math.floor(note/12)-1}`}
function cloneBass(index:number):Bass808Pattern{const p=WORKSTATION_SCENES[index].bassPattern;return {...p,steps:p.steps.map(s=>({...s}))}}
function cloneDrums(index:number):Drum808Pattern{const p=WORKSTATION_SCENES[index].drumPattern;return {...p,steps:p.steps.map(s=>({...s}))}}
function sceneRoot(index:number){const note=WORKSTATION_SCENES[index].bassPattern.steps.find(s=>s.note>=0)?.note??48;return Math.max(24,Math.min(84,note+12))}
function createMiniLane(index:number):WorkstationMiniStep[]{const root=sceneRoot(index);return Array.from({length:16},(_,i)=>i%4===0?{note:Math.min(127,root+(i===8?7:0)),velocity:92,gate:3.55}:{note:-1,velocity:92,gate:.9})}
function createAlphaLane(index:number):AlphaLaneStep[]{const progression=[index%5,(index+1)%5,(index+3)%5,index%5];return Array.from({length:16},(_,i)=>i%4===0?{chord:progression[(i/4)%4],gate:3.55,velocity:82}:{chord:-1,gate:.9,velocity:82})}

export function FM1Workstation(){
  const [partId,setPartId]=useState<WorkstationPartId>('alpha');
  const [pageIndex,setPageIndex]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [globalPage,setGlobalPage]=useState<number|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0),[tempo,setTempo]=useState(WORKSTATION_SCENES[0].bpm),[swing,setSwing]=useState(WORKSTATION_SCENES[0].swing);
  const [miniLane,setMiniLane]=useState(()=>createMiniLane(0)),[bassPattern,setBassPattern]=useState(()=>cloneBass(0)),[drumPattern,setDrumPattern]=useState(()=>cloneDrums(0)),[alphaLane,setAlphaLane]=useState(()=>createAlphaLane(0));
  const [seqCursor,setSeqCursor]=useState(0),[playing,setPlaying]=useState(false),[step,setStep]=useState(0),[peak,setPeak]=useState(0);
  const [master,setMaster]=useState(.72),[delayMix,setDelayMix]=useState(.14),[ambienceMix,setAmbienceMix]=useState(.10),[masterDrive,setMasterDrive]=useState(1);
  const [octave,setOctave]=useState(0),[fine,setFine]=useState(false),[message,setMessage]=useState(''),[audioState,setAudioState]=useState<'idle'|'ready'|'error'>('idle');
  const [miniValues,setMiniValues]=useState(()=>initialValues(MINI)),[bassValues,setBassValues]=useState(()=>({...initialValues(BASS),...WORKSTATION_SCENES[0].bassPatch.values}));
  const [alphaValues,setAlphaValues]=useState<Record<number,number>>(()=>({...initialValues(ALPHA),...ALPHA_ALL_PRESETS[0].values}));
  const [alphaParamIndex,setAlphaParamIndex]=useState(4),[alphaPresetIndex,setAlphaPresetIndex]=useState(0),[alphaChord,setAlphaChord]=useState(0);
  const [drumVoice,setDrumVoice]=useState(0),[drumKit,setDrumKit]=useState(initialDrumKit),[drumAccent,setDrumAccent]=useState(.7),[drumDrive,setDrumDrive]=useState(1.15),[drumMuted,setDrumMuted]=useState(false);
  const [partLevels,setPartLevels]=useState<[number,number,number,number]>([.72,.42,.38,.62]),[held,setHeld]=useState<number[]>([]);
  const activeRef=useRef(new Map<string,ActiveNote>()),syncedRef=useRef(false),partRef=useRef(partId);partRef.current=partId;

  const part=useMemo(()=>WORKSTATION_PARTS.find(p=>p.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const page=part.pages[pageIndex[partId]??0]??part.pages[0],scene=WORKSTATION_SCENES[sceneIndex],visiblePage=globalPage===null?page:WORKSTATION_GLOBAL_PAGES[globalPage];
  const bindingPage=partId==='mini'?MINI[page.id]:partId==='bass808'?BASS[page.id]:partId==='alpha'?ALPHA[page.id]:undefined;
  const bindingValues=partId==='mini'?miniValues:partId==='bass808'?bassValues:alphaValues;
  const currentDrum=drumKit[drumVoice],miniStep=miniLane[seqCursor%miniLane.length],bassStep=bassPattern.steps[seqCursor%bassPattern.steps.length],drumStep=drumPattern.steps[seqCursor%drumPattern.steps.length],alphaStep=alphaLane[seqCursor%alphaLane.length];
  const alphaDial=ALPHA_DIAL_PARAMS[alphaParamIndex%ALPHA_DIAL_PARAMS.length],alphaPreset=ALPHA_ALL_PRESETS[alphaPresetIndex%ALPHA_ALL_PRESETS.length];

  useEffect(()=>workstation.onMeter(m=>{setStep(m.step);setPeak(m.peak)}),[]);
  useEffect(()=>workstation.onError(error=>{setAudioState('error');setMessage(error)}),[]);

  const pushSequence=(ml=miniLane,bp=bassPattern,dp=drumPattern,al=alphaLane,bpm=tempo,sw=swing)=>{const length=Math.max(ml.length,bp.steps.length,dp.steps.length,al.length);workstation.setSequenceMeta(length,bpm,sw);for(let i=0;i<length;i++){const m=ml[i%ml.length];workstation.setMiniStep(i,m.note,{velocity:m.velocity,gate:m.gate});const b=bp.steps[i%bp.steps.length];workstation.setBassStep(i,b.note,{accent:!!b.accent,slide:!!b.slide,gate:b.gate??.72});const d=dp.steps[i%dp.steps.length];workstation.setDrumStep(i,d.hits,d.accent);const a=al[i%al.length];workstation.setAlphaStep(i,a.chord>=0?ALPHA_CHORDS[a.chord%5]:[-1,-1,-1,-1],{velocity:a.velocity,gate:a.gate})}};
  const ensureAudio=async()=>{try{await workstation.start();if(!syncedRef.current){workstation.setMaster(master);workstation.setFxParam(0,delayMix);workstation.setFxParam(1,ambienceMix);workstation.setFxParam(2,masterDrive);partLevels.forEach((v,i)=>workstation.setPartLevel(i as 0|1|2|3,i===1&&drumMuted?0:v));Object.entries(miniValues).forEach(([id,v])=>workstation.setMiniParam(+id,v));Object.entries(bassValues).forEach(([id,v])=>workstation.setBassParam(+id as never,v));Object.entries(alphaValues).forEach(([id,v])=>workstation.setAlphaParam(+id as AlphaParamId,v));drumKit.forEach((v,i)=>{workstation.setDrumVoiceParam(i as Drum808VoiceId,0,v.level);workstation.setDrumVoiceParam(i as Drum808VoiceId,1,v.tune);workstation.setDrumVoiceParam(i as Drum808VoiceId,2,v.decay);workstation.setDrumVoiceParam(i as Drum808VoiceId,3,v.tone)});workstation.setDrumGlobalParam(0,drumAccent);workstation.setDrumGlobalParam(1,drumDrive);pushSequence();syncedRef.current=true}setAudioState('ready');return true}catch(error){setAudioState('error');setMessage(error instanceof Error?error.message:String(error));return false}};

  const applyAlphaPreset=async(next:number)=>{const index=(next+ALPHA_ALL_PRESETS.length)%ALPHA_ALL_PRESETS.length,preset=ALPHA_ALL_PRESETS[index];setAlphaPresetIndex(index);setAlphaValues({...preset.values});if(await ensureAudio())Object.entries(preset.values).forEach(([id,v])=>workstation.setAlphaParam(+id as AlphaParamId,v))};
  const adjustAlphaDial=(d:number)=>{const b=alphaDial.binding,current=alphaValues[b.id]??b.initial;let value=Math.max(b.min,Math.min(b.max,current+d*b.step*(fine?.25:1)));if(b.kind)value=Math.round(value);setAlphaValues(v=>({...v,[b.id]:value}));workstation.setAlphaParam(b.id as AlphaParamId,value)};
  const auditionChord=async()=>{if(!await ensureAudio())return;const notes=ALPHA_CHORDS[alphaChord%5];notes.forEach(n=>workstation.alphaNoteOn(n,104));window.setTimeout(()=>notes.forEach(n=>workstation.alphaNoteOff(n)),650)};

  const releaseSource=(source:string)=>{const entry=activeRef.current.get(source);if(!entry)return;activeRef.current.delete(source);if(entry.part==='mini')workstation.miniNoteOff(entry.note);else if(entry.part==='alpha')workstation.alphaNoteOff(entry.note);else if(entry.part==='bass808')workstation.bassNoteOff();setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))])};
  const triggerSource=async(source:string,note:number,index:number)=>{if(activeRef.current.has(source)||!await ensureAudio())return;const p=partRef.current;activeRef.current.set(source,{note,part:p});if(p==='mini')workstation.miniNoteOn(note,110);else if(p==='alpha')workstation.alphaNoteOn(note,110);else if(p==='bass808')workstation.bassNoteOn(note);else workstation.triggerDrum((index%8) as Drum808VoiceId,116,false);setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))])};
  useEffect(()=>{const down=(e:KeyboardEvent)=>{const i=COMPUTER_KEYS.indexOf(e.code);if(i<0||e.repeat)return;e.preventDefault();void triggerSource(`kbd:${e.code}`,53+i+octave*12,i)};const up=(e:KeyboardEvent)=>releaseSource(`kbd:${e.code}`);window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[octave]);

  const toggleTransport=async()=>{if(playing){workstation.stop();setPlaying(false);return}if(!await ensureAudio())return;pushSequence();workstation.play();setPlaying(true)};
  const changePart=(next:WorkstationPartId)=>{setGlobalPage(null);setPartId(next)};
  const cyclePart=(d=1)=>changePart(PARTS[(PARTS.indexOf(partId)+d+PARTS.length)%PARTS.length]);
  const cyclePage=(d=1)=>{if(globalPage!==null){setGlobalPage((globalPage+d+WORKSTATION_GLOBAL_PAGES.length)%WORKSTATION_GLOBAL_PAGES.length);return}setPageIndex(v=>({...v,[partId]:((v[partId]??0)+d+part.pages.length)%part.pages.length}))};
  const jumpPage=(id:string)=>{setGlobalPage(null);const i=part.pages.findIndex(p=>p.id===id);if(i>=0)setPageIndex(v=>({...v,[partId]:i}))};
  const setCursor=(v:number)=>setSeqCursor((Math.round(v)+16)%16);

  const updateMiniStep=(patch:Partial<WorkstationMiniStep>)=>{const steps=miniLane.map((s,i)=>i===seqCursor?{...s,...patch}:s);setMiniLane(steps);const s=steps[seqCursor];workstation.setMiniStep(seqCursor,s.note,{velocity:s.velocity,gate:s.gate})};
  const updateAlphaStep=(patch:Partial<AlphaLaneStep>)=>{const steps=alphaLane.map((s,i)=>i===seqCursor?{...s,...patch}:s);setAlphaLane(steps);const s=steps[seqCursor];workstation.setAlphaStep(seqCursor,s.chord>=0?ALPHA_CHORDS[s.chord%5]:[-1,-1,-1,-1],{velocity:s.velocity,gate:s.gate})};

  const adjust=async(i:number,d:number)=>{if(!await ensureAudio())return;const scale=fine?.25:1;if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer'){const n=[...partLevels] as [number,number,number,number];n[i]=Math.max(0,Math.min(1.25,n[i]+d*.04*scale));setPartLevels(n);workstation.setPartLevel(i as 0|1|2|3,i===1&&drumMuted?0:n[i])}else if(id==='clock'&&i===0){const n=Math.max(40,Math.min(300,tempo+d));setTempo(n);workstation.setSequenceMeta(16,n,swing)}else if(id==='clock'&&i===1){const n=Math.max(0,Math.min(75,swing+d));setSwing(n);workstation.setSequenceMeta(16,tempo,n)}else if(id==='fx'){if(i===0){const n=Math.max(0,Math.min(.8,delayMix+d*.04*scale));setDelayMix(n);workstation.setFxParam(0,n)}if(i===1){const n=Math.max(0,Math.min(.8,ambienceMix+d*.04*scale));setAmbienceMix(n);workstation.setFxParam(1,n)}if(i===2){const n=Math.max(.5,Math.min(3,masterDrive+d*.08*scale));setMasterDrive(n);workstation.setFxParam(2,n)}if(i===3){const n=Math.max(0,Math.min(1.2,master+d*.04*scale));setMaster(n);workstation.setMaster(n)}}return}
    if(partId==='alpha'&&page.id==='alpha'){if(i===0)adjustAlphaDial(d);else if(i===1)setAlphaParamIndex(v=>(v+d+ALPHA_DIAL_PARAMS.length)%ALPHA_DIAL_PARAMS.length);else if(i===2)void applyAlphaPreset(alphaPresetIndex+d);else if(i===3)setAlphaChord(v=>(v+d+5)%5);return}
    if(partId==='alpha'&&page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1)updateAlphaStep({chord:Math.max(-1,Math.min(4,alphaStep.chord+d))});else if(i===2)updateAlphaStep({gate:Math.max(.05,Math.min(4,alphaStep.gate+d*.05*scale))});else if(i===3)void toggleTransport();return}
    if(partId==='mini'&&page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1)updateMiniStep({note:Math.max(-1,Math.min(127,miniStep.note+d))});else if(i===2)updateMiniStep({gate:Math.max(.05,Math.min(4,miniStep.gate+d*.05*scale))});else if(i===3)void toggleTransport();return}
    if(partId==='drum808'&&page.id==='seq'){if(i===0)setCursor(seqCursor+d);else if(i===1){const mask=1<<drumVoice;const steps=drumPattern.steps.map((s,x)=>x===seqCursor?{...s,hits:s.hits^mask,accent:s.accent&~mask}:s);setDrumPattern({...drumPattern,steps});workstation.setDrumStep(seqCursor,steps[seqCursor].hits,steps[seqCursor].accent)}else if(i===2){const mask=1<<drumVoice;const steps=drumPattern.steps.map((s,x)=>x===seqCursor?{...s,hits:s.hits|mask,accent:s.accent^mask}:s);setDrumPattern({...drumPattern,steps});workstation.setDrumStep(seqCursor,steps[seqCursor].hits,steps[seqCursor].accent)}else if(i===3)setDrumVoice(v=>(v+d+8)%8);return}
    if(partId==='bass808'&&page.id==='seq'){const steps=bassPattern.steps.map((s,x)=>x===seqCursor?{...s}:s);const s=steps[seqCursor];if(i===0)setCursor(seqCursor+d);else if(i===1)s.note=Math.max(-1,Math.min(127,s.note+d));else if(i===2)s.accent=!s.accent;else if(i===3)s.slide=!s.slide;setBassPattern({...bassPattern,steps});workstation.setBassStep(seqCursor,s.note,{accent:!!s.accent,slide:!!s.slide,gate:s.gate??.72});return}
    const b=bindingPage?.[i];if(!b)return;const current=bindingValues[b.id]??b.initial;let value=Math.max(b.min,Math.min(b.max,current+d*b.step*scale));if(b.kind)value=Math.round(value);if(partId==='mini'){setMiniValues(v=>({...v,[b.id]:value}));workstation.setMiniParam(b.id,value)}else if(partId==='bass808'){setBassValues(v=>({...v,[b.id]:value}));workstation.setBassParam(b.id as never,value)}else if(partId==='alpha'){setAlphaValues(v=>({...v,[b.id]:value}));workstation.setAlphaParam(b.id as AlphaParamId,value)}};

  const controlValue=(i:number)=>{if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[i].toFixed(2);if(id==='fx')return [`${Math.round(delayMix*100)}%`,`${Math.round(ambienceMix*100)}%`,`${masterDrive.toFixed(2)}x`,`${Math.round(master*100)}%`][i];if(id==='clock')return [tempo,swing,'INT','ON'][i]?.toString()??'—';return i===0?scene.name:'—'}if(partId==='alpha'&&page.id==='alpha')return [pretty(alphaDial.binding,alphaValues[alphaDial.binding.id]),ALPHA_DIAL_LABELS[alphaParamIndex]??alphaDial.label,alphaPreset.name,`CH ${alphaChord+1}`][i];if(partId==='alpha'&&page.id==='seq')return [seqCursor+1,alphaStep.chord<0?'REST':`CH${alphaStep.chord+1}`,`${Math.round(alphaStep.gate*100)}%`,playing?'STOP':'PLAY'][i]?.toString()??'—';if(partId==='mini'&&page.id==='seq')return [seqCursor+1,noteName(miniStep.note),`${Math.round(miniStep.gate*100)}%`,playing?'STOP':'PLAY'][i]?.toString()??'—';if(partId==='drum808'&&page.id==='seq'){const mask=1<<drumVoice;return [seqCursor+1,(drumStep.hits&mask)?'ON':'OFF',(drumStep.accent&mask)?'ON':'OFF',DRUM_SHORT[drumVoice]][i]?.toString()??'—'}if(partId==='bass808'&&page.id==='seq')return [seqCursor+1,noteName(bassStep.note),bassStep.accent?'ON':'OFF',bassStep.slide?'ON':'OFF'][i]?.toString()??'—';const b=bindingPage?.[i]??null;return pretty(b,b?bindingValues[b.id]:undefined)};
  const controlRatio=(i:number)=>{if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[i]/1.25;if(id==='fx')return [delayMix/.8,ambienceMix/.8,(masterDrive-.5)/2.5,master/1.2][i]??.5;if(id==='clock')return i===0?(tempo-40)/260:i===1?swing/75:.5;return .5}if(partId==='alpha'&&page.id==='alpha')return [ratio(alphaDial.binding,alphaValues[alphaDial.binding.id]),alphaParamIndex/(ALPHA_DIAL_PARAMS.length-1),alphaPresetIndex/(ALPHA_ALL_PRESETS.length-1),alphaChord/4][i]??.5;if(partId==='alpha'&&page.id==='seq')return [seqCursor/15,Math.max(0,alphaStep.chord)/4,alphaStep.gate/4,playing?1:0][i];if(partId==='mini'&&page.id==='seq')return [seqCursor/15,Math.max(0,miniStep.note)/127,miniStep.gate/4,playing?1:0][i];if(partId==='drum808'&&page.id==='seq')return [seqCursor/15,(drumStep.hits&(1<<drumVoice))?1:0,(drumStep.accent&(1<<drumVoice))?1:0,drumVoice/7][i];if(partId==='bass808'&&page.id==='seq')return [seqCursor/15,Math.max(0,bassStep.note)/127,bassStep.accent?1:0,bassStep.slide?1:0][i];const b=bindingPage?.[i]??null;return ratio(b,b?bindingValues[b.id]:undefined)};
  const available=(i:number)=>globalPage!==null?WORKSTATION_GLOBAL_PAGES[globalPage].id!=='scene'||i===0:partId==='alpha'&&page.id==='alpha'?true:page.id==='seq'?true:!!bindingPage?.[i];
  const pressControl=(i:number)=>{if(partId==='alpha'&&page.id==='alpha'&&i===3){void auditionChord();return}if(visiblePage.params[i]==='PLAY')void toggleTransport()};
  const functionButton=(label:string)=>{if(label==='SEL')cyclePart();else if(label==='HOME'){setGlobalPage(null);setPageIndex(v=>({...v,[partId]:0}))}else if(label==='ENV')jumpPage('env');else if(label==='LFO')jumpPage(partId==='alpha'?'lfo':'mod');else if(label==='SEQ')jumpPage('seq');else if(label==='FX')setGlobalPage(1);else if(label==='GLO')setGlobalPage(globalPage===null?0:null);else if(label==='EDIT')setFine(v=>!v);else if(label==='PLAY/STOP')void toggleTransport()};

  const keys=Array.from({length:27},(_,i)=>53+i+octave*12),displayParams=visiblePage.params,stepStrip=page.id==='seq'&&globalPage===null;
  const stepActive=(i:number)=>partId==='mini'?miniLane[i].note>=0:partId==='bass808'?bassPattern.steps[i].note>=0:partId==='drum808'?drumPattern.steps[i].hits!==0:alphaLane[i].chord>=0;

  return <main className="fm1Stage">
    <div className="fm1Title"><strong>FMiniMug1 WORKSTATION V2</strong><span>VIRTUAL FM-1 · NATIVE WASM · {audioState.toUpperCase()}</span></div>
    <section className="fm1Device">
      <div className="fm1Top">
        <div className="fm1LeftControls">
          <HardwareKnob label="MASTER" value={`${Math.round(master*100)}%`} normalized={master/1.2} onDelta={d=>void adjustGlobalMaster(d)}/>
          <HardwareKnob label="SELECT" value={part.title} normalized={PARTS.indexOf(partId)/3} onDelta={cyclePart}/>
          <HardwareKnob label="SCENE" value={String(sceneIndex+1).padStart(2,'0')} normalized={sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1)} onDelta={d=>setSceneIndex(v=>(v+d+WORKSTATION_SCENES.length)%WORKSTATION_SCENES.length)}/>
          <HardwareKnob label="PAGE" value={globalPage===null?`${(pageIndex[partId]??0)+1}/${part.pages.length}`:`G${globalPage+1}`} normalized={globalPage===null?(pageIndex[partId]??0)/Math.max(1,part.pages.length-1):globalPage/3} onDelta={cyclePage}/>
          <button className="fm1Oct" onClick={()=>setOctave(v=>Math.max(-3,v-1))}>OCT−</button><button className="fm1Oct" onClick={()=>setOctave(v=>Math.min(3,v+1))}>OCT+</button><div className="octReadout">OCT {octave>=0?'+':''}{octave}</div>
        </div>
        <div className="fm1DisplayBezel"><div className="fm1Display">
          <div className="displayHeader"><b>{globalPage===null?part.title:'GLOBAL'}</b><span>{playing?`▶ ${String(step+1).padStart(2,'0')}`:'■ READY'}</span></div>
          <div className="displayScene">{partId==='alpha'&&page.id==='alpha'?alphaPreset.name:scene.name}<small>{part.subtitle} · {tempo} BPM · PEAK {(peak*100).toFixed(0)}%</small></div>
          <div className="displayPage"><strong>{visiblePage.title}</strong><span>{fine?'FINE':'NORMAL'}</span></div>
          {partId==='alpha'&&page.id==='alpha'&&globalPage===null&&<div className="alphaDialReadout"><small>PARAM {String(alphaParamIndex+1).padStart(2,'0')}</small><b>{ALPHA_DIAL_LABELS[alphaParamIndex]??alphaDial.label}</b><strong>{pretty(alphaDial.binding,alphaValues[alphaDial.binding.id])}</strong></div>}
          <div className="displayParams">{displayParams.map((name,i)=><div key={`${name}-${i}`} className={available(i)?'':'unavailable'}><small>K{i+1}</small><b>{name}</b><em>{available(i)?controlValue(i):'N/A'}</em></div>)}</div>
          {stepStrip&&<div className="displaySteps">{Array.from({length:16},(_,i)=><span key={i} className={`${stepActive(i)?'on':''} ${i===seqCursor?'cursor':''} ${playing&&i===step?'play':''}`}>{i+1}</span>)}</div>}
          <div className="displayFooter"><span className={partId==='mini'?'selected':''}>MINI</span><span className={partId==='drum808'?'selected':''}>808D</span><span className={partId==='bass808'?'selected':''}>808B</span><span className={partId==='alpha'?'selected':''}>ALPHA</span></div>
        </div></div>
        <div className="fm1RightControls"><div className="fm1KnobRow">{displayParams.map((name,i)=><HardwareKnob key={`${name}-${i}`} label={partId==='alpha'&&page.id==='alpha'&&i===0?'ALPHA DIAL':`KNOB ${i+1}`} value={available(i)?controlValue(i):'N/A'} normalized={controlRatio(i)} alphaDial={partId==='alpha'&&page.id==='alpha'&&i===0} disabled={!available(i)} onDelta={d=>void adjust(i,d)} onPress={()=>pressControl(i)}/>)}</div><div className="fm1FunctionGrid">{['FX','SEL','ENV','LFO','EDIT','GLO','HOME','SAVE','ARP','SEQ','PLAY/STOP','REC'].map(label=>{const disabled=label==='REC'||label==='SAVE'||label==='ARP';const active=(label==='PLAY/STOP'&&playing)||(label==='EDIT'&&fine)||(label==='FX'&&globalPage===1)||(label==='GLO'&&globalPage!==null);return <button key={label} disabled={disabled} className={active?'active':disabled?'disabled':''} onClick={()=>functionButton(label)}>{label}</button>})}</div></div>
      </div>
      <div className="fm1UpperPads">{['OP1','OP2','OP3','OP4','OP5','OP6','P1','GLO','MONO','POLY'].map((x,i)=><button key={x} className={i<4&&PARTS[i]===partId?'active':''} onClick={()=>{if(i<4)changePart(PARTS[i]);else if(x==='GLO')setGlobalPage(globalPage===null?0:null);else if(x==='MONO')changePart('mini');else if(x==='POLY')changePart('alpha')}}>{x}<span>{i<4?WORKSTATION_PARTS[i].title:''}</span></button>)}</div>
      <div className="fm1Keybed">{keys.map((note,i)=><button key={`${note}-${i}`} className={held.includes(note)?'held':''} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);void triggerSource(`ptr:${e.pointerId}`,note,i)}} onPointerUp={e=>releaseSource(`ptr:${e.pointerId}`)} onPointerCancel={e=>releaseSource(`ptr:${e.pointerId}`)}><i/><small>{partId==='drum808'?DRUM_SHORT[i%8]:`${NOTE_NAMES[note%12]}${Math.floor(note/12)-1}`}</small><kbd>{COMPUTER_KEYS[i]?.replace('Key','').replace('Digit','')??''}</kbd></button>)}</div>
    </section>
    <section className="fm1Status"><span><b>ALPHA</b> K1 is the Alpha Dial value control; K2 selects parameter; K3 browses the 128 factory-name bank; K4 selects/auditions chord memory.</span><span><b>PAGE</b> DCO / VCF / VCA / ENV / LFO / CHORUS remain directly editable.</span><span><b>SEQ</b> all four parts run from the native sample clock.</span><span><b>FX</b> delay / ambience / drive are native workstation DSP.</span></section>
    {message&&<div className={audioState==='error'?'fm1Message error':'fm1Message'}>{message}</div>}
  </main>;

  async function adjustGlobalMaster(d:number){if(!await ensureAudio())return;const n=Math.max(0,Math.min(1.2,master+d*(fine?.01:.04)));setMaster(n);workstation.setMaster(n)}
}

function HardwareKnob({label,value,normalized,onDelta,onPress,disabled=false,alphaDial=false}:{label:string;value:string;normalized:number;onDelta:(delta:number)=>void|Promise<void>;onPress?:()=>void;disabled?:boolean;alphaDial?:boolean}){
  const drag=useRef<{y:number;carry:number;moved:boolean}|null>(null),angle=-135+Math.max(0,Math.min(1,normalized))*270,style={'--knob-angle':`${angle}deg`} as CSSProperties;
  const move=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!drag.current||disabled)return;const dy=drag.current.y-e.clientY;drag.current.y=e.clientY;drag.current.carry+=dy;while(Math.abs(drag.current.carry)>=5){const dir=drag.current.carry>0?1:-1;drag.current.carry-=dir*5;drag.current.moved=true;void onDelta(dir)}};
  return <div className={`hardwareKnob ${disabled?'disabled':''} ${alphaDial?'alphaDialKnob':''}`}><label>{label}</label><button disabled={disabled} style={style} onPointerDown={e=>{if(disabled||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,carry:0,moved:false}}} onPointerMove={move} onPointerUp={e=>{if(!drag.current)return;const moved=drag.current.moved;drag.current=null;if(!moved){if(onPress)onPress();else void onDelta(e.shiftKey?-1:1)}}} onPointerCancel={()=>{drag.current=null}} onWheel={e=>{if(disabled)return;e.preventDefault();void onDelta(e.deltaY<0?1:-1)}}><span/></button><small>{value}</small></div>;
}
