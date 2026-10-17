// FM-1 WebMIDI identity and OTA protocol support.
// Protocol compatibility follows the public Felucca 1.0.5 browser updater used by
// TheReFmB1rth. Keep the physical write gate below closed until hardware validation passes.

const IDENTITY_QUERY = [0xf0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7f, 0xf7];
const OTA_HANDOFF = [0xf0, 0x22, 0x24, 0x35, 0x7f, 0xf7];
const MAX_READ_BYTES = 512;
const PACKAGE_HEADER_BLOCKS = 20;
const PACKAGE_BLOCK_BYTES = 0x30;
const PACKAGE_DATA_BYTES = 0x2f;
const HARDWARE_OTA_ENABLED = false;

export type FM1MidiIdentity = {
  product: string;
  model: string;
  version: number;
  portName: string;
  isUpdateLoader: boolean;
};

export type FM1FirmwarePackage = {
  product: string;
  sha256: string;
  fileBytes: number;
  image: Uint8Array;
};

export type FM1OtaStep = 'identity' | 'package-check' | 'handoff' | 'preflight' | 'loader' | 'transfer' | 'reboot' | 'complete';
export type FM1OtaProgress = (step: FM1OtaStep, detail: string) => void;

type MidiPair = { input: MIDIInput; output: MIDIOutput };
type ParsedIdentity = Omit<FM1MidiIdentity, 'portName'>;
type ReadRequest = { flags: number; address: number; length: number };
type ServeResult = { requestsServed: number; finished: boolean; disconnected: boolean };

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export function pack7Bit(bytes: ArrayLike<number>): number[] {
  const packed: number[] = [];
  let accumulator = 0;
  let bitCount = 0;
  for (const byte of Array.from(bytes)) {
    accumulator |= byte << bitCount;
    bitCount += 8;
    while (bitCount >= 7) {
      packed.push(accumulator & 0x7f);
      accumulator >>>= 7;
      bitCount -= 7;
    }
  }
  if (bitCount) packed.push(accumulator & 0x7f);
  return packed;
}

export function unpack7Bit(bytes: ArrayLike<number>): number[] {
  const unpacked: number[] = [];
  let accumulator = 0;
  let bitCount = 0;
  for (const byte of Array.from(bytes)) {
    accumulator |= (byte & 0x7f) << bitCount;
    bitCount += 7;
    while (bitCount >= 8) {
      unpacked.push(accumulator & 0xff);
      accumulator >>>= 8;
      bitCount -= 8;
    }
  }
  return unpacked;
}

export function makeReadResponse(address: number, data: ArrayLike<number>, flags = 0): number[] {
  const length = data.length;
  const body = [
    0x00, 0x59, 0x30, (length + 8) & 0xff, ((length + 8) >>> 8) & 0xff,
    0, flags & 0xff, address & 0xff, (address >>> 8) & 0xff,
    (address >>> 16) & 0xff, (address >>> 24) & 0xff,
    length & 0xff, (length >>> 8) & 0xff, 0,
    ...Array.from(data, byte => byte & 0xff),
  ];
  let checksum = 0;
  for (let i = 6; i < body.length; i++) checksum += body[i];
  body.push(~checksum & 0xff);
  return [0xf0, ...pack7Bit(body), 0xf7];
}

export function parseReadRequest(packet: ArrayLike<number>): ReadRequest | null {
  const bytes = Array.from(packet);
  if (bytes[0] !== 0xf0 || bytes[bytes.length - 1] !== 0xf7) return null;
  const body = unpack7Bit(bytes.slice(1, -1));
  if (body.length !== 15 || body[0] !== 0 || body[1] !== 0x59 || body[2] !== 0x30) return null;
  let checksum = 0;
  for (let i = 6; i < 14; i++) checksum += body[i];
  if (((~checksum) & 0xff) !== body[14]) return null;
  return {
    flags: body[6],
    address: (body[7] | (body[8] << 8) | (body[9] << 16) | (body[10] << 24)) >>> 0,
    length: body[11] | (body[12] << 8) | (body[13] << 16),
  };
}

