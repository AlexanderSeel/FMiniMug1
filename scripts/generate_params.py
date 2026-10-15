#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'shared' / 'params.json').read_text(encoding='utf-8'))
params = data['parameters']

seen = set()
for p in params:
    if p['id'] in seen:
        raise SystemExit(f"duplicate parameter id {p['id']}")
    seen.add(p['id'])

c = ['#pragma once', '/* Generated from shared/params.json. Do not edit by hand. */', '', 'typedef enum {']
for p in params:
    c.append(f"  {p['c']} = {p['id']},")
c += ['  FMM_PARAM_COUNT', '} fmm_param_id_t;', '']
(root / 'firmware' / 'include' / 'fm_params.h').write_text('\n'.join(c), encoding='utf-8')

ts = ['// Generated from shared/params.json. Do not edit by hand.', f"export const PARAM_PROTOCOL_VERSION={int(data['version'])} as const;", 'export const PARAM={']
for p in params:
    ts.append(f"  {p['ts']}: {p['id']},")
ts += ['} as const;', 'export type ParamId=(typeof PARAM)[keyof typeof PARAM];', '']
out = root / 'web' / 'src' / 'generated'
out.mkdir(parents=True, exist_ok=True)
(out / 'params.ts').write_text('\n'.join(ts), encoding='utf-8')

print(f"generated {len(params)} parameter IDs (protocol v{data['version']})")
