import {PATCHES, type Patch, type Sequence, type Wave} from '../data';
import {PARAM} from '../generated/params';

const midiToHz=(n:number)=>440*Math.pow(2,(n-69)/12);
const waveNumber=(w:Wave)=>w==='triangle'?0:w==='sawtooth'?1:2;
const rangeSemitones=(r:number)=>[-24,-12,0,12,24][Math.max(0,Math.min(4,Math.round(r)))];

class WebAudioFallback {
  ctx:AudioContext;
  destination:AudioNode;
  active:{o:OscillatorNode,g:GainNode}[]=[];
  lastHz=110;

  constructor(ctx:AudioContext,destination:AudioNode){this.ctx=ctx;this.destination=destination}

  stop(p:Patch,ampDecaySwitch=false){
    const now=this.ctx.currentTime;
    const release=ampDecaySwitch?p.decay:p.release;
    this.active.forEach(x=>{
      x.g.gain.cancelScheduledValues(now);
      x.g.gain.setTargetAtTime(.0001,now,Math.max(.01,release/4));
      setTimeout(()=>{try{x.o.stop()}catch{}},Math.max(40,release*1200));
    });
    this.active=[];
  }

  noteOn(note:number,p:Patch,ranges:[number,number,number],filterContour:[number,number,number,number],glideMode:number){
    this.stop(p);
    const c=this.ctx,now=c.currentTime;
    const f=c.createBiquadFilter();
    const [fa,fd,fs]=filterContour;
    f.type='lowpass';f.Q.value=p.res*22;
    f.frequency.setValueAtTime(Math.max(80,p.cutoff*.55),now);
    f.frequency.exponentialRampToValueAtTime(Math.min(15000,p.cutoff+p.env),now+fa+.01);
    f.frequency.exponentialRampToValueAtTime(Math.max(80,p.cutoff+p.env*fs),now+fa+fd+.02);
    const sh=c.createWaveShaper();
    const curve=new Float32Array(1024);
    for(let i=0;i<curve.length;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*p.drive)}
    sh.curve=curve;sh.oversample='2x';f.connect(sh);sh.connect(this.destination);
    const target=midiToHz(note);
    for(let i=0;i<3;i++){
      const o=c.createOscillator(),g=c.createGain();o.type=p.osc[i];
      const drift=(Math.random()-.5)*p.drift*3;
      const semis=p.detune[i]+rangeSemitones(ranges[i])+drift;
      const start=this.lastHz*Math.pow(2,semis/12);
      const end=target*Math.pow(2,semis/12);
      o.frequency.setValueAtTime(start,now);
      if(p.glide<=.003)o.frequency.setValueAtTime(end,now);
      else if(glideMode===1){
        const octaves=Math.max(.001,Math.abs(Math.log2(end/start)));
        o.frequency.exponentialRampToValueAtTime(end,now+p.glide*octaves);
      }else o.frequency.exponentialRampToValueAtTime(end,now+p.glide);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]),now+p.attack+.002);
      g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]*p.sustain),now+p.attack+p.decay+.004);
      o.connect(g);g.connect(f);o.start();this.active.push({o,g});
    }
    this.lastHz=target;
  }
}

export type EngineMode='idle'|'native-wasm'|'web-audio-fallback';
export type Meter={peak:number;rms:number;step?:number};

export class MiniEngine {
  ctx:AudioContext|null=null;
  patch:Patch=PATCHES[0];
  mode:EngineMode='idle';
  analyser:AnalyserNode|null=null;
  ranges:[number,number,number]=[2,2,2];
  filterContour:[number,number,number,number]=[this.patch.attack,this.patch.decay,this.patch.sustain,this.patch.release];
  retrigger=false;
  notePriority=0;
  ampDecaySwitch=false;
  filterDecaySwitch=false;
  glideMode=0;
  private node:AudioWorkletNode|null=null;
  private master:GainNode|null=null;
  private fallback:WebAudioFallback|null=null;
  private starting:Promise<void>|null=null;
  private modeListeners=new Set<(m:EngineMode)=>void>();
  private meterListeners=new Set<(m:Meter)=>void>();
  private fallbackTimer:number|undefined;
  private fallbackGateTimer:number|undefined;
  private fallbackStep=0;
  private heldFallback=new Set<number>();
  private heldOrder=new Map<number,number>();
  private heldSerial=0;