export function parseFM1IdentityMessage(packet: ArrayLike<number>): ParsedIdentity | null {
  const bytes = Array.from(packet);
  if (bytes[0] !== 0xf0 || bytes[bytes.length - 1] !== 0xf7) return null;
  const body = unpack7Bit(bytes.slice(1, -1));
  if (body.length !== 34 || body[0] !== 0 || body[1] !== 0x59 || body[2] !== 0x11) return null;
  const product = String.fromCharCode(...body.slice(6, 33)).replace(/\0+$/, '');
  const match = /^([^_]+)_(\d+)$/.exec(product);
  if (!match) return null;
  if (match[1] !== 'FM-1' && match[1] !== 'ota-FM-1') return null;
  return { product, model: match[1], version: Number(match[2]), isUpdateLoader: /^ota-/i.test(match[1]) };
}

export function productFromFwsc(bytes: Uint8Array): string {
  if (bytes.length < PACKAGE_HEADER_BLOCKS * PACKAGE_BLOCK_BYTES) throw new Error('Not an FM-1 .fwsc package: file is too short.');
  let product = '';
  for (let block = 0; block < PACKAGE_HEADER_BLOCKS; block++) {
    const marker = bytes[block * PACKAGE_BLOCK_BYTES + PACKAGE_DATA_BYTES];
    if (marker !== 0x7d) product += String.fromCharCode((marker - block - 1) & 0xff);
  }
  if (!/^FM-1_\d+$/.test(product)) throw new Error(`Unsupported firmware identity: ${product || '(missing)'}`);
  return product;
}

export function logicalImageFromFwsc(bytes: Uint8Array): Uint8Array {
  productFromFwsc(bytes);
  const image = new Uint8Array(bytes.length - PACKAGE_HEADER_BLOCKS);
  for (let block = 0; block < PACKAGE_HEADER_BLOCKS; block++) {
    image.set(bytes.subarray(block * PACKAGE_BLOCK_BYTES, block * PACKAGE_BLOCK_BYTES + PACKAGE_DATA_BYTES), block * PACKAGE_DATA_BYTES);
  }
  image.set(bytes.subarray(PACKAGE_HEADER_BLOCKS * PACKAGE_BLOCK_BYTES), PACKAGE_HEADER_BLOCKS * PACKAGE_DATA_BYTES);
  return image;
}

export async function inspectFm1Package(file: File): Promise<FM1FirmwarePackage> {
  if (!file.name.toLowerCase().endsWith('.fwsc')) throw new Error('Choose an FM-1 .fwsc firmware package.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const product = productFromFwsc(bytes);
  if (bytes.length < 128 * 1024) throw new Error('Package is unexpectedly small for an FM-1 firmware image.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return { product, sha256, fileBytes: bytes.length, image: logicalImageFromFwsc(bytes) };
}

class MidiLink {
  private queue: number[][] = [];
  private wakeReader: (() => void) | null = null;

  constructor(readonly input: MIDIInput, readonly output: MIDIOutput) {
    input.onmidimessage = event => {
      if (!event.data || event.data[0] !== 0xf0) return;
      this.queue.push(Array.from(event.data));
      this.wakeReader?.();
      this.wakeReader = null;
    };
  }

  get disconnected() { return this.input.state === 'disconnected' || this.output.state === 'disconnected'; }
  send(bytes: number[]) { try { this.output.send(bytes); return true; } catch { return false; } }
  drain() { this.queue.length = 0; }

  async read(timeoutMs: number): Promise<number[] | null> {
    if (!this.queue.length) {
      let timer: ReturnType<typeof setTimeout>;
      await Promise.race([
        new Promise<void>(resolve => { this.wakeReader = resolve; }),
        new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); }),
      ]);
      clearTimeout(timer!);
      this.wakeReader = null;
    }
    return this.queue.shift() ?? null;
  }

  close() { this.input.onmidimessage = null; }
}

async function closeMidiLink(link: MidiLink): Promise<void> {
  link.close();
  await Promise.allSettled([link.input.close(), link.output.close()]);
}

function candidatePairs(access: MIDIAccess): MidiPair[] {
  const outputs = [...access.outputs.values()].filter(port => port.state !== 'disconnected');
  const pairs: MidiPair[] = [];
  for (const input of access.inputs.values()) {
    if (input.state === 'disconnected' || !/fm-1|felucca|ota|composite|sinco|usb-midi/i.test(input.name || '')) continue;
    const output = outputs.find(port => port.name === input.name);
    if (output) pairs.push({ input, output });
  }
  if (pairs.length > 1) throw new Error(`More than one possible FM-1 MIDI device is connected (${pairs.map(pair => pair.input.name).join(', ')}). Disconnect the others.`);
  return pairs;
}

