export const ALPHA_PARAM={
  saw:0,pulse:1,sub:2,noise:3,
  cutoff:4,resonance:5,env:6,keytrack:7,
  level:8,envMode:9,velocity:10,pan:11,
  attack:12,decay:13,sustain:14,release:15,
  lfoRate:16,lfoDelay:17,dcoMod:18,vcfMod:19,
  chorusMode:20,chorusRate:21,chorusDepth:22,chorusMix:23
} as const;
export type AlphaParamId=(typeof ALPHA_PARAM)[keyof typeof ALPHA_PARAM];
export type AlphaPatch={name:string;values:Record<AlphaParamId,number>};

const assetUrl=(path:string)=>new URL(`${import.meta.env.BASE_URL}${path}`,document.baseURI).toString();
async function loadWasmBytes(url:string){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`ALPHA DSP ${response.status} ${response.statusText} at ${url}`);
  const bytes=await response.arrayBuffer();
  const m=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
  if(m.length!==4||m[0]!==0||m[1]!==0x61||m[2]!==0x73||m[3]!==0x6d)throw new Error('ALPHA DSP asset is not WebAssembly');
  return bytes;
}

export class AlphaEngine{
  ctx:AudioContext|null=null;
  private node:AudioWorkletNode|null=null;
  private master:GainNode|null=null;
  private starting:Promise<void>|null=null;
  async start(){if(this.starting)return this.starting;this.starting=this.startInternal();return this.starting}
  private async startInternal(){
    if(!this.ctx){
      const ctx=new AudioContext({latencyHint:'interactive'});this.ctx=ctx;
      const [bytes]=await Promise.all([loadWasmBytes(assetUrl('dsp/fminimug1.wasm')),ctx.audioWorklet.addModule(assetUrl('dsp/fminimug1-worklet.js'))]);
      this.master=ctx.createGain();this.master.gain.value=.68;this.master.connect(ctx.destination);
      const node=new AudioWorkletNode(ctx,'fminimug1-dsp',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasmBytes:bytes,mode:'alpha'}});
      node.connect(this.master);node.port.onmessage=e=>{if(e.data?.type==='error')console.warn('FMiniMug1 ALPHA worklet:',e.data.message)};this.node=node;
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  setParam(id:AlphaParamId,value:number){this.node?.port.postMessage({type:'param',id,value})}
  setParams(values:[AlphaParamId,number][]){this.node?.port.postMessage({type:'params',values})}
  async applyPatch(patch:AlphaPatch){await this.start();this.setParams(Object.entries(patch.values).map(([id,value])=>[+id as AlphaParamId,value]))}
  async noteOn(note:number,velocity=110){await this.start();this.node?.port.postMessage({type:'noteOn',note,velocity})}
  noteOff(note:number){this.node?.port.postMessage({type:'noteOff',note})}
  allNotesOff(){this.node?.port.postMessage({type:'allNotesOff'})}
  reset(){this.node?.port.postMessage({type:'reset'})}
}
export const alpha=new AlphaEngine();
