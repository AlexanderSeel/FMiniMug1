#!/usr/bin/env python3
"""Build non-installable FMiniMug1 FM-1 target images.

Default mode builds the raw hardware diagnostic. --synth-check compiles and
links the complete synth runtime with a synthetic control map purely to verify
JieLi/Felucca compatibility. Neither mode creates .fwsc or writes a device.

Environment:
  FELUCCA_SRC      checkout of https://github.com/hugelton/Felucca
  JIELI_TOOLCHAIN  JieLi toolchain directory containing pi32v2/bin/clang
"""
from __future__ import annotations

import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build" / "felucca-target"
APP_XIP = 0x02000120
CFLAGS = ["-Os", "-ffunction-sections", "-fno-builtin", "-Wall", "-Wextra", "-Wno-unused-function"]
SYNTH_MAP = [
    "-DFMM_BUTTON_MAP_VERIFIED=1", "-DFMM_TARGET_DIAGNOSTIC=0",
    "-DFMM_BTN_RAW_OCT_DOWN=0", "-DFMM_BTN_RAW_OCT_UP=1",
    "-DFMM_BTN_RAW_PAGE_LEFT=2", "-DFMM_BTN_RAW_PAGE_RIGHT=3",
    "-DFMM_BTN_RAW_PRESET=4", "-DFMM_BTN_RAW_PATTERN=5",
    "-DFMM_BTN_RAW_PLAY=6", "-DFMM_BTN_RAW_HOLD=7",
    "-DFMM_BTN_RAW_ENC1=8", "-DFMM_BTN_RAW_ENC2=9",
    "-DFMM_BTN_RAW_ENC3=10", "-DFMM_BTN_RAW_ENC4=11",
    "-DFMM_ENC_RAW_1=0", "-DFMM_ENC_RAW_2=1",
    "-DFMM_ENC_RAW_3=2", "-DFMM_ENC_RAW_4=3",
]


def fail(message: str) -> "None":
    raise SystemExit(f"build_felucca_target: {message}")


def require_tree() -> tuple[Path, Path]:
    felucca = Path(os.environ.get("FELUCCA_SRC", "")).expanduser()
    toolchain = Path(os.environ.get("JIELI_TOOLCHAIN", "")).expanduser()
    if not (felucca / "firmware" / "app.ld").is_file():
        fail("FELUCCA_SRC must point to a Felucca checkout containing firmware/app.ld")
    if not (toolchain / "pi32v2" / "bin" / "clang").is_file():
        fail("JIELI_TOOLCHAIN must contain pi32v2/bin/clang")
    return felucca.resolve(), toolchain.resolve()


def run(cmd: list[str], *, capture: bool = False) -> str:
    proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=capture)
    if proc.returncode:
        if capture:
            sys.stderr.write(proc.stdout)
            sys.stderr.write(proc.stderr)
        fail("command failed: " + " ".join(cmd))
    return proc.stdout if capture else ""


