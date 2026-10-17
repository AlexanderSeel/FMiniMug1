import type {Bass808Patch,Bass808Pattern} from './bass808';
import type {Drum808Pattern,Drum808VoiceId} from './drum808';
import type {AlphaPatch,AlphaParamId} from './alpha';
import type {Bass808ParamId} from './bass808';

const assetUrl=(path:string)=>new URL(`${import.meta.env.BASE_URL}${path}`,document.baseURI).toString();
async function loadWasmBytes(url:string){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`WORKSTATION DSP ${response.status} ${response.statusText} at ${url}`);
  const bytes=await response.arrayBuffer();
  const m=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
  if(m.length!==4||m[0]!==0||m[1]!==0x61||m[2]!==0x73||m[3]!==0x6d)throw new Error(`WORKSTATION DSP asset is not WebAssembly: ${url}`);
  return bytes;
}

export type WorkstationMeter={peak:number;rms:number;step:number};
export type WorkstationMiniStep={note:number;velocity:number;gate:number};
export type WorkstationAlphaStep={notes:[number,number,number,number];velocity:number;gate:number};
export type WorkstationFxParam=0|1|2;
export const WORKSTATION_RUNTIME_FIELD={scene:0,playing:1,master:2,partLevel:3,fx:4,clockLength:5,clockBpm:6,clockSwing:7,alphaParam:8,alphaFocus:9,alphaModify:10,alphaModifyAmount:11} as const;
export type WorkstationScene={
  name:string;
  bpm:number;
  swing:number;
  bassPatch:Bass808Patch;
  bassPattern:Bass808Pattern;
  drumPattern:Drum808Pattern;
  alphaPatch:AlphaPatch;
};

export class WorkstationEngine{
  ctx:AudioContext|null=null;
  private node:AudioWorkletNode|null=null;
  private output:GainNode|null=null;
  private starting:Promise<void>|null=null;
  private listeners=new Set<(m:WorkstationMeter)=>void>();
  private errorListeners=new Set<(message:string)=>void>();
  private runtimeRequestId=0;
  private runtimeRequests=new Map<number,{resolve:(value:number)=>void;reject:(error:Error)=>void}>();

  onMeter(cb:(m:WorkstationMeter)=>void){this.listeners.add(cb);return()=>{this.listeners.delete(cb)}}
  onError(cb:(message:string)=>void){this.errorListeners.add(cb);return()=>{this.errorListeners.delete(cb)}}
  private emitError(message:string){for(const cb of this.errorListeners)cb(message)}

  async start(){
    if(this.ctx&&this.node){if(this.ctx.state==='suspended')await this.ctx.resume();return}
    if(this.starting)return this.starting;
    this.starting=this.startInternal().catch(error=>{
      this.starting=null;
      const message=error instanceof Error?error.message:String(error);
      this.emitError(message);
      throw error;
    });
    await this.starting;
  }

