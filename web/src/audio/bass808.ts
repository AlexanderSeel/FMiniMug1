export const BASS808_PARAM={wave:0,tune:1,sub:2,drive:3,cutoff:4,resonance:5,envMod:6,decay:7,slide:8,accent:9,accentDecay:10} as const;
export type Bass808ParamId=(typeof BASS808_PARAM)[keyof typeof BASS808_PARAM];
export type Bass808Step={note:number;accent?:boolean;slide?:boolean;gate?:number};
export type Bass808Pattern={name:string;bpm:number;swing:number;steps:Bass808Step[]};
export type Bass808Patch={name:string;values:Record<number,number>};

const assetUrl=(path:string)=>new URL(`${import.meta.env.BASE_URL}${path}`,document.baseURI).toString();

async function loadWasmBytes(url:string){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`808 BASS DSP ${response.status} ${response.statusText} at ${url}`);
  const bytes=await response.arrayBuffer();
  const m=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
  if(m.length!==4||m[0]!==0||m[1]!==0x61||m[2]!==0x73||m[3]!==0x6d)throw new Error('808 BASS DSP asset is not WebAssembly');
  return bytes;
}

export type Bass808Meter={peak:number;rms:number};

export class Bass808Engine{
  ctx:AudioContext|null=null;
  private node:AudioWorkletNode|null=null;
  private master:GainNode|null=null;
  private starting:Promise<void>|null=null;
  private listeners=new Set<(m:Bass808Meter)=>void>();
  private patternTimer:number|undefined;
  private gateTimer:number|undefined;
  private playing=false;
  private step=0;

  onMeter(cb:(m:Bass808Meter)=>void){this.listeners.add(cb);return()=>this.listeners.delete(cb)}

  async start(){if(this.starting)return this.starting;this.starting=this.startInternal();return this.starting}

  private async startInternal(){
    if(!this.ctx){
      const ctx=new AudioContext({latencyHint:'interactive'});this.ctx=ctx;
      const wasmUrl=assetUrl('dsp/fminimug1.wasm');
      const workletUrl=assetUrl('dsp/fminimug1-worklet.js');
      const [bytes]=await Promise.all([loadWasmBytes(wasmUrl),ctx.audioWorklet.addModule(workletUrl)]);
      this.master=ctx.createGain();this.master.gain.value=.55;this.master.connect(ctx.destination);
      const node=new AudioWorkletNode(ctx,'fminimug1-dsp',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasmBytes:bytes,mode:'bass808'}});
      node.connect(this.master);
      node.port.onmessage=e=>{
        if(e.data?.type==='meter'&&e.data?.mode==='bass808')for(const cb of this.listeners)cb({peak:e.data.peak,rms:e.data.rms});
        if(e.data?.type==='error')console.warn('FMiniMug1 808 BASS worklet:',e.data.message);
      };
      this.node=node;
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }

  setLevel(value:number){if(this.master)this.master.gain.value=Math.max(0,Math.min(1,value))}
  setParam(id:Bass808ParamId,value:number){this.node?.port.postMessage({type:'param',id,value})}
  setParams(values:[Bass808ParamId,number][]){this.node?.port.postMessage({type:'params',values})}
  async applyPatch(patch:Bass808Patch){await this.start();this.setParams(Object.entries(patch.values).map(([id,value])=>[+id as Bass808ParamId,value]))}
  async noteOn(note:number,{accent=false,slide=false}:{accent?:boolean;slide?:boolean}={}){await this.start();this.node?.port.postMessage({type:'noteOn',note,accent,slide})}
  noteOff(){this.node?.port.postMessage({type:'noteOff'})}
  reset(){this.node?.port.postMessage({type:'reset'})}

  async playPattern(pattern:Bass808Pattern,onStep?:(step:number)=>void){
    await this.start();this.stopPattern();this.playing=true;this.step=0;
    const tick=()=>{
      if(!this.playing)return;
      const index=this.step%pattern.steps.length;const current=pattern.steps[index];const next=pattern.steps[(index+1)%pattern.steps.length];
      const base=60000/pattern.bpm/4;const swing=Math.max(0,Math.min(75,pattern.swing))/200;const duration=base*(index%2===0?1+swing:1-swing);
      if(this.gateTimer!==undefined){clearTimeout(this.gateTimer);this.gateTimer=undefined}
      if(current.note<0)this.noteOff();
      else void this.noteOn(current.note,{accent:!!current.accent,slide:!!current.slide});
      if(current.note>=0&&!next.slide){const gate=Math.max(.05,Math.min(1,current.gate??.72));this.gateTimer=window.setTimeout(()=>this.noteOff(),duration*gate)}
      onStep?.(index);this.step++;this.patternTimer=window.setTimeout(tick,duration);
    };
    tick();
  }
  stopPattern(){this.playing=false;if(this.patternTimer!==undefined){clearTimeout(this.patternTimer);this.patternTimer=undefined}if(this.gateTimer!==undefined){clearTimeout(this.gateTimer);this.gateTimer=undefined}this.noteOff()}
}

export const bass808=new Bass808Engine();
