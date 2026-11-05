"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, FileText, Globe, History, MapPin, Plus, Save, X } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { cmsDefaults } from "@/data/cmsDefaults";
import { homeFields, placeKinds, placeKindLabels, parseContent, type CmsDocument, type CmsPlace, type CmsRevision, type ContentKey, type ContentPayloads, type HomeContentData, type LocalizedText } from "@/lib/cmsRules";

type Document = CmsDocument & { revisions: CmsRevision[] };
type Media = { src: string; name: string };
type Lang = "en" | "id" | "ru";
const inputClass = "w-full min-w-0 rounded-xl border border-line bg-card px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = `${buttonClass} !border-primary !bg-primary !text-white hover:!bg-primary-strong`;
const date = (value: string | null) => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Not published";
function Field({ label, value, onChange, multiline = false, max = 1000, hint }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; max?: number; hint?: string }) {
  const id = useId();
  return <label className="block space-y-2" htmlFor={id}><span className="block text-sm font-semibold">{label}</span>{multiline ? <textarea id={id} className={`${inputClass} min-h-24 resize-y`} value={value} onChange={e => onChange(e.target.value)} maxLength={max}/> : <input id={id} className={inputClass} value={value} onChange={e => onChange(e.target.value)} maxLength={max}/>}{hint && <span className="block text-xs leading-relaxed text-ink-faint">{hint}</span>}</label>;
}


