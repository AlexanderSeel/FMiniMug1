#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'shared' / 'workstation.json').read_text(encoding='utf-8'))
parts = data['parts']

seen_parts = set()
for part in parts:
    if part['id'] in seen_parts:
        raise SystemExit(f"duplicate workstation part {part['id']}")
    seen_parts.add(part['id'])
    seen_pages = set()
    for page in part['pages']:
        if page['id'] in seen_pages:
            raise SystemExit(f"duplicate page {part['id']}.{page['id']}")
        seen_pages.add(page['id'])
        if len(page['params']) != int(data['interaction']['encoders']):
            raise SystemExit(f"{part['id']}.{page['id']} must expose exactly four primary encoder params")

# C: compact descriptor table used by the native 240x240 UI.
c = [
    '#pragma once',
    '#include <stdint.h>',
    '/* Generated from shared/workstation.json. Do not edit by hand. */',
    '',
    'typedef enum {'
]
for i, part in enumerate(parts):
    c.append(f"  {part['c']} = {i},")
c += [
    f"  FMW_PART_COUNT = {len(parts)}",
    '} fmw_part_id_t;',
    '',
    'typedef struct {',
    '  const char *id;',
    '  const char *title;',
    '  const char *p0;',
    '  const char *p1;',
    '  const char *p2;',
    '  const char *p3;',
    '} fmw_page_desc_t;',
    '',
    'typedef struct {',
    '  const char *id;',
    '  const char *title;',
    '  const char *subtitle;',
    '  uint8_t polyphony;',
    '  uint8_t page_count;',
    '  const fmw_page_desc_t *pages;',
    '} fmw_part_desc_t;',
    ''
]
for part in parts:
    name = part['id'].upper().replace('-', '_')
    c.append(f"static const fmw_page_desc_t FMW_{name}_PAGES[] = {{")
    for page in part['pages']:
        params = ', '.join(json.dumps(x) for x in page['params'])
        c.append(f"  {{{json.dumps(page['id'])}, {json.dumps(page['title'])}, {params}}},")
    c.append('};')
    c.append('')
c.append('static const fmw_part_desc_t FMW_PARTS[FMW_PART_COUNT] = {')
for part in parts:
    name = part['id'].upper().replace('-', '_')
    c.append(f"  {{{json.dumps(part['id'])}, {json.dumps(part['title'])}, {json.dumps(part['subtitle'])}, {int(part['polyphony'])}, {len(part['pages'])}, FMW_{name}_PAGES}},")
c += ['};', '']
(root / 'firmware' / 'include' / 'fm_workstation_ui.h').write_text('\n'.join(c), encoding='utf-8')

# TypeScript: same descriptors, consumed by the virtual/hardware preview UI.
ts = [
    '// Generated from shared/workstation.json. Do not edit by hand.',
    f"export const WORKSTATION_UI_VERSION={int(data['version'])} as const;",
    f"export const WORKSTATION_ENCODERS={int(data['interaction']['encoders'])} as const;",
    'export const WORKSTATION_PARTS='
]
ts.append(json.dumps(parts, indent=2) + ' as const;')
ts += [
    "export type WorkstationPartId=(typeof WORKSTATION_PARTS)[number]['id'];",
    "export type WorkstationPart=(typeof WORKSTATION_PARTS)[number];",
    'export const WORKSTATION_GLOBAL_PAGES='
]
ts.append(json.dumps(data['globalPages'], indent=2) + ' as const;')
ts.append('')
out = root / 'web' / 'src' / 'generated'
out.mkdir(parents=True, exist_ok=True)
(out / 'workstation.ts').write_text('\n'.join(ts), encoding='utf-8')
print(f"generated workstation UI v{data['version']} for {len(parts)} parts")
