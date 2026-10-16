class FMiniMug1Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.exports = null;
    this.memory = null;
    this.meterCounter = 0;
    this.mode = options.processorOptions?.mode === 'bass808' ? 'bass808' : 'mini';

    try {
      const bytes = options.processorOptions?.wasmBytes;
      if (!bytes) throw new Error('missing FMiniMug1 wasm bytes');
      const module = new WebAssembly.Module(bytes);
      const imports = {
        env: {},
        wasi_snapshot_preview1: { proc_exit() {} }
      };
      const instance = new WebAssembly.Instance(module, imports);
      this.exports = instance.exports;
      this.memory = this.exports.memory;
      if (this.mode === 'bass808') {
        if (!this.exports.fmb808_wasm_init) throw new Error('WASM lacks 808 BASS exports');
        this.exports.fmb808_wasm_init(sampleRate);
      } else {
        this.exports.fmm_init(sampleRate);
      }
      this.ready = true;
      this.port.postMessage({type: 'ready', mode: this.mode});
    } catch (error) {
      this.port.postMessage({type: 'error', message: String(error)});
    }

    this.port.onmessage = event => {
      if (!this.ready) return;
      const m = event.data;
      if (this.mode === 'bass808') {
        if (m.type === 'param') this.exports.fmb808_wasm_set_param(m.id, m.value);
        else if (m.type === 'params') {
          for (const [id, value] of m.values) this.exports.fmb808_wasm_set_param(id, value);
        } else if (m.type === 'noteOn') {
          this.exports.fmb808_wasm_note_on(m.note, m.accent ? 1 : 0, m.slide ? 1 : 0);
        } else if (m.type === 'noteOff') this.exports.fmb808_wasm_note_off();
        else if (m.type === 'reset') this.exports.fmb808_wasm_reset();
        return;
      }

      if (m.type === 'param') this.exports.fmm_set_param(m.id, m.value);
      else if (m.type === 'params') {
        for (const [id, value] of m.values) this.exports.fmm_set_param(id, value);
      } else if (m.type === 'noteOn') this.exports.fmm_note_on(m.note, m.velocity ?? 110);
      else if (m.type === 'noteOff') {
        if (Number.isInteger(m.note) && this.exports.fmm_note_off_note) this.exports.fmm_note_off_note(m.note);
        else this.exports.fmm_note_off();
      } else if (m.type === 'sequence') {
        this.exports.fmm_seq_clear();
        const length = Math.min(64, m.notes?.length ?? 0);
        this.exports.fmm_seq_set_meta(length || 1, m.bpm ?? 120, m.swing ?? 0);
        for (let i = 0; i < length; ++i) {
          const note = m.notes[i] ?? -1;
          const gate = Math.max(1, Math.min(100, Math.round((m.gates?.[i] ?? .7) * 100)));
          const velocity = m.velocities?.[i] ?? 108;
          const flags = m.flags?.[i] ?? 0;
          const transpose = m.transpose?.[i] ?? 0;
          this.exports.fmm_seq_set_step(i, note, transpose, velocity, gate, flags);
        }
      } else if (m.type === 'seqStart') this.exports.fmm_seq_start();
      else if (m.type === 'seqStop') this.exports.fmm_seq_stop();
      else if (m.type === 'reset') this.exports.fmm_reset();
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output?.length) return true;
    const frames = output[0].length;
    if (!this.ready) {
      for (const channel of output) channel.fill(0);
      return true;
    }

    const ptr = this.mode === 'bass808' ?
      this.exports.fmb808_wasm_render(frames) : this.exports.fmm_render(frames);
    const mono = new Float32Array(this.memory.buffer, ptr, frames);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < frames; ++i) {
      const s = mono[i];
      const a = Math.abs(s);
      if (a > peak) peak = a;
      sum += s * s;
      for (const channel of output) channel[i] = s;
    }

    if (++this.meterCounter >= 12) {
      this.meterCounter = 0;
      this.port.postMessage({
        type: 'meter',
        mode: this.mode,
        peak,
        rms: Math.sqrt(sum / frames),
        step: this.mode === 'mini' && this.exports.fmm_seq_step ? this.exports.fmm_seq_step() : 0
      });
    }
    return true;
  }
}

registerProcessor('fminimug1-dsp', FMiniMug1Processor);
