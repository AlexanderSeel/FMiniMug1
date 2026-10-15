import type {Patch, Sequence} from '../data';
import {engine} from './engine';

export type StudioCharacter='Clean'|'Classic'|'Aged'|'Hot'|'Broken';
export type DrumStepLike={kick?:number;snare?:number;hat?:number;openHat?:number;clap?:number;tom?:number;perc?:number};
export type DrumPatternLike={name:string;bpm:number;swing:number;steps:DrumStepLike[]};
export type SceneFxLike={delay:string;reverb:string;character:StudioCharacter};
export type StudioMix={layer:number;drums:number;delay:number;reverb:number;character:StudioCharacter};

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const midiToHz=(n:number)=>440*Math.pow(2,(n-69)/12);
const clonePatch=(p:Patch):Patch=>({...p,osc:[...p.osc] as Patch['osc'],detune:[...p.detune] as Patch['detune'],levels:[...p.levels] as Patch['levels']});

class AuxMiniVoice{
  private active:{osc:OscillatorNode;gain:GainNode}[]=[];
  private lastHz=110;
  constructor(private ctx:AudioContext,private destination:AudioNode){}
  stop(release=.12){
    const now=this.ctx.currentTime;
    for(const v of this.active){
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setTargetAtTime(.0001,now,Math.max(.008,release/4));
      window.setTimeout(()=>{try{v.osc.stop()}catch{}},Math.max(35,release*1100));
    }
    this.active=[];
  }
  noteOn(note:number,p:Patch){
    this.stop(Math.min(.08,p.release));
    const c=this.ctx,now=c.currentTime,target=midiToHz(note);
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.Q.value=p.res*20;
    filter.frequency.setValueAtTime(Math.max(70,p.cutoff*.65),now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80,Math.min(15000,p.cutoff+p.env)),now+p.attack+.008);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80,p.cutoff+p.env*p.sustain),now+p.attack+p.decay+.015);
    const drive=c.createWaveShaper();
    const curve=new Float32Array(512);
    for(let i=0;i<curve.length;i++){const x=i/255.5-1;curve[i]=Math.tanh(x*Math.max(1,p.drive))}
    drive.curve=curve;drive.oversample='2x';filter.connect(drive);drive.connect(this.destination);
    for(let i=0;i<3;i++){
      const osc=c.createOscillator(),gain=c.createGain();osc.type=p.osc[i];
      const drift=(Math.random()-.5)*p.drift*2.2;
      const end=target*Math.pow(2,(p.detune[i]+drift)/12),start=this.lastHz*Math.pow(2,(p.detune[i]+drift)/12);
      osc.frequency.setValueAtTime(Math.max(20,start),now);
      if(p.glide>.004)osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+p.glide);else osc.frequency.setValueAtTime(end,now);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]*.72),now+p.attack+.002);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,p.levels[i]*p.sustain*.72),now+p.attack+p.decay+.006);
      osc.connect(gain);gain.connect(filter);osc.start();this.active.push({osc,gain});
    }
    this.lastHz=target;
  }
}

export class StudioEngine{
  private ctx:AudioContext|null=null;
  private input:GainNode|null=null;
  private layerBus:GainNode|null=null;
  private drumBus:GainNode|null=null;
  private character:WaveShaperNode|null=null;
  private dry:GainNode|null=null;
  private delay:DelayNode|null=null;
  private delayFeedback:GainNode|null=null;
  private delayWet:GainNode|null=null;
  private reverb:ConvolverNode|null=null;
  private reverbWet:GainNode|null=null;
  private voiceB:AuxMiniVoice|null=null;
  private noise:AudioBuffer|null=null;
  private patchB:Patch|null=null;
  private drumPattern:DrumPatternLike|null=null;
  private drumTimer:number|undefined;
  private drumStep=0;
  private layerEnabled=true;
  private drumsEnabled=true;
  private mix:StudioMix={layer:.42,drums:.48,delay:.2,reverb:.14,character:'Classic'};
  private delayFeedbackAmount=.42;
  private delaySeconds=.24;
  private reverbSeconds=2.4;
  private kickTune=46;
  private snareTone=185;
  private hatTone=6200;

