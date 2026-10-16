// Generated from shared/workstation.json. Do not edit by hand.
export const WORKSTATION_UI_VERSION=1 as const;
export const WORKSTATION_ENCODERS=4 as const;
export const WORKSTATION_PARTS=[
  {
    "id": "mini",
    "c": "FMW_PART_MINI",
    "title": "MINI",
    "subtitle": "3 OSC / ladder mono",
    "polyphony": 1,
    "pages": [
      {"id":"osc","title":"OSC","params":["OSC1","OSC2","OSC3","GLIDE"]},
      {"id":"mix","title":"MIX","params":["MIX DRIVE","FILTER DRIVE","FEEDBACK","2X OS"]},
      {"id":"filter","title":"FILTER","params":["CUTOFF","RESO","CONTOUR","KEYTRACK"]},
      {"id":"env","title":"ENV","params":["ATTACK","DECAY","SUSTAIN","RELEASE"]},
      {"id":"mod","title":"MOD","params":["DRIFT","GLIDE MODE","PRIORITY","RETRIG"]},
      {"id":"seq","title":"SEQ","params":["STEP","NOTE","GATE","PLAY"]}
    ]
  },
  {
    "id": "drum808",
    "c": "FMW_PART_DRUM808",
    "title": "808 DRUM",
    "subtitle": "analog drum machine",
    "polyphony": 8,
    "pages": [
      {"id":"kit","title":"KIT","params":["VOICE","LEVEL","TUNE","DECAY"]},
      {"id":"tone","title":"TONE","params":["TONE","ACCENT","DRIVE","TRIGGER"]},
      {"id":"mix","title":"MIX","params":["BD","SD","HATS","PERC"]},
      {"id":"seq","title":"SEQ","params":["STEP","HIT","ACCENT","VOICE"]},
      {"id":"perf","title":"PERF","params":["SWING","FILL","MUTE","PATTERN"]}
    ]
  },
  {
    "id": "bass808",
    "c": "FMW_PART_BASS808",
    "title": "808 BASS",
    "subtitle": "acid bassline",
    "polyphony": 1,
    "pages": [
      {"id":"osc","title":"OSC","params":["WAVE","TUNE","SUB","DRIVE"]},
      {"id":"filter","title":"FILTER","params":["CUTOFF","RESO","ENV MOD","ACCENT"]},
      {"id":"env","title":"ENV","params":["DECAY","SLIDE","GATE","ACC DECAY"]},
      {"id":"seq","title":"SEQ","params":["STEP","NOTE","ACCENT","SLIDE"]},
      {"id":"perf","title":"PERF","params":["TEMPO","SWING","PATTERN","PLAY"]}
    ]
  },
  {
    "id": "alpha",
    "c": "FMW_PART_ALPHA",
    "title": "ALPHA",
    "subtitle": "DCO poly synth / Alpha Dial",
    "polyphony": 6,
    "pages": [
      {"id":"alpha","title":"ALPHA DIAL","params":["ALPHA DIAL","PARAM","PRESET","CHORD"]},
      {"id":"dco","title":"DCO","params":["SAW","PULSE","SUB","NOISE"]},
      {"id":"vcf","title":"VCF","params":["CUTOFF","RESO","ENV","KEYTRACK"]},
      {"id":"vca","title":"VCA","params":["LEVEL","ENV MODE","VELOCITY","CHORUS MIX"]},
      {"id":"env","title":"ENV","params":["ATTACK","DECAY","SUSTAIN","RELEASE"]},
      {"id":"lfo","title":"LFO","params":["RATE","DELAY","DCO MOD","VCF MOD"]},
      {"id":"chorus","title":"CHORUS","params":["MODE","RATE","DEPTH","MIX"]},
      {"id":"seq","title":"SEQ","params":["STEP","CHORD","GATE","PLAY"]}
    ]
  }
] as const;
export type WorkstationPartId=(typeof WORKSTATION_PARTS)[number]['id'];
export type WorkstationPart=(typeof WORKSTATION_PARTS)[number];
export const WORKSTATION_GLOBAL_PAGES=[
  {"id":"mixer","title":"MIXER","params":["MINI","DRUM","BASS","ALPHA"]},
  {"id":"fx","title":"FX","params":["DELAY","REVERB","DRIVE","MASTER"]},
  {"id":"scene","title":"SCENE","params":["SCENE","MORPH","SAVE","LOAD"]},
  {"id":"clock","title":"CLOCK","params":["BPM","SWING","SOURCE","SYNC"]}
] as const;
