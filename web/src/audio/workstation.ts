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
  private master:GainNode|null=null;
  private starting:Promise<void>|null=null;
  private listeners=new Set<(m:WorkstationMeter)=>void>();
  private errorListeners=new Set<(message:string)=>void>();

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
      const master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination);
      const node=new AudioWorkletNode(ctx,'fminimug1-dsp',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasmBytes:bytes,mode:'workstation'}});
      node.connect(master);
      node.port.onmessage=e=>{
        if(e.data?.type==='meter'&&e.data?.mode==='workstation')for(const cb of this.listeners)cb({peak:e.data.peak,rms:e.data.rms,step:e.data.step??0});
        if(e.data?.type==='error'){
          const message=String(e.data.message??'Unknown workstation worklet error');
          console.warn('FMiniMug1 workstation worklet:',message);
          this.emitError(message);
        }
      };
      this.ctx=ctx;this.master=master;this.node=node;
      if(ctx.state==='suspended')await ctx.resume();
    }catch(error){
      await ctx.close().catch(()=>undefined);
      throw error;
    }
  }

  private send(message:unknown){this.node?.port.postMessage(message)}
  setMaster(value:number){if(this.master)this.master.gain.value=Math.max(0,Math.min(1.2,value))}
  setPartLevel(part:0|1|2|3,value:number){this.send({type:'level',part,value})}
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
    this.send({type:'seqMeta',length:Math.max(1,Math.min(64,Math.round(length))),bpm:Math.max(40,Math.min(300,Math.round(bpm))),swing:Math.max(0,Math.min(75,Math.round(swing)))})
  }
  setBassStep(index:number,note:number,{accent=false,slide=false,velocity=108,gate=.72}:{accent?:boolean;slide?:boolean;velocity?:number;gate?:number}={}){
    this.send({type:'seqBassStep',index, note, flags:(accent?1:0)|(slide?2:0), velocity, gate:Math.round(Math.max(.01,Math.min(1,gate))*100)})
  }
  setDrumStep(index:number,hits:number,accents:number){this.send({type:'seqDrumStep',index,hits,accents})}

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
  play(){this.send({type:'seqStart'})}
  stop(){this.send({type:'seqStop'})}
  reset(){this.send({type:'reset'})}
}

export const workstation=new WorkstationEngine();
