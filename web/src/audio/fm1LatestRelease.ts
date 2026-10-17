import {inspectFm1Package} from './fm1MidiIdentity';

export type GitHubReleaseAsset={name:string;browser_download_url:string;digest?:string|null;size?:number};
export type GitHubRelease={tag_name:string;name?:string|null;body?:string|null;html_url:string;published_at?:string|null;draft:boolean;prerelease:boolean;assets:GitHubReleaseAsset[]};
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

/** The release API body is CORS-readable; release asset downloads are deliberately never fetched cross-origin. */
export function resolveFm1OtaAsset(release:GitHubRelease):LatestFm1Release{
  const unavailable=(reason:string):LatestFm1Release=>({release,otaAsset:null,reason});
  const metadataMatch=/<!--\s*FM1-OTA-METADATA\s+(\{[^]*?\})\s*-->/.exec(release.body??'');
  if(!metadataMatch)return unavailable('This release does not declare a hardware OTA package.');
  let metadata:Record<string,unknown>;
  try{metadata=JSON.parse(metadataMatch[1]) as Record<string,unknown>;}catch{return unavailable('This release has invalid OTA metadata.');}
  if(metadata.product!=='FMiniMug1'||metadata.tag!==release.tag_name)return unavailable('The release OTA metadata does not match this product and release.');
  if(metadata.hardware_installable!==true)return unavailable('This release is not marked hardware-installable.');
  const spec=metadata.hardware_flash_package;
  if(!spec||typeof spec!=='object')return unavailable('The release metadata does not name an OTA package.');
  const packageInfo=spec as Record<string,unknown>;
  const name=packageInfo.asset,urlAsset=release.assets.find(a=>a.name===name);
  if(typeof name!=='string'||!name.toLowerCase().endsWith('.fwsc')||!urlAsset?.browser_download_url)
    return unavailable('The declared OTA package is missing from this release.');
  const sha256=packageInfo.sha256;
  if(typeof sha256!=='string'||!SHA256.test(sha256))return unavailable('The OTA package does not have a valid SHA-256 checksum.');
  if(packageInfo.model!=='FM-1')return unavailable('The OTA manifest does not target the FM-1.');
  if(urlAsset.digest?.toLowerCase()!==`sha256:${sha256.toLowerCase()}`)return unavailable('GitHub’s release checksum does not match the declared OTA package checksum.');
  return {release,otaAsset:{name,sha256:sha256.toLowerCase(),url:urlAsset.browser_download_url},reason:'A matching FM-1 OTA package and SHA-256 checksum are published.'};
}

export async function verifyFm1OtaPackage(file:File,asset:Fm1OtaAsset):Promise<File>{
  if(file.name!==asset.name)throw new Error(`Select the release package named ${asset.name}.`);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const actual=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(actual!==asset.sha256)throw new Error('OTA package SHA-256 does not match the release manifest.');
  const inspected=await inspectFm1Package(file);
  if(!inspected.product.startsWith('FM-1_'))throw new Error('OTA package identity is not an FM-1 firmware image.');
  return file;
}

export async function fetchLatestFm1Release(fetcher:typeof fetch=fetch):Promise<LatestFm1Release>{
  const response=await fetcher(`https://api.github.com/repos/${REPO}/releases?per_page=100`,{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error(`GitHub release lookup failed (${response.status}).`);
  const release=newestPublishedRelease(await response.json());
  return resolveFm1OtaAsset(release);
}