async function handshake(link: MidiLink, attempts = 3): Promise<ParsedIdentity | null> {
  link.drain();
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (!link.send(IDENTITY_QUERY)) return null;
    const deadline = Date.now() + 1000;
    while (Date.now() < deadline) {
      const response = await link.read(deadline - Date.now());
      if (!response) break;
      const identity = parseFM1IdentityMessage(response);
      if (identity) return identity;
    }
  }
  return null;
}

async function openDevice(access: MIDIAccess, accepts: (identity: ParsedIdentity) => boolean): Promise<{ link: MidiLink; identity: ParsedIdentity; portName: string } | null> {
  for (const pair of candidatePairs(access)) {
    try { await Promise.all([pair.input.open(), pair.output.open()]); } catch { continue; }
    const link = new MidiLink(pair.input, pair.output);
    const identity = await handshake(link, 2);
    if (identity && accepts(identity)) return { link, identity, portName: pair.input.name || 'FM-1 USB MIDI' };
    await closeMidiLink(link);
  }
  return null;
}

async function getMidiAccess(): Promise<MIDIAccess> {
  if (!navigator.requestMIDIAccess) throw new Error('WebMIDI is unavailable. Use a WebMIDI-capable browser over HTTPS or localhost.');
  return navigator.requestMIDIAccess({ sysex: true });
}

export async function readFM1Identity(): Promise<FM1MidiIdentity> {
  const access = await getMidiAccess();
  const device = await openDevice(access, () => true);
  if (!device) throw new Error('No FM-1 identity response. Check USB and close other MIDI applications.');
  const result = { ...device.identity, portName: device.portName };
  await closeMidiLink(device.link);
  return result;
}

async function serveReadRequests(link: MidiLink, image: Uint8Array, finishAddress: number, idleTimeoutMs: number, progressStep: 'preflight' | 'transfer', onProgress?: FM1OtaProgress): Promise<ServeResult> {
  let requestsServed = 0;
  let lastRequestAt = Date.now();
  while (true) {
    const packet = await link.read(1000);
    if (!packet) {
      if (link.disconnected) return { requestsServed, finished: false, disconnected: true };
      if (Date.now() - lastRequestAt > idleTimeoutMs) return { requestsServed, finished: false, disconnected: false };
      continue;
    }
    const request = parseReadRequest(packet);
    if (!request) continue;
    lastRequestAt = Date.now();
    if (request.address === 0xe0000000 || request.address === 0xf0000000) {
      if (!link.send(makeReadResponse(request.address, [...new TextEncoder().encode('success'), 0]))) {
        return { requestsServed, finished: false, disconnected: true };
      }
      if (request.address === finishAddress) return { requestsServed, finished: true, disconnected: false };
      continue;
    }
    if (request.length > MAX_READ_BYTES || request.address + request.length > image.length) {
      throw new Error(`FM-1 requested invalid image range ${request.address.toString(16)} + ${request.length}.`);
    }
    await sleep(10);
    const data = image.subarray(request.address, request.address + request.length);
    if (!link.send(makeReadResponse(request.address, data, request.flags))) {
      return { requestsServed, finished: false, disconnected: true };
    }
    requestsServed++;
    onProgress?.(progressStep, `Answered ${requestsServed} loader reads (address 0x${request.address.toString(16)}).`);
  }
}

function ensureWriteGateClosed(): void {
  if (!HARDWARE_OTA_ENABLED) {
    throw new Error('FM-1 firmware installation is disabled until physical controls, CPU LAST / MAX / OVER and stock V15 recovery are validated.');
  }
}

