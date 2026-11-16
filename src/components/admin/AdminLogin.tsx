"use client";
import {LanguageProvider} from '@/ops/ui/language';
import {Login} from '@/ops/ui/login';
export function AdminLogin(){return <div className="werigo-ops"><LanguageProvider><Login initialMode="website"/></LanguageProvider></div>;}
