class FMiniMug1Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.exports = null;
    this.memory = null;
    this.meterCounter = 0;
    const requestedMode = options.processorOptions?.mode;
    this.mode = ['bass808','drum808','alpha','workstation'].includes(requestedMode) ? requestedMode : 'mini';

    try {
      const bytes = options.processorOptions?.wasmBytes;
      if (!bytes) throw new Error('missing FMiniMug1 wasm bytes');
      const module = new WebAssembly.Module(bytes);
      const imports = { env: {}, wasi_snapshot_preview1: { proc_exit() {} } };
      const instance = new WebAssembly.Instance(module, imports);
      this.exports = instance.exports;
      this.memory = this.exports.memory;
      if (this.mode === 'bass808') this.exports.fmb808_wasm_init(sampleRate);
      else if (this.mode === 'drum808') this.exports.fmd808_wasm_init(sampleRate);
      else if (this.mode === 'alpha') this.exports.fma_wasm_init(sampleRate);
      else if (this.mode === 'workstation') this.exports.fmw_wasm_init(sampleRate);
      else this.exports.fmm_init(sampleRate);
      this.ready = true;
      this.port.postMessage({type:'ready',mode:this.mode});
    } catch (error) {
      this.port.postMessage({type:'error',message:String(error)});
    }

    this.port.onmessage = event => {
      if (!this.ready) return;
      const m = event.data;
      if (this.mode === 'workstation') {
        if (m.type === 'level') this.exports.fmw_wasm_set_level(m.part,m.value);
        else if (m.type === 'miniParam') this.exports.fmw_wasm_mini_param(m.id,m.value);
        else if (m.type === 'miniNoteOn') this.exports.fmw_wasm_mini_note_on(m.note,m.velocity??110);
        else if (m.type === 'miniNoteOff') this.exports.fmw_wasm_mini_note_off(m.note);
        else if (m.type === 'bassParam') this.exports.fmw_wasm_bass_param(m.id,m.value);
        else if (m.type === 'bassNoteOn') this.exports.fmw_wasm_bass_note_on(m.note,m.accent?1:0,m.slide?1:0);
        else if (m.type === 'bassNoteOff') this.exports.fmw_wasm_bass_note_off();
        else if (m.type === 'drumVoiceParam') this.exports.fmw_wasm_drum_voice_param(m.voice,m.param,m.value);
        else if (m.type === 'drumGlobalParam') this.exports.fmw_wasm_drum_global_param(m.param,m.value);
        else if (m.type === 'drumTrigger') this.exports.fmw_wasm_drum_trigger(m.voice,m.velocity??110,m.accent?1:0);
        else if (m.type === 'alphaParam') this.exports.fmw_wasm_alpha_param(m.id,m.value);
        else if (m.type === 'alphaNoteOn') this.exports.fmw_wasm_alpha_note_on(m.note,m.velocity??110);
        else if (m.type === 'alphaNoteOff') this.exports.fmw_wasm_alpha_note_off(m.note);
        else if (m.type === 'seqMeta') this.exports.fmw_wasm_seq_meta(m.length,m.bpm,m.swing??0);
        else if (m.type === 'seqMiniStep') this.exports.fmw_wasm_seq_mini_step(m.index,m.note,m.velocity??100,m.gate??90);
        else if (m.type === 'seqBassStep') this.exports.fmw_wasm_seq_bass_step(m.index,m.note,m.flags??0,m.velocity??108,m.gate??72);
        else if (m.type === 'seqDrumStep') this.exports.fmw_wasm_seq_drum_step(m.index,m.hits??0,m.accents??0);
        else if (m.type === 'seqAlphaStep') this.exports.fmw_wasm_seq_alpha_step(m.index,m.notes?.[0]??-1,m.notes?.[1]??-1,m.notes?.[2]??-1,m.notes?.[3]??-1,m.velocity??92,m.gate??90);
        else if (m.type === 'seqStart') this.exports.fmw_wasm_seq_start();
        else if (m.type === 'seqStop') this.exports.fmw_wasm_seq_stop();
        else if (m.type === 'reset') this.exports.fmw_wasm_reset();
        return;
      }
      if (this.mode === 'bass808') {
        if (m.type === 'param') this.exports.fmb808_wasm_set_param(m.id,m.value);
        else if (m.type === 'params') for (const [id,value] of m.values) this.exports.fmb808_wasm_set_param(id,value);
        else if (m.type === 'noteOn') this.exports.fmb808_wasm_note_on(m.note,m.accent?1:0,m.slide?1:0);
        else if (m.type === 'noteOff') this.exports.fmb808_wasm_note_off();
        else if (m.type === 'reset') this.exports.fmb808_wasm_reset();
        return;
      }
      if (this.mode === 'drum808') {
        if (m.type === 'voiceParam') this.exports.fmd808_wasm_set_voice_param(m.voice,m.param,m.value);
        else if (m.type === 'globalParam') this.exports.fmd808_wasm_set_global_param(m.param,m.value);
        else if (m.type === 'trigger') this.exports.fmd808_wasm_trigger(m.voice,m.velocity??110,m.accent?1:0);
        else if (m.type === 'reset') this.exports.fmd808_wasm_reset();
        return;
      }
      if (this.mode === 'alpha') {
        if (m.type === 'param') this.exports.fma_wasm_set_param(m.id,m.value);
        else if (m.type === 'params') for (const [id,value] of m.values) this.exports.fma_wasm_set_param(id,value);
        else if (m.type === 'noteOn') this.exports.fma_wasm_note_on(m.note,m.velocity??110);
        else if (m.type === 'noteOff') this.exports.fma_wasm_note_off(m.note);
        else if (m.type === 'allNotesOff') this.exports.fma_wasm_all_notes_off();
        else if (m.type === 'reset') this.exports.fma_wasm_reset();
        return;
      }
      if (m.type === 'param') this.exports.fmm_set_param(m.id,m.value);
      else if (m.type === 'params') for (const [id,value] of m.values) this.exports.fmm_set_param(id,value);
      else if (m.type === 'noteOn') this.exports.fmm_note_on(m.note,m.velocity??110);
      else if (m.type === 'noteOff') {
        if (Number.isInteger(m.note)&&this.exports.fmm_note_off_note) this.exports.fmm_note_off_note(m.note); else this.exports.fmm_note_off();
      } else if (m.type === 'sequence') {
        this.exports.fmm_seq_clear();
        const length=Math.min(64,m.notes?.length??0);this.exports.fmm_seq_set_meta(length||1,m.bpm??120,m.swing??0);
        for(let i=0;i<length;++i)this.exports.fmm_seq_set_step(i,m.notes[i]??-1,m.transpose?.[i]??0,m.velocities?.[i]??108,Math.max(1,Math.min(100,Math.round((m.gates?.[i]??.7)*100))),m.flags?.[i]??0);
      } else if (m.type === 'seqStart') this.exports.fmm_seq_start();
      else if (m.type === 'seqStop') this.exports.fmm_seq_stop();
      else if (m.type === 'reset') this.exports.fmm_reset();
    };
  }

  process(_inputs,outputs) {
    const output=outputs[0];if(!output?.length)return true;const frames=output[0].length;
    if(!this.ready){for(const channel of output)channel.fill(0);return true}
    let ptr;
    if(this.mode==='bass808')ptr=this.exports.fmb808_wasm_render(frames);
    else if(this.mode==='drum808')ptr=this.exports.fmd808_wasm_render(frames);
    else if(this.mode==='alpha')ptr=this.exports.fma_wasm_render(frames);
    else if(this.mode==='workstation')ptr=this.exports.fmw_wasm_render(frames);
    else ptr=this.exports.fmm_render(frames);
    const mono=new Float32Array(this.memory.buffer,ptr,frames);let peak=0,sum=0;
    for(let i=0;i<frames;++i){const s=mono[i],a=Math.abs(s);if(a>peak)peak=a;sum+=s*s;for(const channel of output)channel[i]=s}
    if(++this.meterCounter>=12){this.meterCounter=0;this.port.postMessage({type:'meter',mode:this.mode,peak,rms:Math.sqrt(sum/frames),step:this.mode==='workstation'?this.exports.fmw_wasm_seq_step():this.mode==='mini'&&this.exports.fmm_seq_step?this.exports.fmm_seq_step():0})}
    return true;
  }
}
registerProcessor('fminimug1-dsp',FMiniMug1Processor);