export async function installFm1Firmware(file: File, expectedSha256: string, onProgress: FM1OtaProgress = () => {}): Promise<string> {
  ensureWriteGateClosed();
  onProgress('package-check', 'Checking FM-1 package identity and checksum.');
  const firmware = await inspectFm1Package(file);
  if (!expectedSha256 || firmware.sha256.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    throw new Error('Firmware checksum does not match the trusted release checksum.');
  }
  const access = await getMidiAccess();
  const model = firmware.product.split('_')[0];
  const device = await openDevice(access, identity => !identity.isUpdateLoader);
  if (!device) throw new Error('FM-1 not found. Check USB and close other MIDI applications.');
  if (device.identity.model !== model) {
    await closeMidiLink(device.link);
    throw new Error(`Connected device is ${device.identity.product}; package is ${firmware.product}.`);
  }

  onProgress('identity', `Matched ${device.identity.product} on ${device.portName}.`);
  let preflight: ServeResult;
  try {
    if (!device.link.send(OTA_HANDOFF)) throw new Error('Could not request the FM-1 update-loader handoff.');
    onProgress('handoff', 'Waiting for firmware preflight handoff.');
    await sleep(2000);
    preflight = await serveReadRequests(device.link, firmware.image, 0xe0000000, 8000, 'preflight', onProgress);
  } finally {
    await closeMidiLink(device.link);
  }
  if (!preflight.finished) throw new Error(preflight.disconnected ? 'FM-1 disconnected during preflight; reconnect and retry.' : 'FM-1 did not complete preflight handoff.');

  onProgress('loader', 'Waiting for the FM-1 update loader.');
  await sleep(3000);
  const loader = await waitForDevice(access, identity => identity.model === `ota-${model}`, 30000);
  if (!loader) throw new Error('Update loader did not appear. Reconnect USB; the device should remain in update mode.');
  let transfer: ServeResult;
  try {
    transfer = await serveReadRequests(loader.link, firmware.image, 0xf0000000, 180000, 'transfer', onProgress);
  } finally {
    await closeMidiLink(loader.link);
  }
  if (!transfer.finished) throw new Error(transfer.disconnected ? 'Loader disconnected during transfer; reconnect and use resume.' : 'Loader transfer stopped; reconnect and use resume.');

  onProgress('reboot', 'Waiting for the updated FM-1 to reboot.');
  await sleep(3000);
  const returned = await waitForDevice(access, identity => !identity.isUpdateLoader, 40000);
  if (!returned) throw new Error('FM-1 did not return after transfer. Power-cycle and verify its identity.');
  await closeMidiLink(returned.link);
  if (returned.identity.product !== firmware.product) throw new Error(`FM-1 returned as ${returned.identity.product}; expected ${firmware.product}.`);
  onProgress('complete', `Verified returned firmware ${returned.identity.product}.`);
  return returned.identity.product;
}

export async function resumeFm1Firmware(file: File, expectedSha256: string, onProgress: FM1OtaProgress = () => {}): Promise<boolean> {
  ensureWriteGateClosed();
  onProgress('package-check', 'Checking FM-1 package identity and checksum.');
  const firmware = await inspectFm1Package(file);
  if (!expectedSha256 || firmware.sha256.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    throw new Error('Firmware checksum does not match the trusted release checksum.');
  }
  const access = await getMidiAccess();
  const model = firmware.product.split('_')[0];
  const loader = await openDevice(access, identity => identity.model === `ota-${model}`);
  if (!loader) return false;
  onProgress('loader', 'Resuming transfer in the update loader.');
  let transfer: ServeResult;
  try {
    transfer = await serveReadRequests(loader.link, firmware.image, 0xf0000000, 180000, 'transfer', onProgress);
  } finally {
    await closeMidiLink(loader.link);
  }
  if (!transfer.finished) return false;
  onProgress('reboot', 'Waiting for the FM-1 to return after resume.');
  await sleep(3000);
  const returned = await waitForDevice(access, identity => !identity.isUpdateLoader, 40000);
  if (!returned) throw new Error('FM-1 did not return after resumed transfer.');
  await closeMidiLink(returned.link);
  if (returned.identity.product !== firmware.product) throw new Error(`FM-1 returned as ${returned.identity.product}; expected ${firmware.product}.`);
  onProgress('complete', `Verified returned firmware ${returned.identity.product}.`);
  return true;
}

async function waitForDevice(access: MIDIAccess, accepts: (identity: ParsedIdentity) => boolean, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const device = await openDevice(access, accepts);
    if (device) return device;
    await sleep(1000);
  }
  return null;
}
