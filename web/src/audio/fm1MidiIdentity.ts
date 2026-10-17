// Read-only FM-1 WebMIDI identity handshake. The OTA query is compatible with
// the established FM-1 updater protocol; this module deliberately has no write path.

const IDENTITY_QUERY = [0xf0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7f, 0xf7];

export type FM1MidiIdentity = {
  product: string;
  model: string;
  version: number;
  portName: string;
  isUpdateLoader: boolean;
};

function unpack7(bytes: ArrayLike<number>): number[] {
  const result: number[] = [];
  let accumulator = 0;
  let bits = 0;
  for (const byte of Array.from(bytes)) {
    accumulator |= (byte & 0x7f) << bits;
    bits += 7;
    while (bits >= 8) {
      result.push(accumulator & 0xff);
      accumulator >>>= 8;
      bits -= 8;
    }
  }
  return result;
}

function parseIdentity(bytes: ArrayLike<number>): Omit<FM1MidiIdentity, 'portName'> | null {
  const packet = Array.from(bytes);
  if (packet[0] !== 0xf0 || packet[packet.length - 1] !== 0xf7) return null;
  const decoded = unpack7(packet.slice(1, -1));
  if (decoded.length !== 34 || decoded[0] !== 0 || decoded[1] !== 0x59 || decoded[2] !== 0x11) return null;
  const product = String.fromCharCode(...decoded.slice(6, 33)).replace(/\0+$/, '');
  const match = /^([^_]+)_(\d+)$/.exec(product);
  if (!match) return null;
  return {
    product,
    model: match[1],
    version: Number(match[2]),
    isUpdateLoader: /^ota-/i.test(match[1]),
  };
}

function waitForIdentity(input: MIDIInput, output: MIDIOutput): Promise<Omit<FM1MidiIdentity, 'portName'>> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      input.onmidimessage = null;
    };
    const query = () => {
      if (attempts++ >= 3) {
        cleanup();
        reject(new Error('No FM-1 identity response. Check the USB connection and close other MIDI apps.'));
        return;
      }
      try {
        output.send(IDENTITY_QUERY);
      } catch {
        cleanup();
        reject(new Error('Could not send the read-only identity query to the FM-1.'));
        return;
      }
      timer = setTimeout(query, 1000);
    };
    input.onmidimessage = event => {
      if (!event.data) return;
      const identity = parseIdentity(event.data);
      if (!identity) return;
      cleanup();
      resolve(identity);
    };
    query();
  });
}

export async function readFM1Identity(): Promise<FM1MidiIdentity> {
  if (!navigator.requestMIDIAccess) throw new Error('WebMIDI is unavailable. Open this app in a browser that supports WebMIDI over a secure connection.');
  const access = await navigator.requestMIDIAccess({ sysex: true });
  const outputs = [...access.outputs.values()].filter(port => port.state !== 'disconnected');
  const pairs: Array<{ input: MIDIInput; output: MIDIOutput }> = [];
  for (const input of access.inputs.values()) {
    if (input.state === 'disconnected' || !/fm-1|felucca|ota|composite|sinco|usb-midi/i.test(input.name || '')) continue;
    const output = outputs.find(port => port.name === input.name);
    if (output) pairs.push({ input, output });
  }

  if (pairs.length === 0) throw new Error('No matching FM-1 MIDI input/output pair found. Connect the device by USB.');
  if (pairs.length > 1) throw new Error('More than one possible FM-1 MIDI device is connected. Disconnect the others before identifying a device.');

  const [{ input, output }] = pairs;
  try {
    await Promise.all([input.open(), output.open()]);
    const identity = await waitForIdentity(input, output);
    return { ...identity, portName: input.name || 'FM-1 USB MIDI' };
  } finally {
    input.onmidimessage = null;
    await Promise.allSettled([input.close?.(), output.close?.()]);
  }
}
