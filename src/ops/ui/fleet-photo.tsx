"use client";
import {Bike} from './icons';
import {fleetColorImage} from '@/ops/lib/fleet-colors';
import {MODEL_NAMES} from '@/ops/lib/domain';
import {useLanguage} from './language';
export function FleetPhoto({model,color,catalog=false,alt}:{model:string;color?:string;catalog?:boolean;alt?:string}){
 const {language}=useLanguage(),src=fleetColorImage(model,color,catalog);
 return src?<img src={src} alt={alt??`Wedison ${MODEL_NAMES[model]||model} ${color||''}`} loading="lazy"/>:<span className="fleet-image-pending"><Bike size={34}/><small>{language==='en'?'Colour photo to confirm':'Foto warna perlu konfirmasi'}</small></span>;
}