  private async startInternal(){
    const ctx=new AudioContext({latencyHint:'interactive'});
    try{
      const [bytes]=await Promise.all([
        loadWasmBytes(assetUrl('dsp/fminimug1.wasm')),
        ctx.audioWorklet.addModule(assetUrl('dsp/fminimug1-worklet.js'))
      ]);
      const output=ctx.createGain();output.gain.value=1;output.connect(ctx.destination);
      const node=new AudioWorkletNode(ctx,'fminimug1-dsp',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasmBytes:bytes,mode:'workstation'}});
      node.connect(output);
      node.port.onmessage=e=>{
        if(e.data?.type==='meter'&&e.data?.mode==='workstation')for(const cb of this.listeners)cb({peak:e.data.peak,rms:e.data.rms,step:e.data.step??0});
        if(e.data?.type==='runtimeValue'&&Number.isInteger(e.data.requestId)){
          const pending=this.runtimeRequests.get(e.data.requestId);
          if(pending){this.runtimeRequests.delete(e.data.requestId);pending.resolve(Number(e.data.value))}
        }
        if(e.data?.type==='error'){
          const message=String(e.data.message??'Unknown workstation worklet error');
          console.warn('FMiniMug1 workstation worklet:',message);
          this.emitError(message);
        }
      };
      this.ctx=ctx;this.output=output;this.node=node;
      if(ctx.state==='suspended')await ctx.resume();
    }catch(error){
      await ctx.close().catch(()=>undefined);
      throw error;
    }
  }

  private send(message:unknown){this.node?.port.postMessage(message)}
  setRuntimeValue(field:number,index:number,value:number){this.send({type:'runtimeSet',field,index,value})}
  getRuntimeValue(field:number,index=0):Promise<number>{
    if(!this.node)return Promise.reject(new Error('Workstation audio is not started'));
    const requestId=++this.runtimeRequestId;
    return new Promise((resolve,reject)=>{
      this.runtimeRequests.set(requestId,{resolve,reject});
      this.send({type:'runtimeGet',requestId,field,index});
      setTimeout(()=>{const pending=this.runtimeRequests.get(requestId);if(pending){this.runtimeRequests.delete(requestId);pending.reject(new Error('Workstation runtime readback timed out'))}},1000);
    });
  }
  setMaster(value:number){this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.master,0,Math.max(0,Math.min(1.2,value)))}
  setPartLevel(part:0|1|2|3,value:number){this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.partLevel,part,value)}
  setFxParam(param:WorkstationFxParam,value:number){this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.fx,param,value)}
  setSceneIndex(scene:number){this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.scene,0,Math.max(0,Math.min(255,Math.round(scene))))}
  setMiniParam(id:number,value:number){this.send({type:'miniParam',id,value})}
  miniNoteOn(note:number,velocity=110){this.send({type:'miniNoteOn',note,velocity})}
  miniNoteOff(note:number){this.send({type:'miniNoteOff',note})}
  setBassParam(id:Bass808ParamId,value:number){this.send({type:'bassParam',id,value})}
  bassNoteOn(note:number,{accent=false,slide=false}:{accent?:boolean;slide?:boolean}={}){this.send({type:'bassNoteOn',note,accent,slide})}
  bassNoteOff(){this.send({type:'bassNoteOff'})}
  setDrumVoiceParam(voice:Drum808VoiceId,param:number,value:number){this.send({type:'drumVoiceParam',voice,param,value})}
  setDrumGlobalParam(param:number,value:number){this.send({type:'drumGlobalParam',param,value})}
  triggerDrum(voice:Drum808VoiceId,velocity=110,accent=false){this.send({type:'drumTrigger',voice,velocity,accent})}
  setAlphaParam(id:AlphaParamId,value:number){this.send({type:'alphaParam',id,value})}
  alphaNoteOn(note:number,velocity=110){this.send({type:'alphaNoteOn',note,velocity})}
  alphaNoteOff(note:number){this.send({type:'alphaNoteOff',note})}

  setSequenceMeta(length:number,bpm:number,swing:number){
    this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.clockLength,0,Math.max(1,Math.min(64,Math.round(length))));
    this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.clockBpm,0,Math.max(40,Math.min(300,Math.round(bpm))));
    this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.clockSwing,0,Math.max(0,Math.min(75,Math.round(swing))));
  }
  setMiniStep(index:number,note:number,{velocity=100,gate=.9}:{velocity?:number;gate?:number}={}){
    this.send({type:'seqMiniStep',index,note,velocity:Math.max(1,Math.min(127,Math.round(velocity))),gate:Math.round(Math.max(.01,Math.min(4,gate))*100)})
  }
  setBassStep(index:number,note:number,{accent=false,slide=false,velocity=108,gate=.72}:{accent?:boolean;slide?:boolean;velocity?:number;gate?:number}={}){
    this.send({type:'seqBassStep',index,note,flags:(accent?1:0)|(slide?2:0),velocity,gate:Math.round(Math.max(.01,Math.min(1,gate))*100)})
  }
  setDrumStep(index:number,hits:number,accents:number){this.send({type:'seqDrumStep',index,hits,accents})}
  setAlphaStep(index:number,notes:readonly number[],{velocity=92,gate=.9}:{velocity?:number;gate?:number}={}){
    const normalized=[0,1,2,3].map(i=>Math.max(-1,Math.min(127,Math.round(notes[i]??-1))));
    this.send({type:'seqAlphaStep',index,notes:normalized,velocity:Math.max(1,Math.min(127,Math.round(velocity))),gate:Math.round(Math.max(.01,Math.min(4,gate))*100)})
  }

  async loadScene(scene:WorkstationScene){
    await this.start();
    for(const [id,value] of Object.entries(scene.bassPatch.values))this.setBassParam(+id as Bass808ParamId,value);
    for(const [id,value] of Object.entries(scene.alphaPatch.values))this.setAlphaParam(+id as AlphaParamId,value);
    const length=Math.max(scene.bassPattern.steps.length,scene.drumPattern.steps.length);
    this.setSequenceMeta(length,scene.bpm,scene.swing);
    for(let i=0;i<length;i++){
      const b=scene.bassPattern.steps[i%scene.bassPattern.steps.length];
      this.setBassStep(i,b.note,{accent:!!b.accent,slide:!!b.slide,velocity:108,gate:b.gate??.72});
      const d=scene.drumPattern.steps[i%scene.drumPattern.steps.length];
      this.setDrumStep(i,d.hits,d.accent);
    }
  }
  play(){this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.playing,0,1)}
  stop(){this.setRuntimeValue(WORKSTATION_RUNTIME_FIELD.playing,0,0)}
  reset(){this.send({type:'reset'})}
}

export const workstation=new WorkstationEngine();
