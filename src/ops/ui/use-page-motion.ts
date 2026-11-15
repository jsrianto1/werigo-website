"use client";
import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';

type PageTransition={finished:Promise<void>;skipTransition:()=>void};
type TransitionDocument=Document & {startViewTransition?:(update:()=>void)=>PageTransition};

// Pointer navigation crossfades one visible workspace snapshot. Keyboard and
// reduced-motion navigation stay immediate, with a CSS-only older-browser fallback.
export function usePageMotion(){
  const [mode,setMode]=useState('enter');
  const keyboard=useRef(false),current=useRef<PageTransition|null>(null);
  useEffect(()=>{
    const key=()=>{keyboard.current=true;},pointer=()=>{keyboard.current=false;};
    window.addEventListener('keydown',key,true);window.addEventListener('pointerdown',pointer,true);
    return()=>{window.removeEventListener('keydown',key,true);window.removeEventListener('pointerdown',pointer,true);current.current?.skipTransition();};
  },[]);
  function navigate(update:()=>void){
    current.current?.skipTransition();
    const doc=document as TransitionDocument;
    if(keyboard.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setMode('instant');update();return;}
    if(doc.startViewTransition){
      try{
        const transition=doc.startViewTransition(()=>flushSync(()=>{setMode('native');update();}));
        current.current=transition;
        void transition.finished.catch(()=>{}).finally(()=>{if(current.current===transition)current.current=null;});
        return;
      }catch{/* Keep navigation available when a browser declines a snapshot. */}
    }
    setMode('enter');update();
  }
  return {navigate,mode};
}
