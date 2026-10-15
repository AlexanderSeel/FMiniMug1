class FMiniMug1Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.exports = null;
    this.memory = null;
    this.meterCounter = 0;

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
      this.exports.fmm_init(sampleRate);
      this.ready = true;
      this.port.postMessage({type: 'ready'});
    } catch (error) {
      this.port.postMessage({type: 'error', message: String(error)});
    }

    this.port.onmessage = event => {
      if (!this.ready) return;
      const m = event.data;
      if (m.type === 'param') this.exports.fmm_set_param(m.id, m.value);
      else if (m.type === 'params') {
        for (const [id, value] of m.values) this.exports.fmm_set_param(id, value);
      } else if (m.type === 'noteOn') this.exports.fmm_note_on(m.note, m.velocity ?? 110);
      else if (m.type === 'noteOff') this.exports.fmm_note_off();
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

    const ptr = this.exports.fmm_render(frames);
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
      this.port.postMessage({type: 'meter', peak, rms: Math.sqrt(sum / frames)});
    }
    return true;
  }
}

registerProcessor('fminimug1-dsp', FMiniMug1Processor);
