import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {WORKSTATION_GLOBAL_PAGES,WORKSTATION_PARTS,type WorkstationPartId} from './generated/workstation';
import {workstation,WORKSTATION_RUNTIME_FIELD,type WorkstationMiniStep,type WorkstationScene} from './audio/workstation';
import {BASS808_PARAM,type Bass808Pattern} from './audio/bass808';
import {type Drum808Pattern,type Drum808VoiceId} from './audio/drum808';
import {ALPHA_PARAM,type AlphaParamId,type AlphaPatch} from './audio/alpha';
import {ALPHA_ALL_PRESETS} from './data/alphaPresets';
import {PARAM} from './generated/params';
import {WORKSTATION_SCENES} from './data/workstationScenes';
import './fm1Virtual.css';
import './fm1Next.css';

type Binding={id:number;label:string;min:number;max:number;step:number;initial:number;unit?:string;kind?:'toggle'|'wave'|'mode'|'range'};
type DrumVoiceState={level:number;tune:number;decay:number;tone:number};
type AlphaLaneStep={chord:number;gate:number;velocity:number};
type ActiveNote={note:number;part:WorkstationPartId};
type AlphaFocus='param'|'value';
type ToneModify='BRILLIANCE'|'MOD RATE'|'MOD DEPTH'|'ENV TIME';

const PARTS:WorkstationPartId[]=['mini','drum808','bass808','alpha'];
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const DRUM_SHORT=['BD','SD','CH','OH','CP','TM','CB','RS'];
const COMPUTER_KEYS=['KeyZ','KeyS','KeyX','KeyD','KeyC','KeyV','KeyG','KeyB','KeyH','KeyN','KeyJ','KeyM','Comma','KeyL','Period','Semicolon','Slash','KeyQ','Digit2','KeyW','Digit3','KeyE','KeyR','Digit5','KeyT','Digit6','KeyY'];
const ALPHA_CHORDS:[[number,number,number,number],[number,number,number,number],[number,number,number,number],[number,number,number,number],[number,number,number,number]]=[[48,55,60,64],[45,52,57,60],[50,57,62,65],[43,50,55,59],[48,52,55,60]];
const MODIFY_NAMES:ToneModify[]=['BRILLIANCE','MOD RATE','MOD DEPTH','ENV TIME'];

const b=(id:number,label:string,min:number,max:number,step:number,initial:number,extra:Partial<Binding>={}):Binding=>({id,label,min,max,step,initial,...extra});
const MINI:Record<string,(Binding|null)[]>={
  osc:[b(PARAM.osc1Level,'OSC 1',0,1,.04,.8),b(PARAM.osc2Level,'OSC 2',0,1,.04,.55),b(PARAM.osc3Level,'OSC 3',0,1,.04,.35),b(PARAM.glide,'GLIDE',0,1.5,.02,.05,{unit:'s'})],
  mix:[b(PARAM.mixerDrive,'MIX DRIVE',.5,4,.08,1.2),b(PARAM.filterDrive,'FILTER DRIVE',.5,4,.08,1.1),b(PARAM.feedback,'FEEDBACK',0,.95,.03,.08),b(PARAM.oversample,'2X OS',0,1,1,0,{kind:'toggle'})],
  filter:[b(PARAM.cutoff,'CUTOFF',40,12000,100,1800,{unit:'Hz'}),b(PARAM.res,'RESONANCE',0,1,.03,.35),b(PARAM.env,'CONTOUR',-6000,6000,100,2200,{unit:'Hz'}),b(PARAM.keytrack,'KEYTRACK',0,1,.05,.65)],
  env:[b(PARAM.attack,'ATTACK',.001,4,.03,.01,{unit:'s'}),b(PARAM.decay,'DECAY',.01,5,.03,.32,{unit:'s'}),b(PARAM.sustain,'SUSTAIN',0,1,.03,.82),b(PARAM.release,'RELEASE',.01,6,.03,.2,{unit:'s'})],
  mod:[b(PARAM.drift,'DRIFT',0,1,.03,.08),b(PARAM.glideMode,'GLIDE MODE',0,1,1,0,{kind:'toggle'}),b(PARAM.notePriority,'PRIORITY',0,2,1,2,{kind:'mode'}),b(PARAM.retrigger,'RETRIGGER',0,1,1,1,{kind:'toggle'})]
};
const BASS:Record<string,(Binding|null)[]>={
  osc:[b(BASS808_PARAM.wave,'WAVE',0,1,1,0,{kind:'wave'}),b(BASS808_PARAM.tune,'TUNE',-12,12,.25,0),b(BASS808_PARAM.sub,'SUB',0,.7,.03,.12),b(BASS808_PARAM.drive,'DRIVE',.5,4,.08,1.35)],
  filter:[b(BASS808_PARAM.cutoff,'CUTOFF',35,8000,80,640,{unit:'Hz'}),b(BASS808_PARAM.resonance,'RESONANCE',0,1,.03,.62),b(BASS808_PARAM.envMod,'ENV MOD',0,6000,80,2200,{unit:'Hz'}),b(BASS808_PARAM.accent,'ACCENT',0,1.25,.03,.62)],
  env:[b(BASS808_PARAM.decay,'DECAY',.02,2,.02,.28,{unit:'s'}),b(BASS808_PARAM.slide,'SLIDE',.005,.5,.01,.085,{unit:'s'}),null,b(BASS808_PARAM.accentDecay,'ACC DECAY',.02,1,.02,.16,{unit:'s'})]
};
const ALPHA:Record<string,(Binding|null)[]>={
  dco:[b(ALPHA_PARAM.saw,'SAW',0,1,.04,.72),b(ALPHA_PARAM.pulse,'PULSE',0,1,.04,.28),b(ALPHA_PARAM.sub,'SUB',0,1,.04,.34),b(ALPHA_PARAM.noise,'NOISE',0,.5,.02,.02)],
  vcf:[b(ALPHA_PARAM.cutoff,'CUTOFF',45,12000,100,1800,{unit:'Hz'}),b(ALPHA_PARAM.resonance,'RESONANCE',0,1,.03,.22),b(ALPHA_PARAM.env,'VCF ENV',-6500,6500,80,2100,{unit:'Hz'}),b(ALPHA_PARAM.keytrack,'KEY FOLLOW',0,1,.03,.35)],
  vca:[b(ALPHA_PARAM.level,'VCA LEVEL',0,1.2,.04,.72),b(ALPHA_PARAM.envMode,'VCA MODE',0,1,1,0,{kind:'toggle'}),b(ALPHA_PARAM.velocity,'VELOCITY',0,1,.04,.32),b(ALPHA_PARAM.chorusMix,'CHORUS MIX',0,.85,.03,.34)],
  env:[b(ALPHA_PARAM.attack,'ATTACK',.001,4,.03,.018,{unit:'s'}),b(ALPHA_PARAM.decay,'DECAY',.01,5,.03,.42,{unit:'s'}),b(ALPHA_PARAM.sustain,'SUSTAIN',0,1,.03,.68),b(ALPHA_PARAM.release,'RELEASE',.01,6,.03,.48,{unit:'s'})],
  lfo:[b(ALPHA_PARAM.lfoRate,'LFO RATE',.02,15,.08,.38,{unit:'Hz'}),b(ALPHA_PARAM.lfoDelay,'LFO DELAY',0,5,.04,.25,{unit:'s'}),b(ALPHA_PARAM.dcoMod,'DCO LFO',0,2,.03,.06),b(ALPHA_PARAM.vcfMod,'VCF LFO',0,2000,25,120,{unit:'Hz'})],
  chorus:[b(ALPHA_PARAM.chorusMode,'CHORUS MODE',0,2,1,1,{kind:'mode'}),b(ALPHA_PARAM.chorusRate,'CHORUS RATE',.02,5,.04,.28,{unit:'Hz'}),b(ALPHA_PARAM.chorusDepth,'CHORUS DEPTH',0,1,.03,.46),b(ALPHA_PARAM.chorusMix,'CHORUS MIX',0,.85,.03,.34)]
};
const ALPHA_DIAL_PARAMS:Binding[]=[
  b(ALPHA_PARAM.dcoRange,'DCO RANGE',-24,24,12,0,{kind:'range'}),
  b(ALPHA_PARAM.saw,'SAW LEVEL',0,1,.04,.72),b(ALPHA_PARAM.pulse,'PULSE LEVEL',0,1,.04,.28),b(ALPHA_PARAM.sub,'SUB LEVEL',0,1,.04,.34),b(ALPHA_PARAM.noise,'NOISE LEVEL',0,.5,.02,.02),
  b(ALPHA_PARAM.pulseWidth,'PULSE WIDTH',.05,.95,.025,.5),b(ALPHA_PARAM.pwmDepth,'PWM DEPTH',0,.4,.02,.12),b(ALPHA_PARAM.pwmRate,'PWM RATE',.02,12,.08,.3,{unit:'Hz'}),b(ALPHA_PARAM.dcoEnv,'DCO ENV',-12,12,.25,0),
  b(ALPHA_PARAM.cutoff,'VCF CUTOFF',45,12000,100,1800,{unit:'Hz'}),b(ALPHA_PARAM.resonance,'VCF RESO',0,1,.03,.22),b(ALPHA_PARAM.env,'VCF ENV',-6500,6500,80,2100,{unit:'Hz'}),b(ALPHA_PARAM.keytrack,'VCF KEY FOLLOW',0,1,.03,.35),b(ALPHA_PARAM.vcfMod,'VCF LFO',0,2000,25,120,{unit:'Hz'}),b(ALPHA_PARAM.hpf,'HPF CUTOFF',0,1600,40,0,{unit:'Hz'}),
  b(ALPHA_PARAM.level,'VCA LEVEL',0,1.2,.04,.72),b(ALPHA_PARAM.envMode,'VCA ENV/GATE',0,1,1,0,{kind:'toggle'}),b(ALPHA_PARAM.velocity,'VCA DYNAMICS',0,1,.04,.32),
  b(ALPHA_PARAM.attack,'ENV ATTACK',.001,4,.03,.018,{unit:'s'}),b(ALPHA_PARAM.decay,'ENV DECAY',.01,5,.03,.42,{unit:'s'}),b(ALPHA_PARAM.sustain,'ENV SUSTAIN',0,1,.03,.68),b(ALPHA_PARAM.release,'ENV RELEASE',.01,6,.03,.48,{unit:'s'}),
  b(ALPHA_PARAM.lfoRate,'LFO RATE',.02,15,.08,.38,{unit:'Hz'}),b(ALPHA_PARAM.lfoDelay,'LFO DELAY',0,5,.04,.25,{unit:'s'}),b(ALPHA_PARAM.dcoMod,'DCO LFO',0,2,.03,.06),
  b(ALPHA_PARAM.chorusMode,'CHORUS MODE',0,2,1,1,{kind:'mode'}),b(ALPHA_PARAM.chorusRate,'CHORUS RATE',.02,5,.04,.28,{unit:'Hz'}),b(ALPHA_PARAM.chorusDepth,'CHORUS DEPTH',0,1,.03,.46),b(ALPHA_PARAM.chorusMix,'CHORUS MIX',0,.85,.03,.34)
];
const DRUM_TUNES=[52,185,6800,4800,1200,120,540,1800],DRUM_DECAYS=[.42,.34,.08,.42,.28,.38,.22,.08];

