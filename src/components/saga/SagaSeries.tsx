"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Film, Search, ChevronDown } from "lucide-react";
import { ContinueButton, EpisodeStatus } from "@/components/saga/SagaProgressUI";
import { SagaBikeCard } from "@/components/saga/SagaBikeCard";
import { LangToggle, StatLine } from "@/components/saga/SagaSocial";
import { characters, coverSrc, getEpisodes, getPages, modelNames, saga, totalPages, trailer, type SagaEpisode } from "@/data/saga";
import { sagaUi } from "@/data/sagaUi";
import { useSagaLang } from "@/lib/useSagaLang";
import styles from "./SagaSeries.module.css";

const arcs = [
  { en: "All chapters", id: "Semua chapter", min: 1, max: Infinity },
  { en: "The first awakening", id: "Awal kebangkitan", min: 1, max: 8 },
  { en: "Building the network", id: "Membangun jaringan", min: 9, max: 15 },
  { en: "The island’s mysteries", id: "Misteri pulau", min: 16, max: Infinity },
];
export function SagaSeries() {
  const lang = useSagaLang(), id = lang === "id", t = sagaUi[lang];
  const [arc, setArc] = useState(0), [query, setQuery] = useState(""), [order, setOrder] = useState("asc");
  const episodes = getEpisodes(), latest = episodes[episodes.length - 1];
  const title = (e: SagaEpisode) => id ? e.titleId : e.title;
  const q = query.trim().toLocaleLowerCase();
  const filtered = episodes.filter(e => e.number >= arcs[arc].min && e.number <= arcs[arc].max && (!q || `${e.number} ${e.title} ${e.titleId} ${e.logline} ${e.loglineId}`.toLocaleLowerCase().includes(q)));
  const shown = order === "desc" ? [...filtered].reverse() : filtered;
  const recent = episodes.filter(e => e.number >= 21);
  const castPhoto = (key: string) => ["ody", "arya", "atum", "raeh", "ira"].includes(key) ? `/media/saga/reboot-20261027/${key}-portrait.webp` : `/media/saga/characters/${key}.webp`;
  return <div className={styles.series}>
    <section className={styles.hero} aria-labelledby="saga-title">
      <div className={styles.heroArt} aria-hidden="true"><Image src="/media/saga/reboot-20261027/keyart.webp" alt="" fill priority sizes="(min-width: 900px) 70vw, 100vw" /></div>
      <div className={styles.heroShade} />
      <div className={styles.heroBody}>
        <div className={styles.eyebrow}><span /> WERIGO ORIGINAL WEBTOON <LangToggle /></div>
        <h1 id="saga-title" className={styles.wordmark}>WERIGO<br /><span>SAGA</span></h1>
        <p className={styles.heroLine}>{id ? <>Di Bali, setiap jalan<br />punya cerita.</> : <>In Bali, every road<br />has another story.</>}</p>
        <p className={styles.heroCopy}>{id ? "Dari pesanan pertama Arya sampai rahasia di balik pintu yang salah. Persahabatan, hidup di Bali, dan keberanian membangun sesuatu yang nyata." : "From Arya’s first delivery to the secrets behind the wrong door. Friendship, island life, and the courage to build something real."}</p>
        <div className={styles.actions}><ContinueButton episodes={episodes} /><Link className={styles.ghost} href={`/saga/${latest.slug}?lang=${lang}`}>{id ? "Baca chapter terbaru" : "Read the latest"}<ArrowRight size={17} /></Link></div>
        <p className={styles.heroFacts}><BookOpen size={15} /> {episodes.length} {t.statEpisodes.toLowerCase()} <i /> {totalPages()} {t.pages} <i /> {id ? "Gratis · ID / EN" : "Free · EN / ID"}</p>
      </div>
      <a className={styles.explore} href="#chapters">{id ? "Jelajahi ceritanya" : "Explore the story"}<ChevronDown size={18} /></a>
    </section>

    <div className={styles.inner}>
      <section className={styles.latest} aria-labelledby="latest-heading">
        <div className={styles.sectionHead}><div><p className={styles.kicker}>{id ? "KISAH TERBARU" : "THE LATEST STORY"}</p><h2 id="latest-heading">{id ? "Ada yang salah\ndi Bale Sore.".split("\n").map((s,i)=><span key={s}>{i>0&&<br />}{s}</span>) : <>Something is wrong<br />at Bale Sore.</>}</h2></div><p>{id ? "Sebuah video dari besok. Tamu yang belum pernah memberi ulasan. Dan satu kamar yang tak mau melepas malam." : "A video from tomorrow. A guest who never wrote the review. And a room that refuses to let the night end."}</p></div>
        <div className={styles.latestGrid}>{recent.map(e=><Link key={e.slug} href={`/saga/${e.slug}?lang=${lang}`} className={styles.feature}>
          <div className={styles.featureArt}><Image src={coverSrc(e)} alt={title(e)} fill sizes="(min-width: 900px) 45vw, 92vw" /><span className={styles.featureNumber}>CH.{e.number}</span></div>
          <div className={styles.featureCopy}><p className={styles.kicker}>{getPages(e).length} {t.pages} · ID / EN</p><h3>{title(e)}</h3><p>{id?e.loglineId:e.logline}</p><span className={styles.readLink}>{t.readEp(e.number)}<ArrowRight size={19}/></span></div>
        </Link>)}</div>
      </section>

      <section id="chapters" className={styles.library} aria-labelledby="chapters-heading">
        <div className={styles.sectionHead}><div><p className={styles.kicker}>{id ? "PERJALANANNYA DIMULAI DI SINI" : "THE JOURNEY STARTS HERE"}</p><h2 id="chapters-heading">{t.allEpisodes}</h2></div><p>{id ? "Ikuti dari awal, atau kembali ke bagian favoritmu." : "Follow it from the start, or return to your favourite part."}</p></div>
        <div className={styles.libraryTools}><div className={styles.arcTabs} role="group" aria-label={id?"Pilih alur cerita":"Choose story arc"}>{arcs.map((a,i)=><button key={a.en} type="button" aria-pressed={arc===i} onClick={()=>setArc(i)}>{id?a.id:a.en}</button>)}</div>
          <div className={styles.find}><label className={styles.search}><Search size={17} aria-hidden="true"/><span className="sr-only">{id?"Cari chapter":"Search chapters"}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={id?"Cari judul atau cerita…":"Find a title or story…"}/></label><label className={styles.sort}><span className="sr-only">{id?"Urutan chapter":"Chapter order"}</span><select value={order} onChange={e=>setOrder(e.target.value)}><option value="asc">{id?"Dari awal":"Oldest first"}</option><option value="desc">{id?"Terbaru dulu":"Newest first"}</option></select></label></div>
        </div>
        <p className={styles.resultCount} aria-live="polite">{shown.length} {id?"chapter":"chapters"}{q?` · “${query.trim()}”`:""}</p>
        {shown.length?<ol className={styles.chapterGrid}>{shown.map(e=><li key={e.slug}><Link href={`/saga/${e.slug}?lang=${lang}`} className={styles.chapter}>
          <div className={styles.chapterArt}><Image src={coverSrc(e)} alt={`${t.episode} ${e.number}: ${title(e)}`} width={640} height={640} sizes="(min-width: 1100px) 30vw, (min-width: 600px) 45vw, 92vw" /><span>{String(e.number).padStart(2,"0")}</span>{e.number===latest.number&&<b>{t.newestTag}</b>}</div>
          <div className={styles.chapterBody}><div className={styles.chapterMeta}>CHAPTER {e.number}<span>{getPages(e).length} {t.pages}</span></div><h3>{title(e)}</h3><p>{id?e.loglineId:e.logline}</p><div className={styles.chapterBottom}><StatLine slug={e.key}/><EpisodeStatus slug={e.key}/><ArrowRight size={18}/></div></div>
        </Link></li>)}</ol>:<div className={styles.empty}><p>{id?"Belum ada chapter yang cocok dengan pencarianmu.":"No chapters match your search."}</p><button onClick={()=>{setQuery("");setArc(0);}} type="button">{id?"Tampilkan semua chapter":"Show all chapters"}</button></div>}
      </section>

      <section className={styles.cast} aria-labelledby="cast-heading"><div className={styles.sectionHead}><div><p className={styles.kicker}>{id?"ORANG-ORANG DI BALIK PERJALANAN":"THE PEOPLE BEHIND THE JOURNEY"}</p><h2 id="cast-heading">{t.cast}</h2></div><p>{id?"Ada yang menemukan jalannya. Ada yang membantu orang lain sampai.":"Some find their way. Others help everyone else get there."}</p></div>
        <ul className={styles.castGrid}>{characters.filter(c=>c.id!=="bayu").map(c=><li key={c.id}><Image src={castPhoto(c.id)} alt={c.name} width={144} height={144} sizes="100px"/><div><h3>{c.name}</h3><p className={styles.castRole}>{id?c.roleId:c.role}</p><p>{id?c.aboutId:c.about}</p>{c.model&&<Link href={`/fleet/${c.model}`}>{modelNames[c.model]}<ArrowRight size={13}/></Link>}</div></li>)}</ul>
      </section>

      {trailer.available&&<section className={styles.trailer} aria-labelledby="trailer-heading"><div><p className={styles.kicker}><Film size={15}/> MOTION COMIC</p><h2 id="trailer-heading">{id?<>Sebelum semua ini,<br />ada satu pengendara.</>:<>Before all this,<br />there was one rider.</>}</h2><p>{t.watchBody}</p><Link className={styles.readLink} href={`/saga/chapter-1?lang=${lang}`}>{t.readEp(1)}<ArrowRight size={18}/></Link></div><video controls playsInline preload="none" poster={trailer.poster} width={trailer.width} height={trailer.height} aria-label="WERIGO SAGA Chapter 1 motion comic"><source src={trailer.mp4} type="video/mp4"/></video></section>}

      <section className={styles.real} aria-labelledby="real-heading"><div><p className={styles.kicker}>{id?"DARI CERITA KE JALANAN BALI":"FROM THE STORY TO BALI’S STREETS"}</p><h2 id="real-heading">{id?<>Ceritanya fiksi.<br />Motornya nyata.</>:<>The story is fiction.<br />The rides are real.</>}</h2><p>{id?"Athena, EdPower, Victory, dan Bees adalah motor listrik WEDISON yang tersedia dalam armada WERIGO. Kenali modelnya dan pilih perjalananmu sendiri.":"Athena, EdPower, Victory and Bees are real WEDISON electric motorcycles in the WERIGO fleet. Meet the models and choose your own journey."}</p><div className={styles.actions}><Link className={styles.primary} href="/fleet">{t.seeFleet}<ArrowRight size={18}/></Link><Link className={styles.ghost} href="/book">{t.book}</Link></div></div><ul className={styles.bikeGrid}>{(["athena","edpower","victory","bees"] as const).map(m=><li key={m}><SagaBikeCard model={m}/></li>)}</ul></section>
      <p className={styles.disclaimer}>{id?saga.disclaimerId:saga.disclaimer}</p>
    </div>
  </div>;
}
