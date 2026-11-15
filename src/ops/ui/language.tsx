"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import {DEFAULT_LANGUAGE,LANGUAGE_STORAGE_KEY,translate,type Language} from "@/ops/lib/language";
import {fmtDate} from "@/ops/lib/domain";
const LanguageContext=createContext<{language:Language;setLanguage:(v:Language)=>void}>({language:DEFAULT_LANGUAGE,setLanguage:()=>{}});
export function LanguageProvider({children}:{children:ReactNode}){
 const[language,setLanguage]=useState<Language>(DEFAULT_LANGUAGE);
 useEffect(()=>{try{const saved=localStorage.getItem(LANGUAGE_STORAGE_KEY);if(saved==="en"||saved==="id")setLanguage(saved);}catch{}},[]);
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 function choose(value:Language){setLanguage(value);try{localStorage.setItem(LANGUAGE_STORAGE_KEY,value);}catch{}}
 return <LanguageContext.Provider value={{language,setLanguage:choose}}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){const {language,setLanguage}=useContext(LanguageContext);return {language,setLanguage,t:(text:string,vars?:Record<string,string|number>)=>translate(language,text,vars),formatDate:(ms:number,short=false)=>fmtDate(ms,short,language)};}
export function LanguageSelect(){const{language,setLanguage,t}=useLanguage();return <label className="language-select"><span className="language-symbol" aria-hidden="true">A<span>文</span></span><select aria-label={t("Bahasa aplikasi")} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en">English</option><option value="id">Bahasa Indonesia</option></select></label>;}