def main() -> int:
    synth_check = "--synth-check" in sys.argv[1:]
    unknown = [a for a in sys.argv[1:] if a != "--synth-check"]
    if unknown:
        fail("unknown arguments: " + " ".join(unknown))

    felucca, tc = require_tree()
    cc = tc / "pi32v2" / "bin" / "clang"
    ld = tc / "pi32v2" / "bin" / "ld"
    objcopy = tc / "common" / "bin" / "objcopy"
    objdump = tc / "common" / "bin" / "objdump"

    hal = felucca / "firmware" / "hal"
    fsrc = felucca / "firmware" / "src"
    fw = felucca / "firmware"
    target = ROOT / "firmware" / "target" / "felucca"
    portable = ROOT / "firmware" / "src"

    required = [fw / "crt0.S", hal / "fm1_vec.S", hal / "fm1_isr.S", fw / "app.ld", target / "fm1_minilibc.c"]
    missing = [str(p) for p in required if not p.is_file()]
    if missing:
        fail("target inputs are missing: " + ", ".join(missing))

    OUT.mkdir(parents=True, exist_ok=True)
    inc = [f"-I{hal}", f"-I{fsrc}", f"-I{ROOT / 'firmware' / 'include'}", f"-I{target}"]
    defs = SYNTH_MAP if synth_check else ["-DFMM_TARGET_DIAGNOSTIC=1"]
    stem = "fminimug1-synth-check" if synth_check else "fminimug1-diag"

    asm_sources = [fw / "crt0.S", hal / "fm1_vec.S", hal / "fm1_isr.S"]
    c_sources = [target / "fm1_minilibc.c"]
    if synth_check:
        c_sources += [portable / "fm_voice.c", portable / "fm_seq.c", portable / "fm_ui.c", portable / "fm_app.c"]
    else:
        c_sources += [portable / "fm_diag.c"]
    c_sources += [target / "fm1_lcd_bridge.c", target / "fm1_platform_felucca.c", target / "fm1_bootstrap.c", target / "fm1_target_main.c"]

    objects: list[Path] = []
    mode_tag = "synth" if synth_check else "diag"
    for src in asm_sources:
        obj = OUT / f"{mode_tag}_{src.stem}.o"
        run([str(cc), "-target", "pi32v2", "-c", str(src), "-o", str(obj)])
        objects.append(obj)
    for src in c_sources:
        obj = OUT / f"{mode_tag}_{src.stem}.o"
        run([str(cc), "-target", "pi32v2", *CFLAGS, *inc, *defs, "-c", str(src), "-o", str(obj)])
        objects.append(obj)

    elf = OUT / f"{stem}.elf"
    run([str(ld), "--gc-sections", "-T", str(fw / "app.ld"), *map(str, objects), "-o", str(elf)], capture=True)
    syms = run([str(objdump), "-t", str(elf)], capture=True)
    dis = run([str(objdump), "-d", str(elf)], capture=True)
    (OUT / f"{stem}.dis").write_text(dis)

    def symbol(name: str) -> int:
        m = re.search(rf"^([0-9a-fA-F]+) .*\s{name}$", syms, re.M)
        if not m:
            fail(f"linker symbol {name} missing")
        return int(m.group(1), 16)

    if symbol("_start") != APP_XIP:
        fail(f"_start is not at {APP_XIP:#x}")

    image = bytearray()
    for index, (section, load_symbol) in enumerate(((".text", "_start"), (".ram_text", "_rt_load"), (".data", "_data_load"))):
        path = OUT / f"{stem}-{section.strip('.')}.bin"
        proc = subprocess.run([str(objcopy), "-O", "binary", "-j", section, str(elf), str(path)], cwd=ROOT, text=True, capture_output=True)
        blob = path.read_bytes() if proc.returncode == 0 and path.exists() else b""
        if not blob:
            if index == 0:
                fail("linked .text section is empty")
            continue
        load = APP_XIP if section == ".text" else symbol(load_symbol)
        offset = load - APP_XIP
        if offset < len(image):
            fail(f"{section} load address overlaps previous image data")
        image += b"\xff" * (offset - len(image))
        image += blob

    image += b"\xff" * (-len(image) % 4)
    app_bin = OUT / f"{stem}.bin"
    app_bin.write_bytes(image)
    if image[:4] != bytes.fromhex("04818000"):
        fail(f"unexpected entry stub {image[:4].hex()} (expected 04818000)")

    ld_text = (fw / "app.ld").read_text()
    m = re.search(r"XIP\s*\(rx\)\s*:\s*ORIGIN\s*=\s*0x[0-9A-Fa-f]+,\s*LENGTH\s*=\s*(0x[0-9A-Fa-f]+|\d+)", ld_text)
    if not m:
        fail("could not parse XIP LENGTH from Felucca firmware/app.ld")
    max_image = int(m.group(1), 0)
    if len(image) > max_image:
        fail(f"image {len(image)} B exceeds linker XIP region {max_image} B")

    rom_refs = []
    for line in dis.splitlines():
        if "call" not in line and "=" not in line:
            continue
        for token in re.findall(r"\b(?:ffc|FFD|FFC)[0-9a-fA-F]{5}\b", line):
            value = int(token, 16)
            if 0xFFC00000 <= value < 0xFFD00000:
                rom_refs.append(line.strip())
    if rom_refs:
        fail("linked image references chip ROM: " + rom_refs[0])

    digest = hashlib.sha256(image).hexdigest()
    info_name = "SYNTH-CHECK-INFO.txt" if synth_check else "BUILD-INFO.txt"
    sum_name = "SYNTH-CHECK-SHA256SUMS" if synth_check else "SHA256SUMS"
    (OUT / sum_name).write_text(f"{digest}  {app_bin.name}\n")
    info = [
        "FMiniMug1 full synth target link check" if synth_check else "FMiniMug1 diagnostic target build",
        f"image={app_bin.name}", f"bytes={len(image)}", f"sha256={digest}",
        f"start={APP_XIP:#010x}", f"bss_start={symbol('_bss_start'):#010x}", f"bss_end={symbol('_bss_end'):#010x}",
        "installable=no", "flash_write_api=disabled",
        "control_map=synthetic-not-for-hardware" if synth_check else "control_map=raw-diagnostic",
    ]
    (OUT / info_name).write_text("\n".join(info) + "\n")
    print("\n".join(info))
    print("No .fwsc package was created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
