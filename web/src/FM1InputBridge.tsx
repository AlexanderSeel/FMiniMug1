import {useEffect} from 'react';
import {workstation} from './audio/workstation';
import {bass808} from './audio/bass808';
import './fm1InputBridge.css';

const KEY_CODES=[
  'KeyZ','KeyS','KeyX','KeyD','KeyC','KeyV','KeyG','KeyB','KeyH','KeyN','KeyJ','KeyM','Comma','KeyL','Period','Semicolon','Slash',
  'KeyQ','Digit2','KeyW','Digit3','KeyE','KeyR','Digit5','KeyT','Digit6','KeyY'
];

const active=new Map<string,{note:number,index:number,part:string}>();

function currentPart(){
  const text=document.querySelector<HTMLElement>('.displayHeader b')?.textContent?.trim().toUpperCase()??'';
  if(text.includes('DRUM'))return 'drum808';
  if(text.includes('BASS'))return 'bass808';
  if(text.includes('ALPHA'))return 'alpha';
  return 'mini';
}

function visualKey(index:number){
  return document.querySelector<HTMLButtonElement>(`.fm1Keybed button:nth-child(${index+1})`);
}

async function noteOn(index:number){
  const note=53+index;
  const part=currentPart();
  await workstation.start();
  if(part==='mini')workstation.miniNoteOn(note,112);
  else if(part==='alpha')workstation.alphaNoteOn(note,112);
  else if(part==='drum808')workstation.triggerDrum((index%8) as 0|1|2|3|4|5|6|7,118,false);
  else await bass808.noteOn(note,{accent:false});
  visualKey(index)?.classList.add('pc-held');
  return {note,index,part};
}

function noteOff(entry:{note:number,index:number,part:string}){
  if(entry.part==='mini')workstation.miniNoteOff(entry.note);
  else if(entry.part==='alpha')workstation.alphaNoteOff(entry.note);
  else if(entry.part==='bass808')bass808.noteOff();
  visualKey(entry.index)?.classList.remove('pc-held');
}

export function FM1InputBridge(){
  useEffect(()=>{
    const down=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;
      const index=KEY_CODES.indexOf(event.code);
      if(index<0||event.repeat||active.has(event.code))return;
      event.preventDefault();
      void noteOn(index).then(entry=>active.set(event.code,entry)).catch(console.error);
    };
    const up=(event:KeyboardEvent)=>{
      const entry=active.get(event.code);if(!entry)return;
      event.preventDefault();active.delete(event.code);noteOff(entry);
    };
    const blur=()=>{for(const entry of active.values())noteOff(entry);active.clear()};
    window.addEventListener('keydown',down);
    window.addEventListener('keyup',up);
    window.addEventListener('blur',blur);

    const cleanups:Array<()=>void>=[];
    const installKnob=(button:HTMLButtonElement)=>{
      let dragging=false;
      let moved=false;
      let lastY=0;
      let angle=-120;
      const rotate=(delta:number)=>{angle=Math.max(-135,Math.min(135,angle+delta*10));button.style.setProperty('--knob-angle',`${angle}deg`)};
      const step=(delta:number)=>{
        rotate(delta);
        button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,shiftKey:delta<0,detail:0}));
      };
      const pointerDown=(e:PointerEvent)=>{if(e.button!==0)return;dragging=true;moved=false;lastY=e.clientY;button.setPointerCapture?.(e.pointerId);button.classList.add('dragging');e.preventDefault()};
      const pointerMove=(e:PointerEvent)=>{if(!dragging)return;const dy=lastY-e.clientY;if(Math.abs(dy)<7)return;const direction=dy>0?1:-1;lastY=e.clientY;moved=true;step(direction);e.preventDefault()};
      const pointerUp=(e:PointerEvent)=>{if(!dragging)return;dragging=false;button.classList.remove('dragging');try{button.releasePointerCapture?.(e.pointerId)}catch{};if(moved)e.preventDefault()};
      const clickCapture=(e:MouseEvent)=>{if(moved&&e.detail>0){e.preventDefault();e.stopImmediatePropagation();moved=false}};
      const wheelVisual=(e:WheelEvent)=>rotate(e.deltaY<0?1:-1);
      button.addEventListener('pointerdown',pointerDown);
      button.addEventListener('pointermove',pointerMove);
      button.addEventListener('pointerup',pointerUp);
      button.addEventListener('pointercancel',pointerUp);
      button.addEventListener('click',clickCapture,true);
      button.addEventListener('wheel',wheelVisual,{passive:true});
      cleanups.push(()=>{button.removeEventListener('pointerdown',pointerDown);button.removeEventListener('pointermove',pointerMove);button.removeEventListener('pointerup',pointerUp);button.removeEventListener('pointercancel',pointerUp);button.removeEventListener('click',clickCapture,true);button.removeEventListener('wheel',wheelVisual)});
    };
    document.querySelectorAll<HTMLButtonElement>('.hardwareKnob>button').forEach(installKnob);

    return()=>{
      window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);
      for(const cleanup of cleanups)cleanup();blur();
    };
  },[]);
  return null;
}
