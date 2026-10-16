export const DRUM808_VOICES=['BD','SD','CH','OH','CLAP','TOM','COWBELL','RIM'] as const;
export type Drum808Voice=typeof DRUM808_VOICES[number];
export type Drum808VoiceId=0|1|2|3|4|5|6|7;
export const DRUM808_VOICE_PARAM={level:0,tune:1,decay:2,tone:3} as const;
export const DRUM808_GLOBAL_PARAM={accent:0,drive:1} as const;

const assetUrl=(path:string)=>new URL(`${import.meta.env.BASE_URL}${path}`,document.baseURI).toString();
async function loadWasmBytes(url:string){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`808 DRUM DSP ${response.status} ${response.statusText} at ${url}`);
  const bytes=await response.arrayBuffer();
  const m=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
  if(m.length!==4||m[0]!==0||m[1]!==0x61||m[2]!==0x73||m[3]!==0x6d)throw new Error('808 DRUM DSP asset is not WebAssembly');
  return bytes;
}

export type Drum808Step={hits:number;accent:number};
export type Drum808Pattern={name:string;bpm:number;swing:number;steps:Drum808Step[]};
export type Drum808Meter={peak:number;rms:number};

export class Drum808Engine{
  ctx:AudioContext|null=null;
  private node:AudioWorkletNode|null=null;
  private master:GainNode|null=null;
  private starting:Promise<void>|null=null;
  private listeners=new Set<(m:Drum808Meter)=>void>();
  private timer:number|undefined;
  private step=0;
  private playing=false;

  onMeter(cb:(m:Drum808Meter)=>void){this.listeners.add(cb);return()=>this.listeners.delete(cb)}

  async start(){
    if(this.starting)return this.starting;
    this.starting=this.startInternal();
    return this.starting;
  }

  private async startInternal(){
    if(!this.ctx){
      const ctx=new AudioContext({latencyHint:'interactive'});this.ctx=ctx;
      const wasmUrl=assetUrl('dsp/fminimug1.wasm');
      const workletUrl=assetUrl('dsp/fminimug1-worklet.js');
      const [bytes]=await Promise.all([loadWasmBytes(wasmUrl),ctx.audioWorklet.addModule(workletUrl)]);
      this.master=ctx.createGain();this.master.gain.value=.58;this.master.connect(ctx.destination);
      const node=new AudioWorkletNode(ctx,'fminimug1-dsp',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasmBytes:bytes,mode:'drum808'}});
      node.connect(this.master);
      node.port.onmessage=e=>{
        if(e.data?.type==='meter'&&e.data?.mode==='drum808')for(const cb of this.listeners)cb({peak:e.data.peak,rms:e.data.rms});
        if(e.data?.type==='error')console.warn('FMiniMug1 808 DRUM worklet:',e.data.message);
      };
      this.node=node;
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }

  setLevel(value:number){if(this.master)this.master.gain.value=Math.max(0,Math.min(1,value))}
  setVoiceParam(voice:Drum808VoiceId,param:number,value:number){this.node?.port.postMessage({type:'voiceParam',voice,param,value})}
  setGlobalParam(param:number,value:number){this.node?.port.postMessage({type:'globalParam',param,value})}
  async trigger(voice:Drum808VoiceId,{velocity=112,accent=false}:{velocity?:number;accent?:boolean}={}){
    await this.start();
    this.node?.port.postMessage({type:'trigger',voice,velocity,accent});
  }
  reset(){this.node?.port.postMessage({type:'reset'})}

  async playPattern(pattern:Drum808Pattern,onStep?:(step:number)=>void){
    await this.start();this.stopPattern();this.playing=true;this.step=0;
    const tick=()=>{
      if(!this.playing)return;
      const index=this.step%pattern.steps.length;
      const current=pattern.steps[index];
      for(let voice=0;voice<8;voice++)if(current.hits&(1<<voice))this.node?.port.postMessage({type:'trigger',voice,velocity:112,accent:!!(current.accent&(1<<voice))});
      onStep?.(index);
      this.step++;
      const base=60000/pattern.bpm/4;
      const swing=Math.max(0,Math.min(75,pattern.swing))/200;
      const delay=base*(index%2===0?1+swing:1-swing);
      this.timer=window.setTimeout(tick,delay);
    };
    tick();
  }
  stopPattern(){this.playing=false;if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined}}
}

export const drum808=new Drum808Engine();
