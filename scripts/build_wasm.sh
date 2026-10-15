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
  firmware/src/fm_seq.c \
  firmware/wasm/fm_voice_wasm.c \
  -s STANDALONE_WASM=1 \
  -s FILESYSTEM=0 \
  -s MALLOC=emmalloc \
  -s INITIAL_MEMORY=1048576 \
  -s ALLOW_MEMORY_GROWTH=0 \
  -Wl,--no-entry \
  -Wl,--export=fmm_init \
  -Wl,--export=fmm_reset \
  -Wl,--export=fmm_set_param \
  -Wl,--export=fmm_note_on \
  -Wl,--export=fmm_note_off \
  -Wl,--export=fmm_seq_clear \
  -Wl,--export=fmm_seq_set_meta \
  -Wl,--export=fmm_seq_set_step \
  -Wl,--export=fmm_seq_start \
  -Wl,--export=fmm_seq_stop \
  -Wl,--export=fmm_seq_step \
  -Wl,--export=fmm_render \
  -Wl,--export-memory \
  -o "$OUT/fminimug1.wasm"

echo "built $OUT/fminimug1.wasm"
