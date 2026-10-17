import {inspectFm1Package} from './fm1MidiIdentity';

export type GitHubReleaseAsset={name:string;browser_download_url:string;size?:number};
export type GitHubRelease={tag_name:string;name?:string|null;html_url:string;published_at?:string|null;draft:boolean;prerelease:boolean;assets:GitHubReleaseAsset[]};
export type Fm1OtaAsset={name:string;sha256:string;url:string};
export type LatestFm1Release={release:GitHubRelease;otaAsset:Fm1OtaAsset|null;reason:string};

const REPO='AlexanderSeel/FMiniMug1';
const SHA256=/^[a-f0-9]{64}$/i;

export function newestPublishedRelease(releases:unknown):GitHubRelease{
  if(!Array.isArray(releases))throw new Error('GitHub returned an invalid releases list.');
  const published=(releases as GitHubRelease[]).filter(r=>r&&r.draft===false&&typeof r.tag_name==='string'&&typeof r.html_url==='string')
    .sort((a,b)=>Date.parse(b.published_at??'')-Date.parse(a.published_at??''));
  if(!published.length)throw new Error('No published FMiniMug1 releases are available.');
  return published[0];
}

/** Resolve an OTA payload only from a matching release manifest and a same-release asset. */
export function resolveFm1OtaAsset(release:GitHubRelease,manifest:unknown):LatestFm1Release{
  const unavailable=(reason:string):LatestFm1Release=>({release,otaAsset:null,reason});
  if(!manifest||typeof manifest!=='object')return unavailable('This release has no valid hardware manifest.');
  const m=manifest as Record<string,unknown>;
  if(m.product!=='FMiniMug1'||m.tag!==release.tag_name)return unavailable('The release manifest does not match this product and release.');
  if(m.hardware_installable!==true)return unavailable('This release is not marked hardware-installable.');
  const spec=m.hardware_flash_package;
  if(!spec||typeof spec!=='object')return unavailable('The release manifest does not name a verified OTA package.');
  const packageInfo=spec as Record<string,unknown>;
  const name=packageInfo.asset,urlAsset=release.assets.find(a=>a.name===name);
  if(typeof name!=='string'||!name.toLowerCase().endsWith('.fwsc')||!urlAsset?.browser_download_url)
    return unavailable('The declared OTA package is missing from this release.');
  const sha256=packageInfo.sha256;
  if(typeof sha256!=='string'||!SHA256.test(sha256))return unavailable('The OTA package does not have a valid SHA-256 checksum.');
  if(packageInfo.model!=='FM-1')return unavailable('The OTA manifest does not target the FM-1.');
  return {release,otaAsset:{name,sha256:sha256.toLowerCase(),url:urlAsset.browser_download_url},reason:'A matching FM-1 OTA package and SHA-256 checksum are published.'};
}

export async function downloadAndVerifyFm1OtaPackage(asset:Fm1OtaAsset,fetcher:typeof fetch=fetch):Promise<File>{
  const response=await fetcher(asset.url);
  if(!response.ok)throw new Error(`OTA package download failed (${response.status}).`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const actual=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(actual!==asset.sha256)throw new Error('OTA package SHA-256 does not match the release manifest.');
  const file=new File([bytes],asset.name,{type:'application/octet-stream'});
  const inspected=await inspectFm1Package(file);
  if(!inspected.product.startsWith('FM-1_'))throw new Error('OTA package identity is not an FM-1 firmware image.');
  return file;
}

export async function fetchLatestFm1Release(fetcher:typeof fetch=fetch):Promise<LatestFm1Release>{
  const response=await fetcher(`https://api.github.com/repos/${REPO}/releases?per_page=100`,{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error(`GitHub release lookup failed (${response.status}).`);
  const release=newestPublishedRelease(await response.json());
  const manifestAsset=release.assets.find(asset=>asset.name==='manifest.json');
  if(!manifestAsset)return {release,otaAsset:null,reason:'This release has no manifest asset; hardware OTA is unavailable.'};
  const manifestResponse=await fetcher(manifestAsset.browser_download_url,{headers:{Accept:'application/json'}});
  if(!manifestResponse.ok)return {release,otaAsset:null,reason:`Could not read this release manifest (${manifestResponse.status}); hardware OTA is unavailable.`};
  return resolveFm1OtaAsset(release,await manifestResponse.json());
}
