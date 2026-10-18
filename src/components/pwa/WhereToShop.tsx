import Link from "next/link";
import { ArrowRight, ArrowUpRight, ExternalLink, ShoppingBag } from "lucide-react";
import { googleMapsSearch } from "@/lib/appPickup";
import { PlacePhoto } from "./PlacePhoto";
import { PlacePhotoCredits } from "./PlacePhotoCredits";
import { ExploreGuideNav } from "./ExploreGuideNav";
import { NearbyPlaces } from "./NearbyPlaces";

/** Area searches deliberately avoid claiming individual branch inventory or opening hours. */
const areas = ["Canggu", "Seminyak", "Ubud", "Sanur", "Jimbaran", "Uluwatu", "Denpasar"];
export function WhereToShop() {
  return <section className="wr-explore wg-shop"><p className="wr-kicker">WHERE WE GO?</p><h1 className="ra-page-title">Where to shop?</h1><p className="ra-lead">Your everyday island essentials, one easy stop away.</p><ExploreGuideNav/>
    <div className="wg-partner-intro"><span className="wg-guide-emblem"><ShoppingBag size={28}/></span><div><p className="wg-overline">OUR PARTNER · PEPITO</p><h2>Stock up.<br/>Settle into Bali.</h2><p>From a snack stop to your next grocery run. Find a Pepito store for the everyday essentials that make a Bali stay feel like home.</p><a href="https://pepitosupermarket.co.id/" target="_blank" rel="noopener noreferrer">Pepito official website<ArrowUpRight size={16}/></a></div></div>
    <figure className="wg-shop-photo"><PlacePhoto id="pepito" label="PEPITO MARKET"/><figcaption>Pepito Market Dewi Sri. Find the store closest to your Bali base.</figcaption></figure>
    <NearbyPlaces search="Pepito supermarket" label="Pepito stores"/>
    <section className="wg-shop-areas" aria-labelledby="shop-areas"><h2 id="shop-areas">Where are you exploring?</h2><p>Search Pepito options around your Bali base. Google Maps shows the current stores, distance and opening hours.</p><div>{areas.map(area => <a key={area} href={googleMapsSearch(`Pepito supermarket near ${area} Bali`)} target="_blank" rel="noopener noreferrer"><ShoppingBag size={19}/><span>{area}</span><ArrowUpRight size={17}/></a>)}</div></section>
    <div className="wg-guide-note"><h2>A quick stop before your next plan.</h2><p>Check the store listing before travelling. Product availability and prices vary by branch. This partner listing does not include a Werigo discount or guarantee a charging station.</p><a href={googleMapsSearch("shopping malls markets boutiques in Bali")} target="_blank" rel="noopener noreferrer">Explore more Bali shopping<ExternalLink size={15}/></a></div>
    <PlacePhotoCredits ids={["pepito"]}/>
    <Link className="ra-button" href="/app/rent">Find your everyday ride<ArrowRight size={18}/></Link>
  </section>;
}