function initialValues(map:Record<string,(Binding|null)[]>){const out:Record<number,number>={};for(const row of Object.values(map))for(const item of row)if(item&&out[item.id]===undefined)out[item.id]=item.initial;return out}
function initialAlphaValues(){const out=initialValues(ALPHA);for(const item of ALPHA_DIAL_PARAMS)if(out[item.id]===undefined)out[item.id]=item.initial;return out}
function initialDrumKit():DrumVoiceState[]{return Array.from({length:8},(_,i)=>({level:i<4?.9:.72,tune:DRUM_TUNES[i],decay:DRUM_DECAYS[i],tone:.55}))}
function clamp(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v))}
function pretty(item:Binding|null,value:number|undefined){if(!item||value===undefined)return '—';if(item.kind==='wave')return value>=.5?'SQUARE':'SAW';if(item.kind==='toggle')return value>=.5?'ON':'OFF';if(item.kind==='mode')return String(Math.round(value));if(item.kind==='range')return `${value>=0?'+':''}${Math.round(value)} st`;if(item.unit==='Hz')return `${Math.round(value)} Hz`;if(item.unit==='s')return `${value.toFixed(value<.1?3:2)} s`;return value.toFixed(2)}
function ratio(item:Binding|null,value:number|undefined){if(!item||value===undefined||item.max===item.min)return .5;return clamp((value-item.min)/(item.max-item.min),0,1)}
function noteName(note:number){return note<0?'REST':`${NOTE_NAMES[(note+120)%12]}${Math.floor(note/12)-1}`}
function cloneBass(index:number):Bass808Pattern{const p=WORKSTATION_SCENES[index].bassPattern;return {...p,steps:p.steps.map(s=>({...s}))}}
function cloneDrums(index:number):Drum808Pattern{const p=WORKSTATION_SCENES[index].drumPattern;return {...p,steps:p.steps.map(s=>({...s}))}}
function sceneRoot(index:number){const note=WORKSTATION_SCENES[index].bassPattern.steps.find(s=>s.note>=0)?.note??48;return clamp(note+12,24,84)}
function createMiniLane(index:number):WorkstationMiniStep[]{const root=sceneRoot(index);return Array.from({length:16},(_,i)=>i%4===0?{note:clamp(root+(i===8?7:0),0,127),velocity:84,gate:3.45}:{note:-1,velocity:84,gate:.9})}
function createAlphaLane(index:number):AlphaLaneStep[]{const progression=[index%5,(index+1)%5,(index+3)%5,index%5];return Array.from({length:16},(_,i)=>i%4===0?{chord:progression[(i/4)%4],gate:3.45,velocity:76}:{chord:-1,gate:.9,velocity:76})}