export function ContentManager({ superAdmin }: { superAdmin: boolean }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [key, setKey] = useState<ContentKey>("home");
  const [draft, setDraft] = useState<ContentPayloads[ContentKey]>(() => structuredClone(cmsDefaults.home));
  const [images, setImages] = useState<Media[]>([]); const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [issues, setIssues] = useState<{path: string; message: string}[]>([]);
  const [lang, setLang] = useState<Lang>("en"); const [tab, setTab] = useState("Hero");
  const [kind, setKind] = useState<CmsPlace["kind"]>("cafe"); const [selected, setSelected] = useState("");
  const [search, setSearch] = useState(""); const [review, setReview] = useState(false); const [history, setHistory] = useState(false);
  const document = documents.find(doc => doc.key === key);
  const locked = busy || uploading;
  async function load(target: ContentKey = key) {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in to Werigo admin again." : data.message || "The CMS could not be loaded. Please try again.");
    setReady(data.ready); setDocuments(data.documents); setImages(data.images); setError(""); setIssues([]);
    const current = data.documents.find((doc: Document) => doc.key === target);
    setDraft(structuredClone(current?.draft ?? cmsDefaults[target])); setDirty(false);
    if (target === "places") setSelected((current?.draft.items ?? cmsDefaults.places.items).find((place: CmsPlace) => place.kind === kind)?.id ?? "");
  }
  useEffect(() => { void Promise.resolve().then(() => load("home")).catch(e => setError(e.message)); /* Initial async request only. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function edit(next: ContentPayloads[ContentKey]) { setDraft(next); setDirty(true); setReview(false); setIssues([]); setMessage(""); }
  function chooseDocument(value: ContentKey) {
    if (value === key) return;
    if (dirty && !window.confirm("Leave this editor and discard unsaved changes? Save a draft first to keep them.")) return;
    const current = documents.find(doc => doc.key === value); setKey(value); setDraft(structuredClone(current?.draft ?? cmsDefaults[value]));
    setDirty(false); setReview(false); setIssues([]); setError(""); setMessage(""); setHistory(false);
    if (value === "places") setSelected(((current?.draft ?? cmsDefaults.places) as ContentPayloads["places"]).items.find(place => place.kind === kind)?.id ?? "");
  }
  async function activate() {
    setBusy(true);setError("");
    try { const r = await fetch("/api/admin/content/setup", { method: "POST" }); const data = await r.json(); if (!r.ok) throw new Error(data.message || "CMS activation failed."); await load();setMessage("CMS storage activated. Your existing website is ready to edit."); }
    catch(e) {setError(e instanceof Error ? e.message : "Activation failed.");} finally {setBusy(false);}
  }
  async function save(action: "draft" | "publish" | "restore", revisionId?: string) {
    if (action === "restore" && dirty && !window.confirm("Restore this revision into the editor and replace your unsaved changes? The live page will stay as it is.")) return;
    setBusy(true); setError(""); setMessage(""); setIssues([]);
    try {
      if (action !== "restore") parseContent(key, draft, action === "publish");
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, action, version: document?.version ?? 0, ...(action === "restore" ? { revisionId } : { payload: draft }) }) });
      const data = await response.json(); if (!response.ok) {setIssues(data.issues || []); throw new Error(data.message || "Changes could not be saved.");}
      const updated = { ...data.document, revisions: data.revisions };
      setDocuments(all => [...all.filter(doc => doc.key !== key), updated]); setDraft(structuredClone(data.document.draft)); setDirty(false); setReview(false);
      setMessage(action === "publish" ? "Published. The website and app will use this version on their next page load." : action === "restore" ? "Revision restored as a draft. Review it before publishing." : "Draft saved. Your live content has not changed.");
    } catch(e) {
      const validation = e as {issues?: {path: (string | number)[]; message: string}[]};
      if (validation.issues) setIssues(validation.issues.map(issue => ({path: issue.path.join("."), message: issue.message})));
      setError(e instanceof Error ? e.message : "Changes could not be saved.");
    } finally {setBusy(false);}
  }
  const home = draft as HomeContentData;
  const collection = draft as ContentPayloads["places"];
  const place = key === "places" ? collection.items.find(item => item.id === selected) : undefined;
  function updatePlace(change: Partial<CmsPlace>) { if (place) edit({ items: collection.items.map(item => item.id === place.id ? { ...item, ...change } : item) }); }
  function newPlace() {
    const id = `${kind}-${crypto.randomUUID().slice(0,8)}`;
    const item: CmsPlace = { id, kind, enabled: false, name: "", area: "", category: kind === "cafe" ? "Café hopping" : placeKindLabels[kind], description: "", query: "", website: "", tip: "", image: "", imageAlt: "", photoLabel: "", photoCredit: "", photoSource: "", imagePosition: "", neighbourhood: "", address: "", headline: "", brand: "", featured: false, categories: kind === "wellness" ? ["Gym"] : [], highlights: [] };
    edit({ items: [...collection.items, item] });setSelected(id);setSearch("");
  }
  function movePlace(direction: number) {
    if (!place) return;
    const group = collection.items.filter(item => item.kind === place.kind); const index = group.findIndex(item => item.id === place.id); const other = group[index + direction]; if (!other) return;
    const next = [...collection.items]; const a = next.findIndex(item => item.id === place.id); const b = next.findIndex(item => item.id === other.id); [next[a],next[b]] = [next[b],next[a]]; edit({ items: next });
  }
  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) {setError("Choose a photo smaller than 5 MB.");return;}
    setUploading(true);setError("");
    try {const r = await fetch("/api/admin/content/media", {method:"POST",headers:{"Content-Type":file.type,"X-File-Name":encodeURIComponent(file.name)},body:file}); const data = await r.json();if(!r.ok)throw new Error(data.message || "Photo upload failed.");setImages(all => [data.image,...all]);updatePlace({image:data.image.src,photoCredit:"",photoSource:""});}
    catch(e){setError(e instanceof Error ? e.message : "Photo upload failed.");}finally{setUploading(false);}
  }
  function localText(value: LocalizedText) { return value[lang] || value.en; }
  const tabs = [...new Set(homeFields.map(field => field[1]))];
  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">WERIGO CONTENT STUDIO</p><h1 className="mt-2 font-display text-3xl sm:text-4xl">Make Bali yours.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">Shape the website and the places your riders discover. Edit, preview, then publish.</p></div><a href="/" target="_blank" rel="noopener noreferrer" className={buttonClass}><Globe size={16}/>View website</a></header>
    {error && <div role="alert" className="space-y-2 rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger"><p>{issues.length ? "Check the fields below before continuing." : error}</p>{issues.length > 0 && <ul className="list-inside list-disc space-y-1">{issues.slice(0,8).map((issue,i)=><li key={i}>{issue.path}: {issue.message}</li>)}</ul>}<button className="underline" onClick={()=>{if(!dirty||window.confirm("Reload the latest saved version and discard unsaved changes?"))void load().catch(e=>setError(e.message));}}>Reload latest saved version</button></div>}
    {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-faint p-4 text-sm leading-relaxed"><Check size={18} className="mt-0.5 shrink-0 text-primary"/>{message}</p>}
    {ready === null ? <p className="rounded-xl border border-line p-6 text-sm text-ink-soft">{error ? "CMS is not available right now." : "Loading your content studio…"}</p> : !ready ? <section className="rounded-2xl border border-line bg-card p-6 sm:p-8"><p className="eyebrow">FIRST-TIME SETUP</p><h2 className="mt-3 font-display text-2xl">Your content studio is ready to activate.</h2><p className="my-4 max-w-xl text-sm leading-relaxed text-ink-soft">Activation creates dedicated content, revision and image storage in the existing Werigo database. Your current content becomes the starting point.</p>{superAdmin ? <button className={primaryClass} disabled={locked} onClick={()=>void activate()}>{busy?"Activating…":"Activate CMS"}</button> : <p className="text-sm">A super admin needs to activate the CMS first.</p>}</section> : <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose content to edit">{([["home","Website content",FileText],["places","Recommended places",MapPin]] as const).map(([value,label,Icon])=><button key={value} disabled={locked} aria-pressed={key===value} onClick={()=>chooseDocument(value)} className={`${buttonClass} ${key===value?"!border-primary !bg-primary-faint !text-primary":""}`}><Icon size={17}/>{label}</button>)}<Link href="/admin/articles" className={buttonClass}><FileText size={17}/>Articles</Link></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${dirty?"bg-warn-soft text-warn":"bg-primary-faint text-primary"}`}>{dirty?"Unsaved changes":"Draft up to date"}</span><p className="mt-2 text-xs text-ink-faint">{document?.publishedAt ? `Last published ${date(document.publishedAt)}` : "Current approved content is live. No CMS version published yet."}</p></div><div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={()=>setHistory(!history)} disabled={locked}><History size={16}/>History</button><button className={buttonClass} disabled={locked} onClick={()=>void save("draft")}><Save size={16}/>{busy?"Saving…":"Save draft"}</button><button className={primaryClass} disabled={locked} onClick={()=>setReview(true)}><Eye size={16}/>Review & publish</button></div></div>
      {history && <section className="space-y-3 rounded-xl border border-line bg-card p-4"><h2 className="font-display text-lg">Version history</h2><p className="text-xs leading-relaxed text-ink-soft">Restoring puts an earlier version into your draft. Publish it separately when you are ready.</p>{!document?.revisions.length && <p className="text-sm text-ink-faint">Your first saved draft will appear here.</p>}{document?.revisions.map(revision=><div key={revision.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs"><span><strong>Version {revision.version} · {revision.event}</strong><span className="mt-1 block text-ink-faint">{date(revision.createdAt)} · {revision.actor}</span></span><button disabled={locked} className={buttonClass} onClick={()=>void save("restore",revision.id)}>Restore as draft</button></div>)}</section>}
      <fieldset disabled={locked} className="contents">{review ? <section className="space-y-6 rounded-2xl border border-primary/30 bg-card p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">PRIVATE PREVIEW</p><h2 className="mt-2 font-display text-2xl">Ready for your riders?</h2><p className="mt-2 text-sm text-ink-soft">Review this version before publishing it to the website and app.</p></div><button className={buttonClass} onClick={()=>setReview(false)}><X size={16}/>Back to editor</button></div>
        {key === "home" ? <div className="space-y-8 rounded-xl border border-line p-5 sm:p-8"><div><p className="eyebrow">{localText(home.copy.heroEyebrow)}</p><h2 className="mt-4 font-display text-4xl leading-tight">{localText(home.copy.heroTitle1)}<br/>{localText(home.copy.heroTitle2)}</h2><p className="mt-4 max-w-xl text-ink-soft">{localText(home.copy.heroIntro)}</p></div><div className="border-t border-line pt-6"><h3 className="font-display text-2xl">{localText(home.copy.howTitle)}</h3><p className="mt-2 text-sm text-ink-soft">{localText(home.copy.howIntro)}</p><ol className="mt-5 grid gap-4 sm:grid-cols-2">{home.steps.map((step,i)=><li key={i} className="rounded-xl bg-sunken p-4"><span className="text-xs font-semibold text-primary">0{i+1}</span><h4 className="mt-2 font-semibold">{localText(step.title)}</h4><p className="mt-2 text-sm leading-relaxed text-ink-soft">{localText(step.detail)}</p></li>)}</ol></div><div className="rounded-xl bg-sunken p-4"><p className="text-xs text-ink-faint">Google search preview</p><p className="mt-2 text-lg text-primary">{home.copy.seoTitle.en}</p><p className="mt-1 text-sm text-ink-soft">{home.copy.seoDescription.en}</p></div></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{collection.items.filter(p=>p.enabled).map(p=><article className="overflow-hidden rounded-xl border border-line" key={p.id}>{p.image && <div className="relative aspect-[16/10] bg-sunken"><Image src={p.image} alt={p.imageAlt} fill unoptimized sizes="400px" className="object-cover"/></div>}<div className="space-y-2 p-4"><p className="text-xs font-semibold text-primary">{placeKindLabels[p.kind]} · {p.area}</p><h3 className="font-display text-lg">{p.name||"Untitled place"}</h3><p className="text-sm leading-relaxed text-ink-soft">{p.description}</p></div></article>)}</div>}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5"><button disabled={locked} className={primaryClass} onClick={()=>void save("publish")}><Globe size={16}/>{busy?"Publishing…":"Publish changes"}</button><button className={buttonClass} disabled={locked} onClick={()=>void save("draft")}>Save draft instead</button>{!dirty && <Link href={`/admin/content/preview?document=${key}`} target="_blank" className={buttonClass}>Open full-page draft preview</Link>}</div>
      </section> : key === "home" ? <section className="min-w-0 rounded-2xl border border-line bg-card p-4 sm:p-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2" role="group" aria-label="Website content section">{tabs.map(value=><button key={value} aria-pressed={tab===value} className={`${buttonClass} ${tab===value?"!bg-primary-faint !border-primary !text-primary":""}`} onClick={()=>setTab(value)}>{value}</button>)}</div><label className="flex items-center gap-2 text-xs font-semibold">Language<select aria-label="Content language" className={inputClass} value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="en">English</option><option value="id">Indonesia</option><option value="ru">Русский</option></select></label></div>
        <p className="mb-6 text-xs leading-relaxed text-ink-faint">English is the main language. Empty Indonesian or Russian fields use English. The opening video is preserved.</p>
        <div className="grid gap-5 lg:grid-cols-2">{homeFields.filter(([,group])=>group===tab).map(([name,,label,max])=><Field key={name} label={label} value={home.copy[name][lang]} multiline={max>200} max={max} hint={`${home.copy[name][lang].length}/${max} characters`} onChange={value=>edit({...home,copy:{...home.copy,[name]:{...home.copy[name],[lang]:value}}})}/>)}</div>
        {tab === "Booking guide" && <div className="mt-8 grid gap-5 border-t border-line pt-6 md:grid-cols-2">{home.steps.map((step,i)=><fieldset key={i} className="space-y-4 rounded-xl bg-sunken p-4"><legend className="px-1 text-sm font-semibold">Step {i+1}</legend><Field label="Step title" value={step.title[lang]} max={80} onChange={value=>edit({...home,steps:home.steps.map((s,n)=>n===i?{...s,title:{...s.title,[lang]:value}}:s)})}/><Field label="Description" value={step.detail[lang]} max={350} multiline onChange={value=>edit({...home,steps:home.steps.map((s,n)=>n===i?{...s,detail:{...s.detail,[lang]:value}}:s)})}/></fieldset>)}</div>}
        {tab === "FAQ" && <div className="mt-8 space-y-5 border-t border-line pt-6">{home.faqs.map((faq,i)=><fieldset key={i} className="space-y-4 rounded-xl bg-sunken p-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">Question {i+1}</span><button type="button" disabled={home.faqs.length===1} className="text-xs font-semibold text-danger disabled:opacity-40" onClick={()=>edit({...home,faqs:home.faqs.filter((_,n)=>n!==i)})}>Remove</button></div><Field label="Question" value={faq.question[lang]} max={180} onChange={value=>edit({...home,faqs:home.faqs.map((f,n)=>n===i?{...f,question:{...f.question,[lang]:value}}:f)})}/><Field label="Answer" value={faq.answer[lang]} max={1500} multiline onChange={value=>edit({...home,faqs:home.faqs.map((f,n)=>n===i?{...f,answer:{...f.answer,[lang]:value}}:f)})}/></fieldset>)}<button className={buttonClass} disabled={home.faqs.length>=15} onClick={()=>edit({...home,faqs:[...home.faqs,{question:{en:"New question",id:"",ru:""},answer:{en:"Add your answer here.",id:"",ru:""}}]})}><Plus size={16}/>Add question</button></div>}
      </section> : <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="space-y-3 rounded-2xl border border-line bg-card p-4"><label className="block text-xs font-semibold">Place category<select className={`${inputClass} mt-2`} value={kind} onChange={e=>{const value=e.target.value as CmsPlace["kind"];setKind(value);setSelected(collection.items.find(item=>item.kind===value)?.id??"");setSearch("");}}>{placeKinds.map(value=><option key={value} value={value}>{placeKindLabels[value]}</option>)}</select></label><input aria-label="Search recommended places" className={inputClass} placeholder="Search place or area" value={search} onChange={e=>setSearch(e.target.value)}/><button className={`${primaryClass} w-full`} onClick={newPlace}><Plus size={16}/>Add place</button><div className="max-h-[560px] space-y-2 overflow-y-auto">{collection.items.filter(item=>item.kind===kind&&`${item.name} ${item.area}`.toLowerCase().includes(search.toLowerCase())).map(item=><button key={item.id} className={`w-full rounded-xl border p-3 text-left ${selected===item.id?"border-primary bg-primary-faint":"border-line"}`} onClick={()=>setSelected(item.id)}><span className="block text-sm font-semibold">{item.name||"New place"}</span><span className="mt-1 block text-xs text-ink-faint">{item.area||"Add an area"} · {item.enabled?"Included":"Hidden"}</span></button>)}</div></aside>
        {place ? <section className="min-w-0 space-y-6 rounded-2xl border border-line bg-card p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{placeKindLabels[place.kind]}</p><h2 className="mt-2 font-display text-2xl">{place.name||"New place"}</h2></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={place.enabled} onChange={e=>updatePlace({enabled:e.target.checked})}/>Include when published</label></div>
          <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={()=>movePlace(-1)} aria-label="Move place earlier"><ArrowUp size={15}/>Earlier</button><button className={buttonClass} onClick={()=>movePlace(1)} aria-label="Move place later"><ArrowDown size={15}/>Later</button><span className="self-center text-xs text-ink-faint">Saved ID: {place.id}</span></div>
          <div className="grid gap-5 md:grid-cols-2"><Field label="Place name" value={place.name} max={150} onChange={name=>updatePlace({name})}/><Field label="Area" value={place.area} max={160} onChange={area=>updatePlace({area})}/><Field label="Category label" value={place.category} max={80} onChange={category=>updatePlace({category})}/><Field label="Neighbourhood" value={place.neighbourhood} max={160} onChange={neighbourhood=>updatePlace({neighbourhood})}/></div>
          <Field label="Why visit?" value={place.description} multiline max={1200} onChange={description=>updatePlace({description})}/><Field label="Visitor tip" value={place.tip} multiline max={500} onChange={tip=>updatePlace({tip})}/>
          <MediaPicker images={images} value={place.image} alt={place.imageAlt} disabled={locked} onSelect={image=>updatePlace({image,photoCredit:"",photoSource:""})} onUpload={upload}/>
          <Field label="Image description (alt text)" value={place.imageAlt} max={200} onChange={imageAlt=>updatePlace({imageAlt})}/><div className="grid gap-5 md:grid-cols-2"><Field label="Photo credit" value={place.photoCredit} max={200} onChange={photoCredit=>updatePlace({photoCredit})}/><Field label="Photo source URL" value={place.photoSource} onChange={photoSource=>updatePlace({photoSource})}/><Field label="Official website" value={place.website} onChange={website=>updatePlace({website})}/><Field label="Google Maps search / address" value={place.query} max={500} hint="Use the exact branch name and address." onChange={query=>updatePlace({query})}/></div>
          {(place.kind === "stay" || place.kind === "wellness") && <div className="grid gap-5 border-t border-line pt-5 md:grid-cols-2"><Field label="Brand" value={place.brand} max={100} onChange={brand=>updatePlace({brand})}/><Field label="Short headline" value={place.headline} max={180} onChange={headline=>updatePlace({headline})}/><Field label="Street address" value={place.address} max={400} onChange={address=>updatePlace({address})}/><Field label="Highlights, one per line" value={place.highlights.join("\n")} multiline max={800} onChange={value=>updatePlace({highlights:value.split("\n").filter(Boolean)})}/></div>}
          {place.kind === "wellness" && <fieldset className="space-y-3"><legend className="text-sm font-semibold">Workout & wellness categories</legend><div className="flex flex-wrap gap-3">{["Gym","Pilates","Yoga","Recovery","Wellness"].map(value=><label key={value} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" checked={place.categories.includes(value)} onChange={e=>updatePlace({categories:e.target.checked?[...place.categories,value]:place.categories.filter(v=>v!==value)})}/>{value}</label>)}</div></fieldset>}
        </section> : <p className="rounded-xl border border-dashed border-line p-8 text-sm text-ink-faint">Choose a place or add your first recommendation.</p>}
      </div>}
      </fieldset><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><p className="max-w-lg text-xs leading-relaxed text-ink-faint">{uploading?"Uploading photo…":"Drafts are private. Publishing updates editorial content; rental rates and payment settings are managed separately."}</p><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={locked} onClick={()=>void save("draft")}><Save size={16}/>Save draft</button><button className={primaryClass} disabled={locked} onClick={()=>setReview(true)}><Eye size={16}/>Review & publish</button></div></footer>
    </>}
  </div>;
}
