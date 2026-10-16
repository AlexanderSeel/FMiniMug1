#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT="$ROOT/web/public/dsp"
mkdir -p "$OUT"
cd "$ROOT"

if ! command -v emcc >/dev/null 2>&1; then
  echo "error: emcc not found. Install Emscripten or run inside the CI toolchain." >&2
  exit 2
fi

emcc \
  -O3 \
  -std=c11 \
  -Ifirmware/include \
  firmware/src/fm_voice.c \
  firmware/src/fm_bass808.c \
  firmware/src/fm_drum808.c \
  firmware/src/fm_alpha.c \
  firmware/src/fm_seq.c \
  firmware/wasm/fm_voice_wasm.c \
  firmware/wasm/fm_bass808_wasm.c \
  firmware/wasm/fm_drum808_wasm.c \
  firmware/wasm/fm_alpha_wasm.c \
  -s STANDALONE_WASM=1 \
  -s FILESYSTEM=0 \
  -s MALLOC=emmalloc \
  -s TOTAL_STACK=131072 \
  -s INITIAL_MEMORY=2097152 \
  -s ALLOW_MEMORY_GROWTH=0 \
  -Wl,--no-entry \
  -Wl,--export=fmm_init \
  -Wl,--export=fmm_reset \
  -Wl,--export=fmm_set_param \
  -Wl,--export=fmm_note_on \
  -Wl,--export=fmm_note_off_note \
  -Wl,--export=fmm_note_off \
  -Wl,--export=fmm_seq_clear \
  -Wl,--export=fmm_seq_set_meta \
  -Wl,--export=fmm_seq_set_step \
  -Wl,--export=fmm_seq_start \
  -Wl,--export=fmm_seq_stop \
  -Wl,--export=fmm_seq_step \
  -Wl,--export=fmm_render \
  -Wl,--export=fmb808_wasm_init \
  -Wl,--export=fmb808_wasm_reset \
  -Wl,--export=fmb808_wasm_set_param \
  -Wl,--export=fmb808_wasm_note_on \
  -Wl,--export=fmb808_wasm_note_off \
  -Wl,--export=fmb808_wasm_render \
  -Wl,--export=fmd808_wasm_init \
  -Wl,--export=fmd808_wasm_reset \
  -Wl,--export=fmd808_wasm_set_voice_param \
  -Wl,--export=fmd808_wasm_set_global_param \
  -Wl,--export=fmd808_wasm_trigger \
  -Wl,--export=fmd808_wasm_render \
  -Wl,--export=fma_wasm_init \
  -Wl,--export=fma_wasm_reset \
  -Wl,--export=fma_wasm_set_param \
  -Wl,--export=fma_wasm_note_on \
  -Wl,--export=fma_wasm_note_off \
  -Wl,--export=fma_wasm_all_notes_off \
  -Wl,--export=fma_wasm_render \
  -o "$OUT/fminimug1.wasm"

echo "built $OUT/fminimug1.wasm with MINI + 808 BASS + 808 DRUM + ALPHA native engines"
