import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const outDir=fs.mkdtempSync(path.join(os.tmpdir(),'fm1-ota-test-'));
execFileSync(process.execPath,[path.join(root,'web/node_modules/typescript/bin/tsc'),
  path.join(root,'web/src/audio/fm1MidiIdentity.ts'),'--target','ES2022','--module','ESNext',
  '--moduleResolution','Bundler','--lib','ES2022,DOM,DOM.Iterable','--strict','--skipLibCheck',
  '--outDir',outDir,'--noEmit','false'],{stdio:'inherit'});
fs.writeFileSync(path.join(outDir,'package.json'),'{"type":"module"}');
const protocol=await import(pathToFileURL(path.join(outDir,'fm1MidiIdentity.js')).href);

for(let length=0;length<80;length++){
  const bytes=Array.from({length},(_,index)=>(index*73+length*19)&0xff);
  assert.deepEqual(protocol.unpack7Bit(protocol.pack7Bit(bytes)),bytes,`7-bit roundtrip length ${length}`);
}

function makeReadRequest(address,length,flags=3){
  const body=[0,0x59,0x30,(length+8)&0xff,((length+8)>>>8)&0xff,0,flags,
    address&0xff,(address>>>8)&0xff,(address>>>16)&0xff,(address>>>24)&0xff,
    length&0xff,(length>>>8)&0xff,0];
  let checksum=0;for(let i=6;i<body.length;i++)checksum+=body[i];
  body.push(~checksum&0xff);
  return [0xf0,...protocol.pack7Bit(body),0xf7];
}
assert.deepEqual(protocol.parseReadRequest(makeReadRequest(0x12345678,512)),{flags:3,address:0x12345678,length:512});
assert.deepEqual(protocol.parseReadRequest(makeReadRequest(0xf0000000,0)),{flags:3,address:0xf0000000,length:0});
const badRequest=makeReadRequest(0x12345678,64);badRequest[badRequest.length-2]^=1;
assert.equal(protocol.parseReadRequest(badRequest),null,'bad checksum is rejected');
assert.deepEqual(protocol.parseReadRequest([0xf0,0x01,0xf7]),null,'unrelated SysEx is ignored');
const response=protocol.makeReadResponse(0x10203040,[0x11,0x22,0x33],5);
const responseBody=protocol.unpack7Bit(response.slice(1,-1));
assert.deepEqual(response.slice(0,1),[0xf0]);
assert.deepEqual(response.slice(-1),[0xf7]);
assert.deepEqual(responseBody.slice(0,3),[0,0x59,0x30]);
assert.deepEqual(responseBody.slice(14,17),[0x11,0x22,0x33]);
let responseChecksum=0;for(let i=6;i<responseBody.length-1;i++)responseChecksum+=responseBody[i];
assert.equal(responseBody.at(-1),(~responseChecksum)&0xff,'response checksum is correct');

function identityPacket(product){
  const body=new Array(34).fill(0);body[0]=0;body[1]=0x59;body[2]=0x11;
  [...product].forEach((char,index)=>{body[6+index]=char.charCodeAt(0)});
  return [0xf0,...protocol.pack7Bit(body),0xf7];
}
assert.deepEqual(protocol.parseFM1IdentityMessage(identityPacket('FM-1_015')),
  {product:'FM-1_015',model:'FM-1',version:15,isUpdateLoader:false});
assert.deepEqual(protocol.parseFM1IdentityMessage(identityPacket('ota-FM-1_015')),
  {product:'ota-FM-1_015',model:'ota-FM-1',version:15,isUpdateLoader:true});
assert.equal(protocol.parseFM1IdentityMessage(identityPacket('OTHER_015')),null,'unrelated product identity is rejected');

const packageBytes=new Uint8Array(128*1024);
const product='FM-1_015';
for(let i=0;i<product.length;i++)packageBytes[i*0x30+0x2f]=(product.charCodeAt(i)+i+1)&0xff;
for(let i=product.length;i<20;i++)packageBytes[i*0x30+0x2f]=0x7d;
for(let i=0;i<packageBytes.length;i++)if(i%0x30!==0x2f)packageBytes[i]=(i*11)&0xff;
assert.equal(protocol.productFromFwsc(packageBytes),'FM-1_015');
const image=protocol.logicalImageFromFwsc(packageBytes);
assert.equal(image.length,packageBytes.length-20);
assert.deepEqual([...image.subarray(0,12)],[...packageBytes.subarray(0,12)]);
assert.deepEqual([...image.subarray(20*0x2f,20*0x2f+12)],[...packageBytes.subarray(20*0x30,20*0x30+12)]);
assert.throws(()=>protocol.productFromFwsc(new Uint8Array(32)),/too short/);
const firmwareFile=new Blob([packageBytes]);Object.defineProperty(firmwareFile,'name',{value:'FM-1_015.fwsc'});
const inspected=await protocol.inspectFm1Package(firmwareFile);
assert.equal(inspected.product,'FM-1_015');
assert.equal(inspected.sha256,createHash('sha256').update(packageBytes).digest('hex'));
assert.deepEqual(inspected.image,image);

const emptyFwsc=new Blob([]);Object.defineProperty(emptyFwsc,'name',{value:'test.fwsc'});
await assert.rejects(protocol.installFm1Firmware(emptyFwsc,'00'),/installation is disabled/);
await assert.rejects(protocol.resumeFm1Firmware(emptyFwsc,'00'),/installation is disabled/);
console.log('FM-1 WebMIDI OTA protocol tests passed; physical firmware writes remain gated.');