export function FM1WorkstationNext(){
  const [partId,setPartId]=useState<WorkstationPartId>('alpha');
  const [pageIndex,setPageIndex]=useState<Record<WorkstationPartId,number>>({mini:0,drum808:0,bass808:0,alpha:0});
  const [globalPage,setGlobalPage]=useState<number|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [tempo,setTempo]=useState(WORKSTATION_SCENES[0].bpm),[swing,setSwing]=useState(WORKSTATION_SCENES[0].swing);
  const [miniLane,setMiniLane]=useState(()=>createMiniLane(0)),[bassPattern,setBassPattern]=useState(()=>cloneBass(0)),[drumPattern,setDrumPattern]=useState(()=>cloneDrums(0)),[alphaLane,setAlphaLane]=useState(()=>createAlphaLane(0));
  const [seqCursor,setSeqCursor]=useState(0),[playing,setPlaying]=useState(false),[playStep,setPlayStep]=useState(0),[peak,setPeak]=useState(0);
  const [master,setMaster]=useState(.72),[delayMix,setDelayMix]=useState(.12),[ambienceMix,setAmbienceMix]=useState(.12),[masterDrive,setMasterDrive]=useState(1);
  const [octave,setOctave]=useState(0),[fine,setFine]=useState(false),[audioState,setAudioState]=useState<'idle'|'ready'|'error'>('idle'),[message,setMessage]=useState('');
  const [miniValues,setMiniValues]=useState<Record<number,number>>(()=>initialValues(MINI));
  const [bassValues,setBassValues]=useState<Record<number,number>>(()=>({...initialValues(BASS),...WORKSTATION_SCENES[0].bassPatch.values}));
  const [alphaValues,setAlphaValues]=useState<Record<number,number>>(()=>({...initialAlphaValues(),...ALPHA_ALL_PRESETS[0].values}));
  const [alphaParamIndex,setAlphaParamIndex]=useState(9),[alphaPresetIndex,setAlphaPresetIndex]=useState(0),[alphaFocus,setAlphaFocus]=useState<AlphaFocus>('param');
  const [modifyIndex,setModifyIndex]=useState(0),[modifyAmount,setModifyAmount]=useState<[number,number,number,number]>([0,0,0,0]);
  const [drumVoice,setDrumVoice]=useState(0),[drumKit,setDrumKit]=useState<DrumVoiceState[]>(initialDrumKit),[drumAccent,setDrumAccent]=useState(.65),[drumDrive,setDrumDrive]=useState(1.05),[drumMuted,setDrumMuted]=useState(false);
  const [partLevels,setPartLevels]=useState<[number,number,number,number]>([.60,.34,.31,.58]),[held,setHeld]=useState<number[]>([]);
  const activeRef=useRef(new Map<string,ActiveNote>()),syncedRef=useRef(false),partRef=useRef(partId);partRef.current=partId;

  const part=useMemo(()=>WORKSTATION_PARTS.find(p=>p.id===partId)??WORKSTATION_PARTS[0],[partId]);
  const pages=part.pages as readonly {id:string;title:string;params:readonly string[]}[];
  const page=pages[pageIndex[partId]??0]??pages[0];
  const scene=WORKSTATION_SCENES[sceneIndex];
  const visiblePage=globalPage===null?page:WORKSTATION_GLOBAL_PAGES[globalPage];
  const bindingPage=partId==='mini'?MINI[page.id]:partId==='bass808'?BASS[page.id]:partId==='alpha'?ALPHA[page.id]:undefined;
  const bindingValues:Record<number,number>=partId==='mini'?miniValues:partId==='bass808'?bassValues:alphaValues;
  const currentDrum=drumKit[drumVoice],miniStep=miniLane[seqCursor],bassStep=bassPattern.steps[seqCursor],drumStep=drumPattern.steps[seqCursor],alphaStep=alphaLane[seqCursor];
  const alphaDial=ALPHA_DIAL_PARAMS[alphaParamIndex],alphaPreset=ALPHA_ALL_PRESETS[alphaPresetIndex],toneModify=MODIFY_NAMES[modifyIndex];

  useEffect(()=>workstation.onMeter(m=>{setPlayStep(m.step);setPeak(m.peak)}),[]);
  useEffect(()=>workstation.onError(error=>{setAudioState('error');setMessage(error)}),[]);
  useEffect(()=>{
    if(audioState!=='ready')return;
    workstation.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaParam,0,alphaParamIndex);
    workstation.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaFocus,0,alphaFocus==='value'?1:0);
    workstation.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaModify,0,modifyIndex);
    modifyAmount.forEach((value,index)=>workstation.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaModifyAmount,index,value/8));
  },[alphaFocus,alphaParamIndex,audioState,modifyAmount,modifyIndex]);
  useEffect(()=>{
    if(audioState!=='ready'||partId!=='alpha'||page.id!=='alpha'||globalPage!==null)return;
    let active=true;
    Promise.all([
      workstation.getRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaParam),
      workstation.getRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaFocus),
      workstation.getRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaModify),
      ...[0,1,2,3].map(index=>workstation.getRuntimeValue(WORKSTATION_RUNTIME_FIELD.alphaModifyAmount,index))
    ]).then(([param,focus,modify,...amounts])=>{
      if(!active)return;
      setAlphaParamIndex(clamp(Math.round(param),0,ALPHA_DIAL_PARAMS.length-1));
      setAlphaFocus(focus>=.5?'value':'param');
      setModifyIndex(clamp(Math.round(modify),0,MODIFY_NAMES.length-1));
      setModifyAmount(amounts.map(amount=>clamp(Math.round(amount*8),-8,8)) as [number,number,number,number]);
    }).catch(error=>{if(active)setMessage(`Runtime readback failed: ${String(error)}`)});
    return()=>{active=false};
  },[audioState,globalPage,page.id,partId]);

  const pushSequence=useCallback((ml=miniLane,bp=bassPattern,dp=drumPattern,al=alphaLane,bpm=tempo,sw=swing)=>{
    const length=16;workstation.setSequenceMeta(length,bpm,sw);
    for(let i=0;i<length;i++){
      const m=ml[i];workstation.setMiniStep(i,m.note,{velocity:m.velocity,gate:m.gate});
      const bs=bp.steps[i];workstation.setBassStep(i,bs.note,{accent:!!bs.accent,slide:!!bs.slide,gate:bs.gate??.72});
      const ds=dp.steps[i];workstation.setDrumStep(i,ds.hits,ds.accent);
      const as=al[i];workstation.setAlphaStep(i,as.chord>=0?ALPHA_CHORDS[as.chord]:[-1,-1,-1,-1],{velocity:as.velocity,gate:as.gate});
    }
  },[alphaLane,bassPattern,drumPattern,miniLane,swing,tempo]);

  const ensureAudio=useCallback(async()=>{
    try{
      await workstation.start();
      if(!syncedRef.current){
        workstation.setMaster(master);workstation.setFxParam(0,delayMix);workstation.setFxParam(1,ambienceMix);workstation.setFxParam(2,masterDrive);
        partLevels.forEach((v,i)=>workstation.setPartLevel(i as 0|1|2|3,i===1&&drumMuted?0:v));
        Object.entries(miniValues).forEach(([id,v])=>workstation.setMiniParam(+id,v));
        Object.entries(bassValues).forEach(([id,v])=>workstation.setBassParam(+id as never,v));
        Object.entries(alphaValues).forEach(([id,v])=>workstation.setAlphaParam(+id as AlphaParamId,v));
        drumKit.forEach((v,i)=>{workstation.setDrumVoiceParam(i as Drum808VoiceId,0,v.level);workstation.setDrumVoiceParam(i as Drum808VoiceId,1,v.tune);workstation.setDrumVoiceParam(i as Drum808VoiceId,2,v.decay);workstation.setDrumVoiceParam(i as Drum808VoiceId,3,v.tone)});
        workstation.setDrumGlobalParam(0,drumAccent);workstation.setDrumGlobalParam(1,drumDrive);pushSequence();syncedRef.current=true;
      }
      setAudioState('ready');return true;
    }catch(error){setAudioState('error');setMessage(error instanceof Error?error.message:String(error));return false}
  },[alphaValues,ambienceMix,bassValues,delayMix,drumAccent,drumDrive,drumKit,drumMuted,master,masterDrive,miniValues,partLevels,pushSequence]);

  const setAlphaParams=(patch:Record<number,number>)=>{setAlphaValues(v=>({...v,...patch}));for(const [id,value] of Object.entries(patch))workstation.setAlphaParam(+id as AlphaParamId,value)};
  const changeAlphaValue=(delta:number)=>{const current=alphaValues[alphaDial.id]??alphaDial.initial;let value=clamp(current+delta*alphaDial.step*(fine?.25:1),alphaDial.min,alphaDial.max);if(alphaDial.kind)value=Math.round(value);setAlphaParams({[alphaDial.id]:value})};
  const applyAlphaPreset=async(next:number)=>{const index=(next+ALPHA_ALL_PRESETS.length)%ALPHA_ALL_PRESETS.length,preset:AlphaPatch=ALPHA_ALL_PRESETS[index];setAlphaPresetIndex(index);setModifyAmount([0,0,0,0]);const values={...initialAlphaValues(),...preset.values};setAlphaValues(values);if(await ensureAudio())for(const [id,v] of Object.entries(values))workstation.setAlphaParam(+id as AlphaParamId,v)};
  const applyToneModify=(delta:number)=>{
    const params=toneModify==='BRILLIANCE'?[ALPHA_PARAM.cutoff,ALPHA_PARAM.hpf,ALPHA_PARAM.resonance]:toneModify==='MOD RATE'?[ALPHA_PARAM.lfoRate,ALPHA_PARAM.pwmRate]:toneModify==='MOD DEPTH'?[ALPHA_PARAM.dcoMod,ALPHA_PARAM.vcfMod,ALPHA_PARAM.pwmDepth]:[ALPHA_PARAM.attack,ALPHA_PARAM.decay,ALPHA_PARAM.release];
    void workstation.applyAlphaToneModify(delta,modifyIndex,params).then(({amount,values})=>{
      setAlphaValues(current=>({...current,...Object.fromEntries(params.map((id,index)=>[id,values[index]]))}));
      setModifyAmount(current=>{const next=[...current] as [number,number,number,number];next[modifyIndex]=clamp(Math.round(amount*8),-8,8);return next});
    }).catch(error=>setMessage(`Tone Modify failed: ${String(error)}`));
  };

  const releaseSource=useCallback((source:string)=>{const entry=activeRef.current.get(source);if(!entry)return;activeRef.current.delete(source);if(entry.part==='mini')workstation.miniNoteOff(entry.note);else if(entry.part==='alpha')workstation.alphaNoteOff(entry.note);else if(entry.part==='bass808'){const remaining=[...activeRef.current.values()].filter(v=>v.part==='bass808');if(remaining.length)workstation.bassNoteOn(remaining.at(-1)!.note);else workstation.bassNoteOff()}setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))])},[]);
  const triggerSource=useCallback(async(source:string,note:number,index:number)=>{if(activeRef.current.has(source)||!await ensureAudio())return;const p=partRef.current;activeRef.current.set(source,{note,part:p});if(p==='mini')workstation.miniNoteOn(note,104);else if(p==='alpha')workstation.alphaNoteOn(note,96);else if(p==='bass808')workstation.bassNoteOn(note);else workstation.triggerDrum((index%8) as Drum808VoiceId,104,false);setHeld([...new Set([...activeRef.current.values()].map(v=>v.note))])},[ensureAudio]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;const i=COMPUTER_KEYS.indexOf(e.code);if(i<0||e.repeat)return;e.preventDefault();void triggerSource(`kbd:${e.code}`,53+i+octave*12,i)};const up=(e:KeyboardEvent)=>{if(activeRef.current.has(`kbd:${e.code}`)){e.preventDefault();releaseSource(`kbd:${e.code}`)}};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[octave,releaseSource,triggerSource]);

  const runtimeScene=():WorkstationScene=>({...scene,bpm:tempo,swing,bassPattern:{...bassPattern,bpm:tempo,swing},drumPattern:{...drumPattern,bpm:tempo,swing},bassPatch:{...scene.bassPatch,values:{...bassValues}},alphaPatch:{...scene.alphaPatch,values:{...alphaValues}}});
  const loadScene=async(next:number)=>{const index=(next+WORKSTATION_SCENES.length)%WORKSTATION_SCENES.length,s=WORKSTATION_SCENES[index],bp=cloneBass(index),dp=cloneDrums(index),ml=createMiniLane(index),al=createAlphaLane(index),wasPlaying=playing;if(wasPlaying)workstation.stop();setSceneIndex(index);setTempo(s.bpm);setSwing(s.swing);setBassPattern(bp);setDrumPattern(dp);setMiniLane(ml);setAlphaLane(al);setBassValues({...initialValues(BASS),...s.bassPatch.values});setAlphaValues(v=>({...v,...s.alphaPatch.values}));setModifyAmount([0,0,0,0]);if(await ensureAudio()){workstation.setSceneIndex(index);await workstation.loadScene(s);pushSequence(ml,bp,dp,al,s.bpm,s.swing);if(wasPlaying)workstation.play()}};
  const toggleTransport=async()=>{if(playing){workstation.stop();setPlaying(false);return}if(!await ensureAudio())return;await workstation.loadScene(runtimeScene());pushSequence();workstation.play();setPlaying(true)};
  const changePart=(next:WorkstationPartId)=>{for(const source of [...activeRef.current.keys()])releaseSource(source);setGlobalPage(null);setPartId(next)};
  const cyclePart=(delta=1)=>changePart(PARTS[(PARTS.indexOf(partId)+delta+PARTS.length)%PARTS.length]);
  const cyclePage=(delta=1)=>{if(globalPage!==null){setGlobalPage((globalPage+delta+WORKSTATION_GLOBAL_PAGES.length)%WORKSTATION_GLOBAL_PAGES.length);return}setPageIndex(v=>({...v,[partId]:((v[partId]??0)+delta+pages.length)%pages.length}))};
  const jumpPage=(id:string)=>{setGlobalPage(null);const i=pages.findIndex(p=>p.id===id);if(i>=0)setPageIndex(v=>({...v,[partId]:i}))};
  const setCursor=(v:number)=>setSeqCursor((Math.round(v)+16)%16);
  const updateMiniStep=(patch:Partial<WorkstationMiniStep>)=>{const steps=miniLane.map((s,i)=>i===seqCursor?{...s,...patch}:s);setMiniLane(steps);const s=steps[seqCursor];workstation.setMiniStep(seqCursor,s.note,{velocity:s.velocity,gate:s.gate})};
  const updateAlphaStep=(patch:Partial<AlphaLaneStep>)=>{const steps=alphaLane.map((s,i)=>i===seqCursor?{...s,...patch}:s);setAlphaLane(steps);const s=steps[seqCursor];workstation.setAlphaStep(seqCursor,s.chord>=0?ALPHA_CHORDS[s.chord]:[-1,-1,-1,-1],{velocity:s.velocity,gate:s.gate})};
  const updateDrumVoice=(patch:Partial<DrumVoiceState>)=>setDrumKit(kit=>kit.map((v,i)=>i===drumVoice?{...v,...patch}:v));

  const adjust=async(index:number,delta:number)=>{
    if(!await ensureAudio())return;const scale=fine?.25:1;
    if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer'){const next=[...partLevels] as [number,number,number,number];next[index]=clamp(next[index]+delta*.04*scale,0,1.25);setPartLevels(next);workstation.setPartLevel(index as 0|1|2|3,index===1&&drumMuted?0:next[index])}else if(id==='scene'&&index===0)void loadScene(sceneIndex+delta);else if(id==='clock'&&index===0){const n=clamp(tempo+delta,40,300);setTempo(n);workstation.setSequenceMeta(16,n,swing)}else if(id==='clock'&&index===1){const n=clamp(swing+delta,0,75);setSwing(n);workstation.setSequenceMeta(16,tempo,n)}else if(id==='fx'){if(index===0){const n=clamp(delayMix+delta*.04*scale,0,.8);setDelayMix(n);workstation.setFxParam(0,n)}else if(index===1){const n=clamp(ambienceMix+delta*.04*scale,0,.8);setAmbienceMix(n);workstation.setFxParam(1,n)}else if(index===2){const n=clamp(masterDrive+delta*.08*scale,.5,3);setMasterDrive(n);workstation.setFxParam(2,n)}else{const n=clamp(master+delta*.04*scale,0,1.2);setMaster(n);workstation.setMaster(n)}}return}
    if(partId==='alpha'&&page.id==='alpha'){
      if(index===0){if(alphaFocus==='param')setAlphaParamIndex(v=>(v+delta+ALPHA_DIAL_PARAMS.length)%ALPHA_DIAL_PARAMS.length);else changeAlphaValue(delta)}
      else if(index===1)setAlphaFocus(delta>0?'value':'param');
      else if(index===2)void applyAlphaPreset(alphaPresetIndex+delta);
      else applyToneModify(delta);
      return;
    }
    if(page.id==='seq'){
      if(index===0)setCursor(seqCursor+delta);
      else if(partId==='mini'&&index===1)updateMiniStep({note:clamp(miniStep.note+delta,-1,127)});
      else if(partId==='mini'&&index===2)updateMiniStep({gate:clamp(miniStep.gate+delta*.05*scale,.05,4)});
      else if(partId==='alpha'&&index===1)updateAlphaStep({chord:clamp(alphaStep.chord+delta,-1,4)});
      else if(partId==='alpha'&&index===2)updateAlphaStep({gate:clamp(alphaStep.gate+delta*.05*scale,.05,4)});
      else if(partId==='bass808'){
        const steps=bassPattern.steps.map(s=>({...s}));const s=steps[seqCursor];if(index===1)s.note=clamp(s.note+delta,-1,127);else if(index===2)s.accent=!s.accent;else s.slide=!s.slide;setBassPattern({...bassPattern,steps});workstation.setBassStep(seqCursor,s.note,{accent:!!s.accent,slide:!!s.slide,gate:s.gate??.72});
      }else if(partId==='drum808'){
        if(index===3)setDrumVoice(v=>(v+delta+8)%8);else{const mask=1<<drumVoice,hits=index===1?drumStep.hits^mask:drumStep.hits|mask,accents=index===1?drumStep.accent&~mask:drumStep.accent^mask,steps=drumPattern.steps.map((s,i)=>i===seqCursor?{...s,hits,accent:accents}:s);setDrumPattern({...drumPattern,steps});workstation.setDrumStep(seqCursor,hits,accents)}
      }else if(index===3)void toggleTransport();
      return;
    }
    if(partId==='drum808'){
      if(page.id==='kit'){if(index===0){setDrumVoice(v=>(v+delta+8)%8);return}const key=(['','level','tune','decay'] as const)[index];if(!key)return;const now=currentDrum[key],step=key==='tune'?(drumVoice===0?2:20):key==='level'?.04:.02,min=key==='tune'?20:key==='level'?0:.02,max=key==='tune'?14000:key==='level'?1.2:2,value=clamp(now+delta*step*scale,min,max);updateDrumVoice({[key]:value});workstation.setDrumVoiceParam(drumVoice as Drum808VoiceId,index-1,value);return}
      if(page.id==='tone'){if(index===0){const n=clamp(currentDrum.tone+delta*.04*scale,0,1);updateDrumVoice({tone:n});workstation.setDrumVoiceParam(drumVoice as Drum808VoiceId,3,n)}else if(index===1){const n=clamp(drumAccent+delta*.04*scale,0,1.5);setDrumAccent(n);workstation.setDrumGlobalParam(0,n)}else if(index===2){const n=clamp(drumDrive+delta*.08*scale,.5,4);setDrumDrive(n);workstation.setDrumGlobalParam(1,n)}else workstation.triggerDrum(drumVoice as Drum808VoiceId,110,true);return}
      if(page.id==='mix'){const groups=[[0],[1],[2,3],[4,5,6,7]],ids=groups[index],avg=ids.reduce((sum,id)=>sum+drumKit[id].level,0)/ids.length,n=clamp(avg+delta*.04*scale,0,1.2);setDrumKit(kit=>kit.map((v,i)=>ids.includes(i)?{...v,level:n}:v));ids.forEach(id=>workstation.setDrumVoiceParam(id as Drum808VoiceId,0,n));return}
      if(page.id==='perf'){if(index===0){const n=clamp(swing+delta,0,75);setSwing(n);workstation.setSequenceMeta(16,tempo,n)}else if(index===1)[0,1,2].forEach(v=>workstation.triggerDrum(v as Drum808VoiceId,108,true));else if(index===2){const muted=!drumMuted;setDrumMuted(muted);workstation.setPartLevel(1,muted?0:partLevels[1])}else void loadScene(sceneIndex+delta);return}
    }
    if(partId==='bass808'&&page.id==='perf'){if(index===0){const n=clamp(tempo+delta,40,300);setTempo(n);workstation.setSequenceMeta(16,n,swing)}else if(index===1){const n=clamp(swing+delta,0,75);setSwing(n);workstation.setSequenceMeta(16,tempo,n)}else if(index===2)void loadScene(sceneIndex+delta);else void toggleTransport();return}
    if(partId==='bass808'&&page.id==='env'&&index===2){const steps=bassPattern.steps.map(s=>({...s})),s=steps[seqCursor];s.gate=clamp((s.gate??.72)+delta*.05*scale,.05,1);setBassPattern({...bassPattern,steps});workstation.setBassStep(seqCursor,s.note,{accent:!!s.accent,slide:!!s.slide,gate:s.gate});return}
    const item=bindingPage?.[index];if(!item)return;const current=bindingValues[item.id]??item.initial;let value=clamp(current+delta*item.step*scale,item.min,item.max);if(item.kind)value=Math.round(value);if(partId==='mini'){setMiniValues(v=>({...v,[item.id]:value}));workstation.setMiniParam(item.id,value)}else if(partId==='bass808'){setBassValues(v=>({...v,[item.id]:value}));workstation.setBassParam(item.id as never,value)}else if(partId==='alpha'){setAlphaParams({[item.id]:value})}
  };

  const saveSnapshot=()=>{localStorage.setItem('fminimug1.virtual.snapshot',JSON.stringify({sceneIndex,partId,pageIndex,master,delayMix,ambienceMix,masterDrive,octave,tempo,swing,miniValues,bassValues,alphaValues,alphaParamIndex,alphaPresetIndex,alphaFocus,modifyIndex,modifyAmount,drumKit,drumVoice,drumAccent,drumDrive,drumMuted,partLevels,miniLane,bassPattern,drumPattern,alphaLane}));setMessage('Snapshot saved')};
  const loadSnapshot=()=>{try{const raw=localStorage.getItem('fminimug1.virtual.snapshot');if(!raw){setMessage('No snapshot saved');return}const s=JSON.parse(raw);if(PARTS.includes(s.partId))setPartId(s.partId);if(s.pageIndex)setPageIndex(s.pageIndex);if(Number.isInteger(s.sceneIndex))setSceneIndex(s.sceneIndex);if(typeof s.master==='number')setMaster(s.master);if(typeof s.delayMix==='number')setDelayMix(s.delayMix);if(typeof s.ambienceMix==='number')setAmbienceMix(s.ambienceMix);if(typeof s.masterDrive==='number')setMasterDrive(s.masterDrive);if(typeof s.octave==='number')setOctave(s.octave);if(typeof s.tempo==='number')setTempo(s.tempo);if(typeof s.swing==='number')setSwing(s.swing);if(s.miniValues)setMiniValues(s.miniValues);if(s.bassValues)setBassValues(s.bassValues);if(s.alphaValues)setAlphaValues(s.alphaValues);if(Number.isInteger(s.alphaParamIndex))setAlphaParamIndex(s.alphaParamIndex);if(Number.isInteger(s.alphaPresetIndex))setAlphaPresetIndex(s.alphaPresetIndex);if(s.alphaFocus==='param'||s.alphaFocus==='value')setAlphaFocus(s.alphaFocus);if(Number.isInteger(s.modifyIndex))setModifyIndex(s.modifyIndex);if(Array.isArray(s.modifyAmount))setModifyAmount(s.modifyAmount);if(s.drumKit)setDrumKit(s.drumKit);if(Number.isInteger(s.drumVoice))setDrumVoice(s.drumVoice);if(typeof s.drumAccent==='number')setDrumAccent(s.drumAccent);if(typeof s.drumDrive==='number')setDrumDrive(s.drumDrive);if(typeof s.drumMuted==='boolean')setDrumMuted(s.drumMuted);if(Array.isArray(s.partLevels))setPartLevels(s.partLevels);if(s.miniLane)setMiniLane(s.miniLane);if(s.bassPattern)setBassPattern(s.bassPattern);if(s.drumPattern)setDrumPattern(s.drumPattern);if(s.alphaLane)setAlphaLane(s.alphaLane);syncedRef.current=false;setMessage('Snapshot loaded — next audio action resyncs DSP')}catch(error){setMessage(`Snapshot load failed: ${String(error)}`)}};

  const controlValue=(index:number)=>{
    if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[index].toFixed(2);if(id==='fx')return [`${Math.round(delayMix*100)}%`,`${Math.round(ambienceMix*100)}%`,`${masterDrive.toFixed(2)}x`,`${Math.round(master*100)}%`][index]??'—';if(id==='clock')return [tempo,swing,'INT','ON'][index]?.toString()??'—';if(id==='scene')return index===0?scene.name:index===2?'PRESS':index===3?'PRESS':'—'}
    if(partId==='alpha'&&page.id==='alpha')return [alphaFocus==='param'?alphaDial.label:pretty(alphaDial,alphaValues[alphaDial.id]),alphaFocus.toUpperCase(),alphaPreset.name,`${toneModify} ${modifyAmount[modifyIndex]>=0?'+':''}${modifyAmount[modifyIndex]}`][index]??'—';
    if(page.id==='seq'){if(partId==='mini')return [seqCursor+1,noteName(miniStep.note),`${Math.round(miniStep.gate*100)}%`,playing?'STOP':'PLAY'][index]?.toString()??'—';if(partId==='alpha')return [seqCursor+1,alphaStep.chord<0?'REST':`CH${alphaStep.chord+1}`,`${Math.round(alphaStep.gate*100)}%`,playing?'STOP':'PLAY'][index]?.toString()??'—';if(partId==='bass808')return [seqCursor+1,noteName(bassStep.note),bassStep.accent?'ON':'OFF',bassStep.slide?'ON':'OFF'][index]?.toString()??'—';const mask=1<<drumVoice;return [seqCursor+1,(drumStep.hits&mask)?'ON':'OFF',(drumStep.accent&mask)?'ON':'OFF',DRUM_SHORT[drumVoice]][index]?.toString()??'—'}
    if(partId==='drum808'){if(page.id==='kit')return [DRUM_SHORT[drumVoice],currentDrum.level.toFixed(2),`${Math.round(currentDrum.tune)} Hz`,`${currentDrum.decay.toFixed(2)} s`][index];if(page.id==='tone')return [currentDrum.tone.toFixed(2),drumAccent.toFixed(2),drumDrive.toFixed(2),'HIT'][index];if(page.id==='mix'){const ids=[[0],[1],[2,3],[4,5,6,7]][index];return (ids.reduce((sum,id)=>sum+drumKit[id].level,0)/ids.length).toFixed(2)}if(page.id==='perf')return [swing,'FILL',drumMuted?'MUTED':'ON',sceneIndex+1][index]?.toString()??'—'}
    if(partId==='bass808'){if(page.id==='perf')return [tempo,swing,sceneIndex+1,playing?'STOP':'PLAY'][index]?.toString()??'—';if(page.id==='env'&&index===2)return `${Math.round((bassStep.gate??.72)*100)}%`}
    const item=bindingPage?.[index]??null;return pretty(item,item?bindingValues[item.id]:undefined)
  };
  const controlRatio=(index:number)=>{if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;if(id==='mixer')return partLevels[index]/1.25;if(id==='fx')return [delayMix/.8,ambienceMix/.8,(masterDrive-.5)/2.5,master/1.2][index]??.5;if(id==='clock')return index===0?(tempo-40)/260:index===1?swing/75:.5;if(id==='scene'&&index===0)return sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1);return .5}if(partId==='alpha'&&page.id==='alpha')return [alphaFocus==='param'?alphaParamIndex/(ALPHA_DIAL_PARAMS.length-1):ratio(alphaDial,alphaValues[alphaDial.id]),alphaFocus==='value'?1:0,alphaPresetIndex/(ALPHA_ALL_PRESETS.length-1),(modifyAmount[modifyIndex]+8)/16][index]??.5;if(page.id==='seq')return index===0?seqCursor/15:index===3?(playing?1:0):.5;if(partId==='drum808'){if(page.id==='kit')return [drumVoice/7,currentDrum.level/1.2,Math.min(1,currentDrum.tune/14000),Math.min(1,currentDrum.decay/2)][index];if(page.id==='tone')return [currentDrum.tone,drumAccent/1.5,(drumDrive-.5)/3.5,.5][index];if(page.id==='perf')return [swing/75,.5,drumMuted?1:0,sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1)][index]}if(partId==='bass808'&&page.id==='perf')return [(tempo-40)/260,swing/75,sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1),playing?1:0][index];const item=bindingPage?.[index]??null;return ratio(item,item?bindingValues[item.id]:undefined)};
  const available=(index:number)=>{if(globalPage!==null){const id=WORKSTATION_GLOBAL_PAGES[globalPage].id;return id==='mixer'||id==='fx'||(id==='scene'&&(index===0||index===2||index===3))||(id==='clock'&&(index===0||index===1))}if(partId==='alpha'&&page.id==='alpha')return true;if(partId==='drum808')return true;if(page.id==='seq')return true;if(partId==='bass808'&&(page.id==='perf'||(page.id==='env'&&index===2)))return true;return !!bindingPage?.[index]};
  const pressControl=(index:number)=>{if(globalPage!==null&&WORKSTATION_GLOBAL_PAGES[globalPage].id==='scene'){if(index===2)saveSnapshot();else if(index===3)loadSnapshot();return}if(partId==='alpha'&&page.id==='alpha'){if(index===0||index===1)setAlphaFocus(v=>v==='param'?'value':'param');else if(index===3)setModifyIndex(v=>(v+1)%MODIFY_NAMES.length);return}const label=visiblePage.params[index];if(label==='PLAY')void toggleTransport();else if(label==='TRIGGER')workstation.triggerDrum(drumVoice as Drum808VoiceId,110,true);else if(label==='FILL')[0,1,2].forEach(v=>workstation.triggerDrum(v as Drum808VoiceId,108,true));else if(label==='HIT'||label==='ACCENT'||label==='SLIDE')void adjust(index,1)};
  const functionButton=(label:string)=>{if(label==='SEL')cyclePart();else if(label==='HOME'){setGlobalPage(null);setPageIndex(v=>({...v,[partId]:0}))}else if(label==='ENV')jumpPage('env');else if(label==='LFO')jumpPage(partId==='alpha'?'lfo':'mod');else if(label==='SEQ')jumpPage('seq');else if(label==='ARP')jumpPage('perf');else if(label==='FX')setGlobalPage(1);else if(label==='GLO')setGlobalPage(globalPage===null?0:null);else if(label==='EDIT')setFine(v=>!v);else if(label==='SAVE')saveSnapshot();else if(label==='PLAY/STOP')void toggleTransport()};

  const keys=Array.from({length:27},(_,i)=>53+i+octave*12),displayParams=visiblePage.params,stepStrip=page.id==='seq'&&globalPage===null;
  const stepActive=(i:number)=>partId==='mini'?miniLane[i].note>=0:partId==='bass808'?bassPattern.steps[i].note>=0:partId==='drum808'?drumPattern.steps[i].hits!==0:alphaLane[i].chord>=0;

  return <main className="fm1Stage">
    <div className="fm1Title"><strong>FMiniMug1 WORKSTATION V2</strong><span>VIRTUAL FM-1 · NATIVE WASM · {audioState.toUpperCase()}</span></div>
    <section className="fm1Device">
      <div className="fm1Top">
        <div className="fm1LeftControls">
          <HardwareKnob label="MASTER" value={`${Math.round(master*100)}%`} normalized={master/1.2} onDelta={async d=>{if(!await ensureAudio())return;const n=clamp(master+d*(fine?.01:.04),0,1.2);setMaster(n);workstation.setMaster(n)}}/>
          <HardwareKnob label="SELECT" value={part.title} normalized={PARTS.indexOf(partId)/3} onDelta={cyclePart}/>
          <HardwareKnob label="PRESETS" value={`SCN ${String(sceneIndex+1).padStart(2,'0')}`} normalized={sceneIndex/Math.max(1,WORKSTATION_SCENES.length-1)} onDelta={d=>void loadScene(sceneIndex+d)}/>
          <HardwareKnob label="ALGORITHM" value={globalPage===null?`${(pageIndex[partId]??0)+1}/${pages.length}`:`G${globalPage+1}`} normalized={globalPage===null?(pageIndex[partId]??0)/Math.max(1,pages.length-1):globalPage/3} onDelta={cyclePage}/>
          <button className="fm1Oct" onClick={()=>setOctave(v=>Math.max(-3,v-1))}>OCT−</button><button className="fm1Oct" onClick={()=>setOctave(v=>Math.min(3,v+1))}>OCT+</button><div className="octReadout">OCT {octave>=0?'+':''}{octave}</div>
        </div>
        <div className="fm1DisplayBezel"><div className="fm1Display">
          <div className="displayHeader"><b>{globalPage===null?part.title:'GLOBAL'}</b><span>{playing?`▶ ${String(playStep+1).padStart(2,'0')}`:'■ READY'}</span></div>
          <div className="displayScene">{partId==='alpha'&&page.id==='alpha'&&globalPage===null?alphaPreset.name:scene.name}<small>{part.subtitle} · {tempo} BPM · {swing}% SWING · PEAK {(peak*100).toFixed(0)}%</small></div>
          <div className="displayPage"><strong>{visiblePage.title}</strong><span>{partId==='alpha'&&page.id==='alpha'&&globalPage===null?`DIAL ${alphaFocus.toUpperCase()}`:fine?'FINE':'NORMAL'}</span></div>
          {partId==='alpha'&&page.id==='alpha'&&globalPage===null&&<div className={`alphaDialReadout ${alphaFocus}`}><small>{alphaFocus==='param'?`PARAM ${String(alphaParamIndex+1).padStart(2,'0')}/${ALPHA_DIAL_PARAMS.length}`:'VALUE'}</small><b>{alphaDial.label}</b><strong>{pretty(alphaDial,alphaValues[alphaDial.id])}</strong></div>}
          <div className="displayParams">{displayParams.map((name,i)=><div key={`${name}-${i}`} className={available(i)?'':'unavailable'}><small>K{i+1}</small><b>{name}</b><em>{available(i)?controlValue(i):'N/A'}</em></div>)}</div>
          {stepStrip&&<div className="displaySteps">{Array.from({length:16},(_,i)=><span key={i} className={`${stepActive(i)?'on':''} ${i===seqCursor?'cursor':''} ${playing&&i===playStep?'play':''}`}>{i+1}</span>)}</div>}
          <div className="displayFooter"><span className={partId==='mini'?'selected':''}>MINI</span><span className={partId==='drum808'?'selected':''}>808D</span><span className={partId==='bass808'?'selected':''}>808B</span><span className={partId==='alpha'?'selected':''}>ALPHA</span></div>
        </div></div>
        <div className="fm1RightControls"><div className="fm1KnobRow">{displayParams.map((name,i)=><HardwareKnob key={`${name}-${i}`} label={partId==='alpha'&&page.id==='alpha'&&i===0?'ALPHA DIAL':`KNOB ${i+1}`} value={available(i)?controlValue(i):'N/A'} normalized={controlRatio(i)} alphaDial={partId==='alpha'&&page.id==='alpha'&&i===0} active={partId==='alpha'&&page.id==='alpha'&&i===0&&alphaFocus==='value'} disabled={!available(i)} onDelta={d=>void adjust(i,d)} onPress={()=>pressControl(i)}/>)}</div><div className="fm1FunctionGrid">{['FX','SEL','ENV','LFO','EDIT','GLO','HOME','SAVE','ARP','SEQ','PLAY/STOP','REC'].map(label=>{const disabled=label==='REC'||(label==='ARP'&&partId!=='bass808'&&partId!=='drum808');const active=(label==='PLAY/STOP'&&playing)||(label==='EDIT'&&fine)||(label==='FX'&&globalPage===1)||(label==='GLO'&&globalPage!==null);return <button key={label} disabled={disabled} className={active?'active':disabled?'disabled':''} onClick={()=>functionButton(label)}>{label}</button>})}</div></div>
      </div>
      <div className="fm1UpperPads"/>
      <div className="fm1Keybed">{keys.map((note,i)=><button key={`${note}-${i}`} className={held.includes(note)?'held':''} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);void triggerSource(`ptr:${e.pointerId}`,note,i)}} onPointerUp={e=>{e.preventDefault();releaseSource(`ptr:${e.pointerId}`)}} onPointerCancel={e=>releaseSource(`ptr:${e.pointerId}`)}><i/><small>{partId==='drum808'?DRUM_SHORT[i%8]:`${NOTE_NAMES[note%12]}${Math.floor(note/12)-1}`}</small><kbd>{COMPUTER_KEYS[i]?.replace('Key','').replace('Digit','')??''}</kbd></button>)}</div>
    </section>
    <section className="fm1Status"><span><b>ALPHA DIAL</b> Turn K1 to select parameters; press K1 to switch PARAM ↔ VALUE. K2 can also select the focus explicitly.</span><span><b>TONE MODIFY</b> Turn K4 for the selected macro. Press K4 to cycle BRILLIANCE / MOD RATE / MOD DEPTH / ENV TIME.</span><span><b>PRESETS</b> K3 browses the modeled 128 P/M factory-bank positions plus original FMiniMug1 ALPHA patches.</span><span><b>CALM DEMOS</b> Default scenes now leave space for filter, envelope, chorus and Alpha-Dial changes instead of filling every 16th note.</span></section>
    {message&&<div className={audioState==='error'?'fm1Message error':'fm1Message'}>{message}{audioState==='error'&&<button onClick={()=>void ensureAudio()}>RETRY AUDIO</button>}</div>}
  </main>;
}

