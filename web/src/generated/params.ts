// Generated from shared/params.json. Do not edit by hand.
export const PARAM_PROTOCOL_VERSION=1 as const;
export const PARAM={
  osc1Level: 0,
  osc2Level: 1,
  osc3Level: 2,
  osc1Wave: 3,
  osc2Wave: 4,
  osc3Wave: 5,
  osc1Semi: 6,
  osc2Semi: 7,
  osc3Semi: 8,
  cutoff: 9,
  res: 10,
  env: 11,
  attack: 12,
  decay: 13,
  sustain: 14,
  release: 15,
  glide: 16,
  mixerDrive: 17,
  filterDrive: 18,
  drift: 19,
  feedback: 20,
  keytrack: 21,
  oversample: 22,
} as const;
export type ParamId=(typeof PARAM)[keyof typeof PARAM];
