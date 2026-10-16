import {useEffect,useState} from 'react';
import {workstation} from './audio/workstation';
import {WORKSTATION_SCENES} from './data/workstationScenes';

export function WorkstationSceneBar(){
  const [index,setIndex]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [step,setStep]=useState(0);
  const [peak,setPeak]=useState(0);
  const scene=WORKSTATION_SCENES[index];

  useEffect(()=>workstation.onMeter(m=>{setStep(m.step);setPeak(m.peak)}),[]);
  const choose=async(next:number)=>{const wasPlaying=playing;if(wasPlaying)workstation.stop();setPlaying(false);setIndex(next);setStep(0);await workstation.loadScene(WORKSTATION_SCENES[next]);if(wasPlaying){workstation.play();setPlaying(true)}};
  const toggle=async()=>{if(playing){workstation.stop();setPlaying(false);return}await workstation.loadScene(scene);workstation.play();setPlaying(true)};

  return <section className="v2SceneBar">
    <div><strong>V2 NATIVE CLOCK SCENE</strong><select value={index} onChange={e=>void choose(+e.target.value)}>{WORKSTATION_SCENES.map((s,i)=><option value={i} key={s.name}>{s.name} · {s.bpm} BPM</option>)}</select></div>
    <p>{scene.description}</p>
    <div className="v2SceneParts"><span><b>MINI</b>{scene.miniPreset}</span><span><b>808 BASS</b>{scene.bassPatch.name} / {scene.bassPattern.name}</span><span><b>808 DRUM</b>{scene.drumPattern.name}</span><span><b>ALPHA</b>{scene.alphaPatch.name}</span></div>
    <div className="v2SceneTransport"><button className={playing?'active':''} onClick={()=>void toggle()}>{playing?'STOP':'PLAY NATIVE'}</button><span>STEP {String(step+1).padStart(2,'0')}</span><span>{scene.swing}% SWING</span><span>PEAK {(peak*100).toFixed(1)}%</span><em>808 DRUM + 808 BASS are clocked inside the WASM audio render loop.</em></div>
  </section>;
}
