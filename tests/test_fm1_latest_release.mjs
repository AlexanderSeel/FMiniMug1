import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const outDir=fs.mkdtempSync(path.join(os.tmpdir(),'fm1-latest-release-'));
execFileSync(process.execPath,[path.join(root,'web/node_modules/typescript/bin/tsc'),
  path.join(root,'web/src/audio/fm1LatestRelease.ts'),'--target','ES2022','--module','ESNext',
  path.join(root,'web/src/audio/fm1MidiIdentity.ts'),
  '--moduleResolution','Bundler','--lib','ES2022,DOM','--strict','--skipLibCheck',
  '--outDir',outDir,'--noEmit','false'],{stdio:'inherit'});
fs.writeFileSync(path.join(outDir,'package.json'),'{"type":"module"}');
const compiledRelease=path.join(outDir,'fm1LatestRelease.js');
fs.writeFileSync(compiledRelease,fs.readFileSync(compiledRelease,'utf8').replace("from './fm1MidiIdentity'","from './fm1MidiIdentity.js'"));
const releases=await import(pathToFileURL(path.join(outDir,'fm1LatestRelease.js')).href);

const release=(tag,date,draft=false)=>({tag_name:tag,name:tag,body:'',html_url:`https://github.com/AlexanderSeel/FMiniMug1/releases/tag/${tag}`,published_at:date,draft,prerelease:true,assets:[]});
const latest=releases.newestPublishedRelease([
  release('v0.3.0-beta.4','2026-01-01T00:00:00Z'),
  release('v0.3.0-beta.5','2026-02-01T00:00:00Z'),
  release('v0.4.0-beta.1','2026-03-01T00:00:00Z',true)
]);
assert.equal(latest.tag_name,'v0.3.0-beta.5','latest non-draft prerelease is selected');
assert.throws(()=>releases.newestPublishedRelease([]),/No published/);

const assetName='FM-1_016.fwsc',sha256='a'.repeat(64);
const otaMetadata={product:'FMiniMug1',tag:latest.tag_name,hardware_installable:true,hardware_flash_package:{asset:assetName,sha256,model:'FM-1'}};
const marker=(value)=>`<!-- FM1-OTA-METADATA ${JSON.stringify(value)} -->`;
const candidate={...latest,body:marker(otaMetadata),assets:[{name:assetName,browser_download_url:`https://example.invalid/${assetName}`,digest:`sha256:${sha256}`}]};
assert.deepEqual(releases.resolveFm1OtaAsset(candidate).otaAsset,{name:assetName,sha256,url:candidate.assets[0].browser_download_url});
assert.equal(releases.resolveFm1OtaAsset({...candidate,body:marker({...otaMetadata,hardware_installable:false})}).otaAsset,null,'diagnostic-only releases are ineligible');
assert.equal(releases.resolveFm1OtaAsset({...candidate,body:marker({...otaMetadata,tag:'wrong-tag'})}).otaAsset,null,'metadata tag must match selected release');
assert.equal(releases.resolveFm1OtaAsset({...candidate,body:marker({...otaMetadata,hardware_flash_package:{asset:assetName,sha256:'bad',model:'FM-1'}})}).otaAsset,null,'checksum is mandatory');
assert.equal(releases.resolveFm1OtaAsset({...candidate,assets:[]}).otaAsset,null,'declared OTA asset must be attached to release');
assert.equal(releases.resolveFm1OtaAsset({...candidate,assets:[{...candidate.assets[0],digest:`sha256:${'b'.repeat(64)}`}]}).otaAsset,null,'GitHub asset digest must match OTA metadata');

let fetchCount=0;
const fetcher=async()=>{fetchCount++;return new Response(JSON.stringify([candidate]),{status:200,headers:{'content-type':'application/json'}});};
const found=await releases.fetchLatestFm1Release(fetcher);
assert.equal(found.otaAsset?.name,assetName);
assert.equal(fetchCount,1,'release discovery reads only the CORS-enabled GitHub API and never fetches release assets');
const packageBytes=new Uint8Array(128*1024);
const identity='FM-1_016';
for(let i=0;i<identity.length;i++)packageBytes[i*0x30+0x2f]=(identity.charCodeAt(i)+i+1)&0xff;
for(let i=identity.length;i<20;i++)packageBytes[i*0x30+0x2f]=0x7d;
for(let i=0;i<packageBytes.length;i++)if(i%0x30!==0x2f)packageBytes[i]=(i*11)&0xff;
const packageDigest=createHash('sha256').update(packageBytes).digest('hex');
const packageFile=new File([packageBytes],assetName,{type:'application/octet-stream'});
const verifiedFile=await releases.verifyFm1OtaPackage(packageFile,{name:assetName,sha256:packageDigest,url:'https://example.invalid/package'});
assert.equal(verifiedFile.name,assetName);
await assert.rejects(releases.verifyFm1OtaPackage(packageFile,{name:assetName,sha256:'0'.repeat(64),url:'https://example.invalid/package'}),/SHA-256/);
await assert.rejects(releases.verifyFm1OtaPackage(new File([packageBytes],'renamed.fwsc'),{name:assetName,sha256:packageDigest,url:'https://example.invalid/package'}),/Select the release package/);
const currentBeta={...candidate,body:'FM-1 beta; hardware diagnostics are not installable.',assets:[]};
const diagnosticOnly=await releases.fetchLatestFm1Release(async()=>new Response(JSON.stringify([currentBeta]),{status:200}));
assert.equal(diagnosticOnly.otaAsset,null,'current non-installable beta must never be offered for OTA');

console.log('FM-1 latest release discovery and OTA eligibility tests passed.');
