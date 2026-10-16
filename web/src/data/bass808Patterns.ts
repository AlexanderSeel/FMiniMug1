import {BASS808_PARAM,type Bass808Patch,type Bass808Pattern,type Bass808ParamId} from '../audio/bass808';

const patch=(name:string,values:number[]):Bass808Patch=>({name,values:Object.fromEntries(values.map((v,i)=>[i,v])) as Record<Bass808ParamId,number>});
const s=(note:number,accent=false,slide=false,gate=.72)=>({note,accent,slide,gate});

export const BASS808_PRESETS:Bass808Patch[]=[
  patch('Acid Deep',[0,0,.16,1.28,520,.72,2600,.30,.09,.68,.15]),
  patch('Rubber Line',[1,-12,.24,1.52,760,.56,1800,.22,.065,.52,.12]),
  patch('Hot Resonator',[0,0,.08,2.20,980,.88,3300,.18,.075,.82,.10]),
  patch('Dark Pulse',[1,0,.20,1.18,340,.64,1450,.42,.12,.44,.20]),
  patch('Clean Sequence',[0,0,.10,1.02,1150,.34,1200,.26,.07,.34,.14]),
  patch('Sub Crawl',[1,-12,.46,1.38,260,.58,950,.55,.14,.56,.22])
];

export const BASS808_PATTERNS:Bass808Pattern[]=[
  {name:'Acid Steps',bpm:126,swing:9,steps:[s(36,true),s(36,false,true),s(43),s(-1),s(39,true),s(41,false,true),s(43),s(48,true),s(36),s(-1),s(46,true),s(43,false,true),s(39),s(36,true),s(34),s(36,false,true)]},
  {name:'Rubber Funk',bpm:112,swing:24,steps:[s(36,true),s(-1),s(39),s(41,false,true),s(43,true),s(-1),s(46),s(43),s(36,true),s(36,false,true),s(-1),s(48,true),s(43),s(41,false,true),s(39),s(-1)]},
  {name:'Night Acid',bpm:128,swing:5,steps:[s(36,true),s(43),s(48,false,true),s(46),s(36),s(39,true),s(43,false,true),s(-1),s(34,true),s(36,false,true),s(43),s(46),s(48,true),s(43,false,true),s(39),s(36)]},
  {name:'Machine Crawl',bpm:104,swing:14,steps:[s(31,true),s(31,false,true),s(34),s(-1),s(36),s(39,true),s(-1),s(34,false,true),s(31),s(43,true),s(41,false,true),s(39),s(-1),s(36,true),s(34),s(31)]},

  // Spacious defaults used by the V2 demo scenes. Fewer events make it easier to
  // hear envelope, filter, chorus and inter-part timing changes while editing.
  {name:'Low Tide',bpm:96,swing:4,steps:[
    s(36,true,false,.92),s(-1),s(-1),s(-1),
    s(43,false,false,.84),s(-1),s(-1),s(41,false,true,.90),
    s(36,false,false,.96),s(-1),s(-1),s(-1),
    s(34,false,false,.84),s(-1),s(36,false,true,.96),s(-1)
  ]},
  {name:'Soft Rubber',bpm:104,swing:12,steps:[
    s(36,true,false,.86),s(-1),s(39,false,false,.72),s(-1),
    s(-1),s(43,false,true,.88),s(-1),s(-1),
    s(36,false,false,.92),s(-1),s(-1),s(41,false,false,.76),
    s(-1),s(39,false,true,.84),s(-1),s(-1)
  ]},
  {name:'After Hours',bpm:108,swing:6,steps:[
    s(36,true,false,.90),s(-1),s(-1),s(43,false,false,.78),
    s(-1),s(-1),s(48,false,true,.88),s(-1),
    s(36,false,false,.92),s(-1),s(39,false,false,.78),s(-1),
    s(-1),s(43,false,false,.80),s(-1),s(-1)
  ]},
  {name:'Slow Pulse',bpm:88,swing:8,steps:[
    s(31,true,false,.98),s(-1),s(-1),s(-1),
    s(34,false,false,.92),s(-1),s(-1),s(-1),
    s(31,false,false,.98),s(-1),s(-1),s(36,false,true,.94),
    s(-1),s(-1),s(34,false,false,.88),s(-1)
  ]}
];

export const BASS808_DEFAULT_PRESET=BASS808_PRESETS[0];
export const BASS808_DEFAULT_PATTERN=BASS808_PATTERNS[4];