  onMode(cb:(m:EngineMode)=>void){this.modeListeners.add(cb);cb(this.mode);return()=>this.modeListeners.delete(cb)}
  onMeter(cb:(m:Meter)=>void){this.meterListeners.add(cb);return()=>this.meterListeners.delete(cb)}
  private setMode(m:EngineMode){this.mode=m;for(const cb of this.modeListeners)cb(m)}
  private sendParam(id:number,value:number){if(this.node)this.node.port.postMessage({type:'param',id,value})}
  private selectFallbackNote(){
    const notes=[...this.heldFallback];
    if(!notes.length)return undefined;
    if(this.notePriority===0)return Math.min(...notes);
    if(this.notePriority===1)return Math.max(...notes);
    return notes.reduce((best,n)=>(this.heldOrder.get(n)??0)>(this.heldOrder.get(best)??0)?n:best,notes[0]);
  }

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
          if(e.data?.type==='meter')for(const cb of this.meterListeners)cb({peak:e.data.peak,rms:e.data.rms,step:e.data.step});
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
    [PARAM.keytrack,2],[PARAM.oversample,1],
    [PARAM.osc1Range,this.ranges[0]],[PARAM.osc2Range,this.ranges[1]],[PARAM.osc3Range,this.ranges[2]],
    [PARAM.filterAttack,this.filterContour[0]],[PARAM.filterDecay,this.filterContour[1]],[PARAM.filterSustain,this.filterContour[2]],[PARAM.filterRelease,this.filterContour[3]],
    [PARAM.retrigger,this.retrigger?1:0],[PARAM.notePriority,this.notePriority],
    [PARAM.ampDecaySwitch,this.ampDecaySwitch?1:0],[PARAM.filterDecaySwitch,this.filterDecaySwitch?1:0],[PARAM.glideMode,this.glideMode]
  ]}

  applyPatch(p:Patch){this.patch=p;if(this.node)this.node.port.postMessage({type:'params',values:this.patchValues(p)})}
  setOscRange(index:0|1|2,range:number){const n=Math.max(0,Math.min(4,Math.round(range)));this.ranges=[...this.ranges] as [number,number,number];this.ranges[index]=n;this.sendParam([PARAM.osc1Range,PARAM.osc2Range,PARAM.osc3Range][index],n)}
  setFilterContour(values:[number,number,number,number]){this.filterContour=values;this.sendParam(PARAM.filterAttack,values[0]);this.sendParam(PARAM.filterDecay,values[1]);this.sendParam(PARAM.filterSustain,values[2]);this.sendParam(PARAM.filterRelease,values[3])}
  setRetrigger(on:boolean){this.retrigger=on;this.sendParam(PARAM.retrigger,on?1:0)}
  setNotePriority(mode:number){this.notePriority=Math.max(0,Math.min(2,Math.round(mode)));this.sendParam(PARAM.notePriority,this.notePriority)}
  setAmpDecaySwitch(on:boolean){this.ampDecaySwitch=on;this.sendParam(PARAM.ampDecaySwitch,on?1:0)}
  setFilterDecaySwitch(on:boolean){this.filterDecaySwitch=on;this.sendParam(PARAM.filterDecaySwitch,on?1:0)}
  setGlideMode(mode:number){this.glideMode=mode>=.5?1:0;this.sendParam(PARAM.glideMode,this.glideMode)}
  async noteOn(note:number,p=this.patch){
    await this.start();this.applyPatch(p);
    this.heldFallback.add(note);this.heldOrder.set(note,++this.heldSerial);
    if(this.node)this.node.port.postMessage({type:'noteOn',note,velocity:112});
    else {const selected=this.selectFallbackNote();if(selected!==undefined)this.fallback?.noteOn(selected,p,this.ranges,this.filterContour,this.glideMode)}
  }
  noteOff(note?:number,p=this.patch){
    if(note===undefined){
      this.heldFallback.clear();this.heldOrder.clear();
      if(this.node)this.node.port.postMessage({type:'noteOff'});else this.fallback?.stop(p,this.ampDecaySwitch);
      return;
    }
    this.heldFallback.delete(note);this.heldOrder.delete(note);
    if(this.node)this.node.port.postMessage({type:'noteOff',note});
    else {const selected=this.selectFallbackNote();if(selected===undefined)this.fallback?.stop(p,this.ampDecaySwitch);else this.fallback?.noteOn(selected,p,this.ranges,this.filterContour,this.glideMode)}
  }

  async startSequence(seq:Sequence){
    await this.start();
    this.stopSequence();
    this.applyPatch(this.patch);
    if(this.node){
      this.node.port.postMessage({type:'sequence',bpm:seq.bpm,swing:0,notes:seq.notes,gates:seq.gates});
      this.node.port.postMessage({type:'seqStart'});
      return;
    }
    this.fallbackStep=0;
    const tick=()=>{
      const i=this.fallbackStep++%seq.notes.length;
      const note=seq.notes[i];
      this.fallback?.noteOn(note,this.patch,this.ranges,this.filterContour,this.glideMode);
      if(this.fallbackGateTimer!==undefined)clearTimeout(this.fallbackGateTimer);
      this.fallbackGateTimer=window.setTimeout(()=>this.fallback?.stop(this.patch,this.ampDecaySwitch),60000/seq.bpm*seq.gates[i]);
    };
    tick();
    this.fallbackTimer=window.setInterval(tick,60000/seq.bpm);
  }

  stopSequence(){
    if(this.node)this.node.port.postMessage({type:'seqStop'});
    if(this.fallbackTimer!==undefined){clearInterval(this.fallbackTimer);this.fallbackTimer=undefined}
    if(this.fallbackGateTimer!==undefined){clearTimeout(this.fallbackGateTimer);this.fallbackGateTimer=undefined}
    this.fallback?.stop(this.patch,this.ampDecaySwitch);
  }
}

export const engine=new MiniEngine();
