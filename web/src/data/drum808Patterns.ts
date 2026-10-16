import type {Drum808Pattern} from '../audio/drum808';

const B=0,S=1,CH=2,OH=3,CP=4,T=5,CB=6,R=7;
const hit=(...voices:number[])=>voices.reduce((m,v)=>m|(1<<v),0);
const step=(hits:number,accent=0)=>({hits,accent});

export const DRUM808_PATTERNS:Drum808Pattern[]=[
  {
    name:'Electro Grid',bpm:124,swing:8,
    steps:[
      step(hit(B,CH),hit(B)),step(hit(CH)),step(hit(S,CH)),step(hit(CH)),
      step(hit(B,CH)),step(hit(CH)),step(hit(S,OH),hit(S)),step(hit(CH)),
      step(hit(B,CH),hit(B)),step(hit(CH)),step(hit(S,CH)),step(hit(CH,CB)),
      step(hit(B,CH)),step(hit(CH)),step(hit(S,OH),hit(S)),step(hit(CH,R))
    ]
  },
  {
    name:'Machine Funk',bpm:112,swing:22,
    steps:[
      step(hit(B,CH),hit(B)),step(hit(CH)),step(hit(CH,R)),step(hit(B,CH)),
      step(hit(S,CH),hit(S)),step(hit(CH)),step(hit(B,CH)),step(hit(CH,OH)),
      step(hit(B,CH),hit(B)),step(hit(CH,CB)),step(hit(CH)),step(hit(B,CH)),
      step(hit(S,CH),hit(S)),step(hit(CH)),step(hit(T,CH)),step(hit(CH,OH,R))
    ]
  },
  {
    name:'Night Drive',bpm:128,swing:4,
    steps:[
      step(hit(B,CH),hit(B)),step(hit(CH)),step(hit(CH)),step(hit(CH)),
      step(hit(S,CH),hit(S)),step(hit(CH)),step(hit(B,CH)),step(hit(CH,OH)),
      step(hit(B,CH),hit(B)),step(hit(CH)),step(hit(CH)),step(hit(B,CH)),
      step(hit(S,CH),hit(S)),step(hit(CH)),step(hit(CH,CP)),step(hit(CH,OH))
    ]
  },
  {
    name:'Broken Robot',bpm:136,swing:15,
    steps:[
      step(hit(B,R),hit(B)),step(0),step(hit(CH,CB)),step(hit(B)),
      step(hit(S,CH),hit(S)),step(hit(R)),step(0),step(hit(OH,T)),
      step(hit(B,CH),hit(B)),step(hit(CB)),step(hit(S)),step(hit(CH,R)),
      step(hit(B)),step(hit(CH)),step(hit(T,CP),hit(CP)),step(hit(OH,R))
    ]
  },

  // Calmer demo grooves: deliberate gaps, fewer hats, accents only on structural hits.
  {
    name:'Soft Eight',bpm:96,swing:4,
    steps:[
      step(hit(B,CH),hit(B)),step(0),step(hit(CH)),step(0),
      step(hit(S,CH),hit(S)),step(0),step(hit(CH)),step(0),
      step(hit(B,CH),hit(B)),step(0),step(hit(CH)),step(0),
      step(hit(S,OH),hit(S)),step(0),step(hit(CH)),step(0)
    ]
  },
  {
    name:'After Hours',bpm:104,swing:10,
    steps:[
      step(hit(B,CH),hit(B)),step(0),step(0),step(hit(CH)),
      step(hit(S),hit(S)),step(0),step(hit(CH)),step(0),
      step(hit(B,CH)),step(0),step(0),step(hit(CH)),
      step(hit(S,CP),hit(S)),step(0),step(hit(CH)),step(hit(OH))
    ]
  },
  {
    name:'Half Light',bpm:88,swing:6,
    steps:[
      step(hit(B),hit(B)),step(0),step(hit(CH)),step(0),
      step(0),step(0),step(hit(S,CH),hit(S)),step(0),
      step(hit(B)),step(0),step(hit(CH)),step(0),
      step(0),step(0),step(hit(S,OH),hit(S)),step(0)
    ]
  },
  {
    name:'Quiet Machine',bpm:108,swing:8,
    steps:[
      step(hit(B,CH),hit(B)),step(0),step(hit(CH)),step(0),
      step(hit(S),hit(S)),step(0),step(0),step(hit(CH)),
      step(hit(B)),step(0),step(hit(CH)),step(0),
      step(hit(S),hit(S)),step(0),step(hit(R)),step(hit(OH))
    ]
  }
];

export const DRUM808_VOICE_SHORT=['BD','SD','CH','OH','CP','TM','CB','RS'] as const;