  async start(){
    await engine.start();
    if(this.ctx||!engine.ctx||!engine.analyser)return;
    const c=engine.ctx;this.ctx=c;
    this.input=c.createGain();this.layerBus=c.createGain();this.drumBus=c.createGain();this.character=c.createWaveShaper();
    this.dry=c.createGain();this.delay=c.createDelay(2);this.delayFeedback=c.createGain();this.delayWet=c.createGain();this.reverb=c.createConvolver();this.reverbWet=c.createGain();
    this.layerBus.connect(this.input);this.drumBus.connect(this.input);this.input.connect(this.character);
    this.character.connect(this.dry);this.dry.connect(engine.analyser);
    this.character.connect(this.delay);this.delay.connect(this.delayWet);this.delayWet.connect(engine.analyser);
    this.delay.connect(this.delayFeedback);this.delayFeedback.connect(this.delay);
    this.character.connect(this.reverb);this.reverb.connect(this.reverbWet);this.reverbWet.connect(engine.analyser);
    this.reverb.buffer=this.makeImpulse(this.reverbSeconds,.78);
    this.voiceB=new AuxMiniVoice(c,this.layerBus);
    this.applyMix();
  }

  configure(patchB:Patch,drums:DrumPatternLike,fx:SceneFxLike):StudioMix{
    this.patchB=clonePatch(patchB);this.drumPattern=drums;
    const d=fx.delay.toLowerCase(),r=fx.reverb.toLowerCase();
    const delayWet=d==='off'?0:d.includes('dub')?.34:0;
    const resolvedDelay=d==='off'?0:(d.includes('dub')?.34:0);
    void delayWet;void resolvedDelay;
    const delayValue=d==='off'?0:(d.includes('dub') ? .34 : d.includes('ping') ? .30 : d.includes('multi') ? .28 : d.includes('bbd') ? .25 : .22);
    const reverbValue=r==='off'?0:(r.includes('dark space') ? .36 : r.includes('hall') ? .30 : r.includes('plate') ? .24 : r.includes('spring') ? .20 : .16);
    this.mix={layer:this.mix.layer,drums:this.mix.drums,delay:delayValue,reverb:reverbValue,character:fx.character};
    this.delaySeconds=60/(drums.bpm||120)*(d.includes('slap') ? .25 : d.includes('1/4') ? .75 : .375);
    this.delayFeedbackAmount=d.includes('dub') ? .62 : d.includes('tape') ? .5 : .42;
    this.reverbSeconds=r.includes('dark space')?4.4:r.includes('hall')?3.2:r.includes('plate')?2.4:r.includes('spring')?1.6:2.0;
    if(this.reverb&&this.ctx)this.reverb.buffer=this.makeImpulse(this.reverbSeconds,.78);
    this.applyMix();return {...this.mix};
  }

  setLayerPatch(p:Patch){this.patchB=clonePatch(p)}
  getLayerPatch(){return this.patchB?clonePatch(this.patchB):null}
  setDrumPattern(p:DrumPatternLike){this.drumPattern=p;this.applyMix()}
  setLayerEnabled(on:boolean){this.layerEnabled=on;if(!on)this.voiceB?.stop()}
  setDrumsEnabled(on:boolean){this.drumsEnabled=on;if(!on)this.stopDrums()}
  setLayerLevel(v:number){this.mix.layer=clamp(v);this.applyMix()}
  setDrumLevel(v:number){this.mix.drums=clamp(v);this.applyMix()}
  setDelayWet(v:number){this.mix.delay=clamp(v);this.applyMix()}
  setReverbWet(v:number){this.mix.reverb=clamp(v);this.applyMix()}
  setDelayFeedback(v:number){this.delayFeedbackAmount=clamp(v,0,.78);this.applyMix()}
  setDelaySeconds(v:number){this.delaySeconds=clamp(v,.04,1.2);this.applyMix()}
  setReverbSeconds(v:number){this.reverbSeconds=clamp(v,.35,6);if(this.reverb&&this.ctx)this.reverb.buffer=this.makeImpulse(this.reverbSeconds,.78)}
  setKickTune(v:number){this.kickTune=clamp(v,30,90)}
  setSnareTone(v:number){this.snareTone=clamp(v,90,420)}
  setHatTone(v:number){this.hatTone=clamp(v,2500,12000)}
  setCharacter(v:StudioCharacter){this.mix.character=v;this.applyMix()}
  getMix(){return {...this.mix}}

  async noteOn(note:number,patchA:Patch){await engine.noteOn(note,patchA);await this.start();if(this.layerEnabled&&this.patchB)this.voiceB?.noteOn(note,this.patchB)}
  noteOff(note?:number,patchA?:Patch){engine.noteOff(note,patchA);if(this.layerEnabled)this.voiceB?.stop(this.patchB?.release??.12)}
  async startSequence(seq:Sequence){await this.start();await engine.startSequence(seq);if(this.drumsEnabled)this.startDrums()}
  stopSequence(){engine.stopSequence();this.stopDrums()}

