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
const manifest=JSON.parse(read('shared/workstation.json'));

requireText(main,"FM1WorkstationNext",'main entry');
requireText(main,"./fm1Refined.css",'main entry');
forbidText(main,"FM1Workstation'",'main entry');
if(fs.existsSync(path.join(root,'web/src/FM1Workstation.tsx')))fail('obsolete parallel FM1Workstation.tsx must not exist');

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
console.log('virtual-ui contract: PASS — one active FM-1 surface, 27-key input, Alpha Dial focus/Tone Modify and transport hooks present');
