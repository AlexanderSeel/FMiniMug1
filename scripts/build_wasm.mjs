import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const outDir=resolve(root,'web','public','dsp');
const outFile=resolve(outDir,'fminimug1.wasm');
mkdirSync(outDir,{recursive:true});

const emcc=process.platform==='win32'?'emcc.bat':'emcc';
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
  '-Wl,--export=fmw_wasm_drum_voice_param',
  '-Wl,--export=fmw_wasm_drum_global_param',
  '-Wl,--export=fmw_wasm_drum_trigger',
  '-Wl,--export=fmw_wasm_alpha_param',
  '-Wl,--export=fmw_wasm_alpha_note_on',
  '-Wl,--export=fmw_wasm_alpha_note_off',
  '-Wl,--export=fmw_wasm_seq_meta',
  '-Wl,--export=fmw_wasm_seq_bass_step',
  '-Wl,--export=fmw_wasm_seq_drum_step',
  '-Wl,--export=fmw_wasm_seq_start',
  '-Wl,--export=fmw_wasm_seq_stop',
  '-Wl,--export=fmw_wasm_seq_step',
  '-Wl,--export=fmw_wasm_render',
  '-o',outFile
];

const probe=spawnSync(emcc,['--version'],{cwd:root,encoding:'utf8',shell:process.platform==='win32'});
if(probe.error||probe.status!==0){
  console.error(`error: ${emcc} not found or not usable.`);
  console.error('Install/activate Emscripten first. On Windows, run emsdk_env.bat in the terminal before npm run dev.');
  process.exit(2);
}

const result=spawnSync(emcc,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
if(result.error){console.error(result.error);process.exit(2)}
if(result.status!==0)process.exit(result.status??1);
console.log(`built ${outFile} with unified MINI + 808 BASS + 808 DRUM + ALPHA workstation renderer`);
