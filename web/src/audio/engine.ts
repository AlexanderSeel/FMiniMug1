import {PATCHES, type Patch, type Wave} from '../data';
import {PARAM} from '../generated/params';

const midiToHz=(n:number)=>440*Math.pow(2,(n-69)/12);
const waveNumber=(w:Wave)=>w==='triangle'?0:w==='sawtooth'?1:2;

class WebAudioFallback {
  ctx:AudioContext;
  destination:AudioNode;
  active:{o:OscillatorNode,g:GainNode}[]=[];
  lastHz=110;

  constructor(ctx:AudioContext,destination:AudioNode){this.ctx=ctx;this.destination=destination}

  stop(p:Patch){
    const now=this.ctx.currentTime;
    this.active.forEach(x=>{
      x.g.gain.cancelScheduledValues(now);
      x.g.gain.setTargetAtTime(.0001,now,Math.max(.01,p.release/4));
      setTimeout(()=>{try{x.o.stop()}catch{}},Math.max(40,p.release*1200));
    });
    this.active=[];
  }

  noteOn(note:number,p:Patch){
    this.stop(p);
    const c=this.ctx,now=c.currentTime;
    const f=c.createBiquadFilter();
    f.type='lowpass';f.Q.value=p.res*22;
    f.frequency.setValueAtTime(Math.max(80,p.cutoff*.55),now);
    f.frequency.exponentialRampToValueAtTime(Math.min(15000,p.cutoff+p.env),now+p.attack+.01);
    f.frequency.exponentialRampToValueAtTime(Math.max(80,p.cutoff+p.env*p.sustain),now+p.attack+p.decay+.02);
    const sh=c.createWaveShaper();
    const curve=new Float32Array(1024);
    for(let i=0;i<curve.length;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*p.drive)}
    sh.curve=curve;sh.oversample='2x';f.connect(sh);sh.connect(this.destination);
    const target=midiToHz(note);
    for(let i=0;i<3;i++){
      const o=c.createOscillator(),g=c.createGain();o.type=p.osc[i];
      const drift=(Math.random()-.5)*p.drift*3;
      o.frequency.setValueAtTime(this.lastHz*Math.pow(2,(p.detune[i]+drift)/12),now);
      o.frequency.exponentialRampToValueAtTime(target*Math.pow(2,(p.detune[i]+drift)/12),now+Math.max(.003,p.glide));
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]),now+p.attack+.002);
      g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]*p.sustain),now+p.attack+p.decay+.004);
      o.connect(g);g.connect(f);o.start();this.active.push({o,g});
    }
    this.lastHz=target;
  }
}

export type EngineMode='idle'|'native-wasm'|'web-audio-fallback';
export type Meter={peak:number;rms:number};

export class MiniEngine {
  ctx:AudioContext|null=null;
  patch:Patch=PATCHES[0];
  mode:EngineMode='idle';
  analyser:AnalyserNode|null=null;
  private node:AudioWorkletNode|null=null;
  private master:GainNode|null=null;
  private fallback:WebAudioFallback|null=null;
  private starting:Promise<void>|null=null;
  private modeListeners=new Set<(m:EngineMode)=>void>();
  private meterListeners=new Set<(m:Meter)=>void>();

  onMode(cb:(m:EngineMode)=>void){this.modeListeners.add(cb);cb(this.mode);return()=>this.modeListeners.delete(cb)}
  onMeter(cb:(m:Meter)=>void){this.meterListeners.add(cb);return()=>this.meterListeners.delete(cb)}
  private setMode(m:EngineMode){this.mode=m;for(const cb of this.modeListeners)cb(m)}

  async start(){
    if(this.starting)return this.starting;
    this.starting=this.startInternal();
    return this.starting;
  }

  private async startInternal(){
    if(!this.ctx){
      this.ctx=new AudioContext({latencyHint:'interactive'});
      this.master=this.ctx.createGain();this.master.gain.value=.55;
      this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=.72;
      this.analyser.connect(this.master);this.master.connect(this.ctx.destination);
      try{
        if(!this.ctx.audioWorklet)throw new Error('AudioWorklet unavailable');
        const [bytes]=await Promise.all([
          fetch('/dsp/fminimug1.wasm').then(r=>{if(!r.ok)throw new Error(`DSP ${r.status}`);return r.arrayBuffer()}),
          this.ctx.audioWorklet.addModule('/dsp/fminimug1-worklet.js')
        ]);
        const node=new AudioWorkletNode(this.ctx,'fminimug1-dsp',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasmBytes:bytes}});
        node.connect(this.analyser);
        node.port.onmessage=e=>{
          if(e.data?.type==='meter')for(const cb of this.meterListeners)cb({peak:e.data.peak,rms:e.data.rms});
          if(e.data?.type==='error')console.warn('FMiniMug1 DSP worklet:',e.data.message);
        };
        this.node=node;this.applyPatch(this.patch);this.setMode('native-wasm');
      }catch(error){
        console.warn('FMiniMug1 native browser DSP unavailable; using Web Audio fallback',error);
        this.fallback=new WebAudioFallback(this.ctx,this.analyser);this.setMode('web-audio-fallback');
      }
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }

  private patchValues(p:Patch):[number,number][] {return [
    [PARAM.osc1Level,p.levels[0]],[PARAM.osc2Level,p.levels[1]],[PARAM.osc3Level,p.levels[2]],
    [PARAM.osc1Wave,waveNumber(p.osc[0])],[PARAM.osc2Wave,waveNumber(p.osc[1])],[PARAM.osc3Wave,waveNumber(p.osc[2])],
    [PARAM.osc1Semi,p.detune[0]],[PARAM.osc2Semi,p.detune[1]],[PARAM.osc3Semi,p.detune[2]],
    [PARAM.cutoff,p.cutoff],[PARAM.res,p.res],[PARAM.env,p.env],[PARAM.attack,p.attack],[PARAM.decay,p.decay],
    [PARAM.sustain,p.sustain],[PARAM.release,p.release],[PARAM.glide,p.glide],[PARAM.mixerDrive,p.drive],
    [PARAM.filterDrive,Math.max(.8,p.drive*.85)],[PARAM.drift,p.drift],[PARAM.feedback,Math.min(.48,p.res*.28)],
    [PARAM.keytrack,2],[PARAM.oversample,1]
  ]}

  applyPatch(p:Patch){this.patch=p;if(this.node)this.node.port.postMessage({type:'params',values:this.patchValues(p)})}
  async noteOn(note:number,p=this.patch){await this.start();this.applyPatch(p);if(this.node)this.node.port.postMessage({type:'noteOn',note,velocity:112});else this.fallback?.noteOn(note,p)}
  noteOff(p=this.patch){if(this.node)this.node.port.postMessage({type:'noteOff'});else this.fallback?.stop(p)}
}

export const engine=new MiniEngine();
