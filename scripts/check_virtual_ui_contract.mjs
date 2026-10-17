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
  'NO .fwsc · NO FLASH BUTTON'
]) requireText(ui,token,'in-app device and installation view');
requireText(uiCss,'.workspaceNav','in-app workspace navigation styles');
requireText(uiCss,'.deviceInstall','in-app device view styles');

const alpha=manifest.parts.find(p=>p.id==='alpha');
if(!alpha)fail('shared manifest has no ALPHA part');
else{
  const first=alpha.pages?.[0];
  const expected=['ALPHA DIAL','FOCUS','PRESET','TONE MODIFY'];
  if(first?.id!=='alpha')fail(`ALPHA first page must be alpha, got ${first?.id}`);
  if(JSON.stringify(first?.params)!==JSON.stringify(expected))fail(`ALPHA main controls drifted: ${JSON.stringify(first?.params)}`);
}

for(const token of [
  "type AlphaFocus='param'|'value'",
  "type ToneModify='BRILLIANCE'|'MOD RATE'|'MOD DEPTH'|'ENV TIME'",
  "if(index===0||index===1)setAlphaFocus",
  "setModifyIndex(v=>(v+1)%MODIFY_NAMES.length)",
  "applyToneModify(delta)",
  "workstation.setAlphaParam",
  "label=\"MASTER\"",
  "label=\"SELECT\"",
  "label=\"PRESETS\"",
  "label=\"ALGORITHM\"",
  "onPointerDown",
  "onPointerUp",
  "addEventListener('keydown'",
  "addEventListener('keyup'",
  "workstation.play()",
  "workstation.stop()"
]) requireText(ui,token,'active virtual FM-1');

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
