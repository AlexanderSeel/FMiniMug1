import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,parse,join} from 'node:path';
import os from 'node:os';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const outDir=resolve(root,'web','public','dsp');
const outFile=resolve(outDir,'fminimug1.wasm');
mkdirSync(outDir,{recursive:true});

function windowsEmsdkCandidates(){
  const candidates=[];
  const seen=new Set();
  const add=p=>{if(p&&!seen.has(p)){seen.add(p);candidates.push(p)}};
  const fromSdk=base=>{
    add(join(base,'upstream','emscripten','emcc.bat'));
    add(join(base,'upstream','emscripten','emcc'));
    add(join(base,'upstream','emscripten','emcc.py'));
  };

  if(process.env.EMSDK)fromSdk(process.env.EMSDK);
  if(process.env.EMSCRIPTEN_ROOT){
    add(join(process.env.EMSCRIPTEN_ROOT,'emcc.bat'));
    add(join(process.env.EMSCRIPTEN_ROOT,'emcc'));
    add(join(process.env.EMSCRIPTEN_ROOT,'emcc.py'));
  }
  if(process.env.EMSCRIPTEN){
    add(join(process.env.EMSCRIPTEN,'emcc.bat'));
    add(join(process.env.EMSCRIPTEN,'emcc'));
    add(join(process.env.EMSCRIPTEN,'emcc.py'));
  }

  let current=root;
  while(true){
    fromSdk(join(current,'emsdk'));
    const parent=dirname(current);
    if(parent===current)break;
    current=parent;
  }

  fromSdk(join(os.homedir(),'emsdk'));
  const drive=parse(root).root;
  if(drive)fromSdk(join(drive,'emsdk'));
  return candidates;
}

function probeCompiler(command,shell=false,prefixArgs=[]){
  const probe=spawnSync(command,[...prefixArgs,'--version'],{cwd:root,encoding:'utf8',shell});
  return !probe.error&&probe.status===0;
}

function findEmcc(){
  if(process.platform!=='win32'){
    if(probeCompiler('emcc'))return {command:'emcc',shell:false,prefixArgs:[]};
    return null;
  }

  if(probeCompiler('emcc',true))return {command:'emcc',shell:true,prefixArgs:[]};

  const python=process.env.EMSDK_PYTHON||process.env.PYTHON||'python';
  for(const candidate of windowsEmsdkCandidates()){
    if(!existsSync(candidate))continue;
    if(candidate.toLowerCase().endsWith('.bat')){
      if(probeCompiler(candidate,true)){
        console.log(`using Emscripten compiler: ${candidate}`);
        return {command:candidate,shell:true,prefixArgs:[]};
      }
    }else if(probeCompiler(python,false,[candidate])){
      console.log(`using Emscripten compiler via Python: ${candidate}`);
      return {command:python,shell:false,prefixArgs:[candidate]};
    }
  }
  return null;
}

const compiler=findEmcc();
if(!compiler){
  console.error('error: Emscripten compiler not found.');
  if(process.platform==='win32'){
    console.error('Run the project through .\\start-dev.ps1 so emsdk_env.bat and npm share the same environment.');
    console.error('Alternatively activate emsdk in CMD and verify that `emcc --version` works before npm run dev.');
  }else{
    console.error('Install Emscripten and make emcc available on PATH.');
  }
  process.exit(2);
}

