import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/,'$1')),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=message=>{console.error(`virtual-ui contract: ${message}`);process.exitCode=1};
const requireText=(text,needle,context)=>{if(!text.includes(needle))fail(`${context}: missing ${JSON.stringify(needle)}`)};
const forbidText=(text,needle,context)=>{if(text.includes(needle))fail(`${context}: obsolete ${JSON.stringify(needle)} is still present`)};

const main=read('web/src/main.tsx');
const ui=read('web/src/FM1WorkstationNext.tsx');
const uiCss=read('web/src/fm1Next.css');
const workstation=read('web/src/audio/workstation.ts');
const midiIdentity=read('web/src/audio/fm1MidiIdentity.ts');
const runtimeHeader=read('firmware/include/fm_workstation_runtime.h');
const wasm=read('firmware/wasm/fm_workstation_wasm.c');
const worklet=read('web/public/dsp/fminimug1-worklet.js');
const wasmBuild=read('scripts/build_wasm.mjs');
const shellWasmBuild=read('scripts/build_wasm.sh');
const manifest=JSON.parse(read('shared/workstation.json'));

requireText(main,"FM1WorkstationNext",'main entry');
requireText(main,"./fm1Refined.css",'main entry');
forbidText(main,"FM1Workstation'",'main entry');
if(fs.existsSync(path.join(root,'web/src/FM1Workstation.tsx')))fail('obsolete parallel FM1Workstation.tsx must not exist');

for(const token of [
  "workspaceTab==='device'",
  'DeviceInstallView',
  'DOWNLOAD WINDOWS BETA',
  'DOWNLOAD NON-INSTALLABLE TEST ZIP',
  'fminimug1-workstation-stress.bin',
  'CPU LAST / MAX / OVER',
  'fminimug1-hardware-test-report',
  'EXPORT TEST REPORT',
  "RELEASE_TAG?`${RELEASE_BASE}/FMiniMug1-${RELEASE_TAG}-hardware-diagnostics-NON-INSTALLABLE.zip`",
  'OTA WRITE IS GATED',
  'CONNECT & READ IDENTITY',
  'No .fwsc package is available.'
]) requireText(ui,token,'in-app device and installation view');
requireText(uiCss,'.workspaceNav','in-app workspace navigation styles');
requireText(uiCss,'.deviceInstall','in-app device view styles');
for(const token of [
  'IDENTITY_QUERY',
  'requestMIDIAccess({ sysex: true })',
  'More than one possible FM-1 MIDI device',
  'export async function inspectFm1Package',
  'export async function installFm1Firmware',
  'export async function resumeFm1Firmware',
  '0xe0000000',
  '0xf0000000',
  "returned.identity.product !== firmware.product"
]) requireText(midiIdentity,token,'FM-1 WebMIDI OTA protocol');
requireText(midiIdentity,'const HARDWARE_OTA_ENABLED = false;','FM-1 physical write safety gate');
requireText(midiIdentity,'ensureWriteGateClosed();','FM-1 physical write safety gate');
for(const token of ['generateFwsc','createFwsc']) forbidText(midiIdentity,token,'firmware package generation remains disabled');

const alpha=manifest.parts.find(p=>p.id==='alpha');
if(!alpha)fail('shared manifest has no ALPHA part');
else{
  const first=alpha.pages?.[0];
  const expected=['ALPHA DIAL','PRESET','—','—'];
  if(first?.id!=='alpha')fail(`ALPHA first page must be alpha, got ${first?.id}`);
  if(JSON.stringify(first?.params)!==JSON.stringify(expected))fail(`ALPHA main controls drifted: ${JSON.stringify(first?.params)}`);
}