function HardwareKnob({label,value,normalized,onDelta,onPress,disabled=false,alphaDial=false,active=false}:{label:string;value:string;normalized:number;onDelta:(delta:number)=>void|Promise<void>;onPress?:()=>void;disabled?:boolean;alphaDial?:boolean;active?:boolean}){
  const drag=useRef<{y:number;carry:number;moved:boolean}|null>(null),angle=-135+clamp(normalized,0,1)*270,style={'--knob-angle':`${angle}deg`} as CSSProperties;
  const move=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!drag.current||disabled)return;const dy=drag.current.y-e.clientY;drag.current.y=e.clientY;drag.current.carry+=dy;while(Math.abs(drag.current.carry)>=5){const dir=drag.current.carry>0?1:-1;drag.current.carry-=dir*5;drag.current.moved=true;void onDelta(dir)}};
  return <div className={`hardwareKnob ${disabled?'disabled':''} ${alphaDial?'alphaDialKnob':''} ${active?'focused':''}`}><label>{label}</label><button disabled={disabled} style={style} title={disabled?'Unavailable':'Drag/wheel = turn; click = encoder press'} onPointerDown={e=>{if(disabled||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,carry:0,moved:false}}} onPointerMove={move} onPointerUp={e=>{if(!drag.current)return;const moved=drag.current.moved;try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}drag.current=null;if(!moved){if(onPress)onPress();else void onDelta(e.shiftKey?-1:1)}}} onPointerCancel={()=>{drag.current=null}} onWheel={e=>{if(disabled)return;e.preventDefault();void onDelta(e.deltaY<0?1:-1)}}><span/></button><small>{value}</small></div>;
}
