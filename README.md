# FMiniMug1

FMiniMug1 is evolving into a four-part performance workstation for the M-VAVE FM-1:

1. **MINI** — one Minimoog-inspired monophonic synth instance.
2. **808 DRUM** — an original analog-style drum engine.
3. **808 BASS** — an original acid/bassline synth with accent and slide.
4. **ALPHA** — an original six-voice DCO/VCF/VCA poly synth inspired by Alpha-Juno-era architecture.

The project does not copy Moog/Roland branding, artwork, ROMs or factory preset data. DSP, UI graphics, presets and patterns are original while familiar synthesis concepts are used.

> **Status:** active prototype. All four native C engines compile into the browser WASM runtime. The browser virtual mode now represents the FM-1 hardware layout and uses the same workstation part/page model intended for hardware. Diagnostic FM-1 target builds remain non-installable; no `.fwsc` is published as safe to flash.

## Repository layout

```text
firmware/            portable synth/drum/bass/poly engines, shared clock, app/runtime, target and WASM ABI
tests/               host DSP/sequencer/UI/application tests
scripts/             native/WASM build helpers
web/                 React FM-1 virtual hardware + AudioWorklet/WASM runtime
docs/                FM-1/Felucca port, target contract and architecture notes
installer/           installer/recovery integration notes
.github/workflows/   CI
```

## Browser virtual FM-1

The current virtual hardware is WASM-first: `npm run dev` builds the native DSP before starting Vite.

### Windows

Install the Emscripten SDK once, then open a terminal in the emsdk folder and activate it for that terminal session.

**Command Prompt:**

```bat
emsdk install latest
emsdk activate latest
emsdk_env.bat
```

**PowerShell:**

```powershell
.\emsdk install latest
.\emsdk activate latest
.\emsdk_env.bat
```

After activation, verify:

```powershell
emcc --version
node --version
npm --version
```

Then start FMiniMug1:

```powershell
cd web
npm install
npm run dev
```

The WASM build entry point is cross-platform Node code (`scripts/build_wasm.mjs`). On Windows it invokes `emcc.bat`; on macOS/Linux it invokes `emcc`. No Bash or `sh` is required for `npm run dev` or `npm run build:dsp`.

If `emcc` is not visible in a new terminal, run `emsdk_env.bat` again in that terminal before starting the project.

### macOS / Linux

Activate an Emscripten environment so `emcc` is on `PATH`, then:

```bash
cd web
npm install
npm run dev
```

### Production build

```bash
cd web
npm run build
```

The resulting `web/public/dsp/fminimug1.wasm` contains the unified native workstation renderer for MINI + 808 BASS + 808 DRUM + ALPHA.

## Current virtual hardware model

The browser now renders an FM-1-oriented control surface rather than the former large Minimoog editor. The central display uses the same generated workstation pages as the hardware target. The four main encoders correspond to the four parameters visible on the current page, and the 27-key virtual keyboard is context-sensitive for the selected part.

The global PLAY/STOP control drives the workstation transport rather than the old MINI-only sequence path. DRUM and BASS are clocked inside the WASM audio render loop by the shared native sample clock; MINI and ALPHA are part of the same unified WASM audio instance.

## Hardware direction

Felucca is the pinned hardware reference/HAL basis for the FM-1. FMiniMug1 keeps hardware specifics behind `firmware/include/fm1_platform.h` and uses diagnostic-first bring-up:

```text
raw controls/display
→ baseline audio budget
→ four-part workstation stress test
→ verified physical control mapping
→ mapped hardware beta
→ recovery validation
→ only then consider installable .fwsc packaging
```

Current target artifacts are explicitly NON-INSTALLABLE, flash writes remain disabled and CI must not produce `.fwsc` files.

## Safety

Custom firmware can brick hardware. Do not treat target diagnostic `.bin` files as normal install packages. Before any installable hardware beta the project must validate the physical control map, real-device CPU budget, identity/package bounds, SHA-256 manifests and the return-to-official-V15/recovery path on a test device.

## Credits

- M-VAVE/FM-1 are trademarks of their respective owners.
- Minimoog/Moog are trademarks of Moog Music / their respective owners. FMiniMug1 is not affiliated with or endorsed by Moog.
- Roland/808/Alpha Juno names are trademarks of their respective owners; this project implements original classic-inspired DSP rather than ROM/preset copies.
- Felucca by Hügelton Instruments is an important technical reference for the FM-1 platform.
