#!/usr/bin/env python3
"""Build a NON-INSTALLABLE FM-1 V2 workstation full-load stress image.

Load: MINI 2x + 808 BASS + 808 DRUM + six-voice ALPHA with chorus.
No semantic control map, flash writes or .fwsc packaging are enabled.
"""
from __future__ import annotations

import hashlib
import os
import re
import subprocess
from pathlib import Path

import build_felucca_diag as base


def fail(message: str) -> "None":
    raise SystemExit(f"build_felucca_workstation_stress: {message}")


def main() -> int:
    felucca, tc = base.require_tree()
    cc = tc / "pi32v2" / "bin" / "clang"
    ld = tc / "pi32v2" / "bin" / "ld"
    objcopy = tc / "common" / "bin" / "objcopy"
    objdump = tc / "common" / "bin" / "objdump"
    hal = felucca / "firmware" / "hal"
    fsrc = felucca / "firmware" / "src"
    fw = felucca / "firmware"
    target = base.ROOT / "firmware" / "target" / "felucca"
    portable = base.ROOT / "firmware" / "src"

    env = dict(os.environ)
    proc = subprocess.run(
        ["python3", str(base.ROOT / "scripts" / "build_felucca_diag.py"), "--audio-check"],
        cwd=base.ROOT, env=env, text=True,
    )
    if proc.returncode:
        fail("baseline audio-check object build failed")

    inc = [f"-I{hal}", f"-I{fsrc}", f"-I{base.ROOT / 'firmware' / 'include'}", f"-I{target}"]
    defs = [
        "-DFMM_TARGET_DIAGNOSTIC=0",
        "-DFMM_TARGET_AUDIO_DIAGNOSTIC=0",
        "-DFMM_TARGET_STUDIO_AUDIO_DIAGNOSTIC=0",
        "-DFMM_TARGET_WORKSTATION_AUDIO_DIAGNOSTIC=1",
    ]
    target_main = base.OUT / "workstation_fm1_target_main.o"
    base.run([str(cc), "-target", "pi32v2", *base.CFLAGS, *inc, *defs,
              "-c", str(target / "fm1_target_main.c"), "-o", str(target_main)])

    extra_objects = []
    for source_name in ("fm_bass808.c", "fm_drum808.c", "fm_alpha.c"):
        src = portable / source_name
        obj = base.OUT / f"workstation_{src.stem}.o"
        base.run([str(cc), "-target", "pi32v2", *base.CFLAGS, *inc, *defs,
                  "-c", str(src), "-o", str(obj)])
        extra_objects.append(obj)

    objects = sorted(base.OUT.glob("audio_*.o"))
    objects = [p for p in objects if p.name != "audio_fm1_target_main.o"]
    if not objects:
        fail("baseline audio objects are missing")
    runtime = base.find_softfloat_runtime(tc, objdump)
    stem = "fminimug1-workstation-stress"
    elf = base.OUT / f"{stem}.elf"
    base.run([str(ld), "--gc-sections", "-T", str(fw / "app.ld"),
              *map(str, objects), *map(str, extra_objects), str(target_main), str(runtime), "-o", str(elf)], capture=True)

    syms = base.run([str(objdump), "-t", str(elf)], capture=True)
    dis = base.run([str(objdump), "-d", str(elf)], capture=True)
    (base.OUT / f"{stem}.dis").write_text(dis)

    def symbol(name: str) -> int:
        m = re.search(rf"^([0-9a-fA-F]+) .*\s{name}$", syms, re.M)
        if not m:
            fail(f"linker symbol {name} missing")
        return int(m.group(1), 16)

    if symbol("_start") != base.APP_XIP:
        fail(f"_start is not at {base.APP_XIP:#x}")

    image = bytearray()
    for index, (section, load_symbol) in enumerate(((".text", "_start"), (".ram_text", "_rt_load"), (".data", "_data_load"))):
        path = base.OUT / f"{stem}-{section.strip('.')}.bin"
        p = subprocess.run([str(objcopy), "-O", "binary", "-j", section, str(elf), str(path)], cwd=base.ROOT, text=True, capture_output=True)
        blob = path.read_bytes() if p.returncode == 0 and path.exists() else b""
        if not blob:
            if index == 0:
                fail("linked .text section is empty")
            continue
        load = base.APP_XIP if section == ".text" else symbol(load_symbol)
        offset = load - base.APP_XIP
        if offset < len(image):
            fail(f"{section} load address overlaps previous image data")
        image += b"\xff" * (offset - len(image))
        image += blob

    image += b"\xff" * (-len(image) % 4)
    app_bin = base.OUT / f"{stem}.bin"
    app_bin.write_bytes(image)
    if image[:4] != bytes.fromhex("04818000"):
        fail(f"unexpected entry stub {image[:4].hex()}")

    ld_text = (fw / "app.ld").read_text()
    m = re.search(r"XIP\s*\(rx\)\s*:\s*ORIGIN\s*=\s*0x[0-9A-Fa-f]+,\s*LENGTH\s*=\s*(0x[0-9A-Fa-f]+|\d+)", ld_text)
    if not m:
        fail("could not parse XIP LENGTH")
    if len(image) > int(m.group(1), 0):
        fail("workstation stress image exceeds XIP region")

    digest = hashlib.sha256(image).hexdigest()
    (base.OUT / "WORKSTATION-STRESS-SHA256SUMS").write_text(f"{digest}  {app_bin.name}\n")
    info = [
        "FMiniMug1 V2 four-part full-load audio timing diagnostic",
        f"image={app_bin.name}",
        f"bytes={len(image)}",
        f"sha256={digest}",
        f"start={base.APP_XIP:#010x}",
        f"bss_start={symbol('_bss_start'):#010x}",
        f"bss_end={symbol('_bss_end'):#010x}",
        "installable=no",
        "flash_write_api=disabled",
        "control_map=not-required-workstation-stress",
        "audio_budget_ticks=69632",
        "load=MINI-2x+808-BASS+808-DRUM+ALPHA-6+chorus",
        f"softfloat_runtime={runtime.name}",
    ]
    (base.OUT / "WORKSTATION-STRESS-INFO.txt").write_text("\n".join(info) + "\n")
    print("\n".join(info))
    print("No .fwsc package was created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