for(const token of [
  "type AlphaFocus='param'|'value'|'modify'",
  "type ToneModify='BRILLIANCE'|'MOD RATE'|'MOD DEPTH'|'ENV TIME'",
  "const MODIFY_NAMES:ToneModify[]=['MOD RATE','MOD DEPTH','BRILLIANCE','ENV TIME']",
  "const MODIFY_RUNTIME_INDEX=[1,2,0,3] as const",
  "setAlphaFocus('param')",
  "setAlphaFocus('value')",
  "aria-label=\"Alpha Juno editing controls\"",
  "aria-label=\"Tone Modify mode\"",
  "setAlphaFocus('modify')",
  "if(alphaFocus==='param')setAlphaParamIndex",
  "else if(alphaFocus==='value')changeAlphaValue(delta)",
  "else applyToneModify(delta)",
  "applyToneModify(delta)",
  "workstation.setAlphaParam",
  "label=\"MASTER\"",
  "label=\"SELECT\"",
  "label=\"PRESETS\"",
  "label=\"ALGORITHM\"",
  "onPointerDown",
  "onPointerUp",
  "window.addEventListener('keydown'",
  "window.addEventListener('keyup'",
  "workstation.play()",
  "workstation.stop()"
]) requireText(ui,token,'active virtual FM-1');
for(const token of [
  "setAlphaFocus(v=>v==='param'?'value':'param')",
  'setModifyIndex(v=>(v+1)%MODIFY_NAMES.length)'
]) forbidText(ui,token,'Alpha Juno controls must select modes directly');

for(const token of [
  'fmw_runtime_set_value',
  'fmw_runtime_get_value',
  'FMW_RUNTIME_FIELD_ALPHA_PARAM',
  'FMW_RUNTIME_FIELD_ALPHA_FOCUS',
  'FMW_RUNTIME_FIELD_ALPHA_MODIFY_AMOUNT',
  'FMW_RUNTIME_FIELD_ALPHA_PATCH_PARAM',
  'fmw_runtime_apply_alpha_modify',
  'fmw_runtime_get_alpha_param'
]) requireText(runtimeHeader,token,'native workstation runtime ABI');
for(const token of ['fmw_wasm_runtime_set','fmw_wasm_runtime_get','fmw_wasm_alpha_tone_modify'])
  requireText(wasm,token,'WASM runtime readback exports');
for(const token of [
  'WORKSTATION_RUNTIME_FIELD',
  'getRuntimeValue',
  'applyAlphaToneModify'
]) requireText(workstation,token,'workstation browser ABI');
for(const token of ["m.type === 'runtimeSet'", "m.type === 'runtimeGet'", "m.type === 'alphaToneModify'", "type:'runtimeValue'"])
  requireText(worklet,token,'worklet runtime messages');
for(const token of ['-Wl,--export=fmw_wasm_runtime_set','-Wl,--export=fmw_wasm_runtime_get'])
  requireText(wasmBuild,token,'WASM export list');
requireText(wasmBuild,'-Wl,--export=fmw_wasm_alpha_tone_modify','WASM export list');
requireText(shellWasmBuild,'-Wl,--export=fmw_wasm_alpha_tone_modify','shell WASM export list');
for(const token of ['delta*280','delta*.10','delta*.02','delta*.025'])
  forbidText(ui,token,'Tone Modify transforms must live in portable C');

const keyMatch=ui.match(/const COMPUTER_KEYS=\[([^\]]+)\]/);
if(!keyMatch)fail('computer keyboard map missing');
else{
  const keys=[...keyMatch[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  if(keys.length!==27)fail(`computer keyboard map must contain 27 keys, got ${keys.length}`);
  if(new Set(keys).size!==keys.length)fail('computer keyboard map contains duplicate bindings');
}

for(const obsolete of [
  "label=\"SCENE\"",
  "label=\"PAGE\""
]) forbidText(ui,obsolete,'physical left-control labels');

if(process.exitCode)process.exit(process.exitCode);
console.log('virtual-ui contract: PASS — one FM-1 surface, 27-key input, Alpha Dial hooks and native runtime set/read ABI present');
