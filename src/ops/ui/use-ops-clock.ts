'use client';
import {useEffect,useState} from 'react';
// One stable initial value per component; refresh time outside render.
export function useOpsClock(){const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);return now;}