  private applyMix(){
    if(this.layerBus)this.layerBus.gain.value=this.mix.layer;
    if(this.drumBus)this.drumBus.gain.value=this.mix.drums;
    if(this.dry)this.dry.gain.value=.88;
    if(this.delayWet)this.delayWet.gain.value=this.mix.delay;
    if(this.reverbWet)this.reverbWet.gain.value=this.mix.reverb;
    if(this.delay)this.delay.delayTime.value=this.delaySeconds;
    if(this.delayFeedback)this.delayFeedback.gain.value=this.delayFeedbackAmount;
    if(this.character){
      const k={Clean:.72,Classic:1.25,Aged:1.7,Hot:2.7,Broken:4.2}[this.mix.character];
      const curve=new Float32Array(1024),norm=Math.tanh(k);
      for(let i=0;i<curve.length;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*k)/norm}
      this.character.curve=curve;this.character.oversample='2x';
    }
  }
  private makeImpulse(seconds:number,decay:number){const c=this.ctx!,rate=c.sampleRate,len=Math.floor(rate*seconds),buf=c.createBuffer(2,len,rate);for(let ch=0;ch<2;ch++){const data=buf.getChannelData(ch);for(let i=0;i<len;i++){const t=i/len;data[i]=(Math.random()*2-1)*Math.pow(1-t,2+decay*5)}}return buf}
  private noiseBuffer(){if(this.noise)return this.noise;const c=this.ctx!,len=Math.floor(c.sampleRate*.5),b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=b;return b}
  private gainEnvelope(g:GainNode,velocity:number,decay:number,when:number,peak=1){const v=clamp(velocity/127);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.001,v*peak),when+.002);g.gain.exponentialRampToValueAtTime(.0001,when+decay)}
  private triggerNoise(velocity:number,when:number,hp:number,decay:number,peak=.55){const c=this.ctx!,src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=this.noiseBuffer();filter.type='highpass';filter.frequency.value=hp;this.gainEnvelope(g,velocity,decay,when,peak);src.connect(filter);filter.connect(g);g.connect(this.drumBus!);src.start(when);src.stop(when+decay+.03)}
  private triggerDrumStep(step:DrumStepLike,when:number){
    if(!this.ctx||!this.drumBus)return;const c=this.ctx;
    if(step.kick){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(this.kickTune*3.1,when);o.frequency.exponentialRampToValueAtTime(this.kickTune,when+.11);this.gainEnvelope(g,step.kick,.24,when,.95);o.connect(g);g.connect(this.drumBus);o.start(when);o.stop(when+.28)}
    if(step.snare){this.triggerNoise(step.snare,when,1100,.16,.68);const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=this.snareTone;this.gainEnvelope(g,step.snare,.09,when,.28);o.connect(g);g.connect(this.drumBus);o.start(when);o.stop(when+.11)}
    if(step.hat)this.triggerNoise(step.hat,when,this.hatTone,.055,.42);
    if(step.openHat)this.triggerNoise(step.openHat,when,Math.max(2000,this.hatTone*.88),.22,.38);
    if(step.clap){for(const off of [0,.018,.038])this.triggerNoise(step.clap,when+off,1500,.12,.26)}
    if(step.tom){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(175,when);o.frequency.exponentialRampToValueAtTime(92,when+.16);this.gainEnvelope(g,step.tom,.24,when,.58);o.connect(g);g.connect(this.drumBus);o.start(when);o.stop(when+.27)}
    if(step.perc){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(520,when);o.frequency.exponentialRampToValueAtTime(250,when+.07);this.gainEnvelope(g,step.perc,.09,when,.24);o.connect(g);g.connect(this.drumBus);o.start(when);o.stop(when+.11)}
  }
  private startDrums(){this.stopDrums();if(!this.ctx||!this.drumPattern||!this.drumPattern.steps.length)return;this.drumStep=0;const tick=()=>{if(!this.ctx||!this.drumPattern||!this.drumsEnabled)return;const p=this.drumPattern,i=this.drumStep%p.steps.length;this.triggerDrumStep(p.steps[i],this.ctx.currentTime+.006);this.drumStep++;const base=60000/p.bpm/4,swing=clamp(p.swing/100,0,.45),ms=base*((i&1)?1+swing:1-swing);this.drumTimer=window.setTimeout(tick,ms)};tick()}
  private stopDrums(){if(this.drumTimer!==undefined){clearTimeout(this.drumTimer);this.drumTimer=undefined}}
}

export const studio=new StudioEngine();