const args=[
  '-O3','-std=c11','-Ifirmware/include',
  'firmware/src/fm_voice.c',
  'firmware/src/fm_bass808.c',
  'firmware/src/fm_drum808.c',
  'firmware/src/fm_alpha.c',
  'firmware/src/fm_seq.c',
  'firmware/src/fm_workstation_seq.c',
  'firmware/wasm/fm_voice_wasm.c',
  'firmware/wasm/fm_bass808_wasm.c',
  'firmware/wasm/fm_drum808_wasm.c',
  'firmware/wasm/fm_alpha_wasm.c',
  'firmware/wasm/fm_workstation_wasm.c',
  '-s','STANDALONE_WASM=1',
  '-s','FILESYSTEM=0',
  '-s','MALLOC=emmalloc',
  '-s','TOTAL_STACK=131072',
  '-s','INITIAL_MEMORY=2097152',
  '-s','ALLOW_MEMORY_GROWTH=0',
  '-Wl,--no-entry',
  '-Wl,--export=fmm_init',
  '-Wl,--export=fmm_reset',
  '-Wl,--export=fmm_set_param',
  '-Wl,--export=fmm_note_on',
  '-Wl,--export=fmm_note_off_note',
  '-Wl,--export=fmm_note_off',
  '-Wl,--export=fmm_seq_clear',
  '-Wl,--export=fmm_seq_set_meta',
  '-Wl,--export=fmm_seq_set_step',
  '-Wl,--export=fmm_seq_start',
  '-Wl,--export=fmm_seq_stop',
  '-Wl,--export=fmm_seq_step',
  '-Wl,--export=fmm_render',
  '-Wl,--export=fmb808_wasm_init',
  '-Wl,--export=fmb808_wasm_reset',
  '-Wl,--export=fmb808_wasm_set_param',
  '-Wl,--export=fmb808_wasm_note_on',
  '-Wl,--export=fmb808_wasm_note_off',
  '-Wl,--export=fmb808_wasm_render',
  '-Wl,--export=fmd808_wasm_init',
  '-Wl,--export=fmd808_wasm_reset',
  '-Wl,--export=fmd808_wasm_set_voice_param',
  '-Wl,--export=fmd808_wasm_set_global_param',
  '-Wl,--export=fmd808_wasm_trigger',
  '-Wl,--export=fmd808_wasm_render',
  '-Wl,--export=fma_wasm_init',
  '-Wl,--export=fma_wasm_reset',
  '-Wl,--export=fma_wasm_set_param',
  '-Wl,--export=fma_wasm_note_on',
  '-Wl,--export=fma_wasm_note_off',
  '-Wl,--export=fma_wasm_all_notes_off',
  '-Wl,--export=fma_wasm_render',
  '-Wl,--export=fmw_wasm_init',
  '-Wl,--export=fmw_wasm_reset',
  '-Wl,--export=fmw_wasm_set_level',
  '-Wl,--export=fmw_wasm_mini_param',
  '-Wl,--export=fmw_wasm_mini_note_on',
  '-Wl,--export=fmw_wasm_mini_note_off',
  '-Wl,--export=fmw_wasm_bass_param',
  '-Wl,--export=fmw_wasm_bass_note_on',
  '-Wl,--export=fmw_wasm_bass_note_off',
  '-Wl,--export=fmw_wasm_drum_voice_param',
  '-Wl,--export=fmw_wasm_drum_global_param',
  '-Wl,--export=fmw_wasm_drum_trigger',
  '-Wl,--export=fmw_wasm_alpha_param',
  '-Wl,--export=fmw_wasm_alpha_note_on',
  '-Wl,--export=fmw_wasm_alpha_note_off',
  '-Wl,--export=fmw_wasm_seq_meta',
  '-Wl,--export=fmw_wasm_seq_mini_step',
  '-Wl,--export=fmw_wasm_seq_bass_step',
  '-Wl,--export=fmw_wasm_seq_drum_step',
  '-Wl,--export=fmw_wasm_seq_alpha_step',
  '-Wl,--export=fmw_wasm_seq_start',
  '-Wl,--export=fmw_wasm_seq_stop',
  '-Wl,--export=fmw_wasm_seq_step',
  '-Wl,--export=fmw_wasm_render',
  '-o',outFile
];

const result=spawnSync(compiler.command,[...compiler.prefixArgs,...args],{cwd:root,stdio:'inherit',shell:compiler.shell});
if(result.error){console.error(result.error);process.exit(2)}
if(result.status!==0)process.exit(result.status??1);
console.log(`built ${outFile} with unified MINI + 808 BASS + 808 DRUM + ALPHA workstation renderer`);
