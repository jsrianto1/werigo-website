import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { appGuides } from "@/data/appGuides";
export function generateStaticParams() { return appGuides.map(guide => ({slug:guide.slug})); }
export default async function GuidePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const guide=appGuides.find(item=>item.slug===slug);
  if(!guide) notFound();
  return <><Link href="/app/explore" className="ra-back"><ArrowLeft size={17}/>All guides</Link><section className="ra-detail-hero"><Image src={guide.image} alt={`${guide.area}, Bali`} fill sizes="(max-width:1100px) 100vw,1100px" preload className="ra-cover"/></section><div className="ra-detail-body"><p className="ra-eyebrow">{guide.category} · {guide.area} area guide</p><h1>{guide.title}</h1><p className="ra-lead">{guide.summary}</p><h2>A few places to start</h2><ol className="ra-stops">{guide.stops.map((stop,index)=><li key={stop}><span>{index+1}</span><div><h3>{stop}</h3><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop}, Bali`)}`} target="_blank" rel="noopener noreferrer">Find on Maps <ArrowUpRight size={15}/></a></div></li>)}</ol><aside className="ra-note"><MapPin size={21}/><p>{guide.tip} Confirm the route and current conditions before setting off. Charging is not confirmed at these stops.</p></aside><Link className="ra-button" href={`/book?pickup=${guide.slug}`}>Find a ride for this area <ArrowUpRight size={18}/></Link><p className="ra-footnote">Stop suggestions, not turn-by-turn directions. Locations are not represented as Werigo merchants or charging partners.</p><Link className="ra-text-link" href={`/delivery-areas/${guide.slug}`}>Delivery information <ArrowUpRight size={17}/></Link></div></>;
}
