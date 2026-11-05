import { translate } from "@/lib/i18n";
import { marketingFaqs } from "@/data/marketingFaqs";
import { appActivities } from "@/data/appActivities";
import { appPlaces } from "@/data/appPlaces";
import { appCafes } from "@/data/appCafes";
import { appStays } from "@/data/appStays";
import { appWellness } from "@/data/appWellness";
import { getPlacePhoto } from "@/data/appPlacePhotos";
import { parseContent, type CmsPlace, type ContentPayloads, type HomeField, type LocalizedText } from "@/lib/cmsRules";

export const localized = (en: string): LocalizedText => ({ en, id: translate(en, "id"), ru: translate(en, "ru") });
const copy: Record<HomeField, string> = {
  heroEyebrow: "Electric motorcycle rental in Bali", heroTitle1: "Your Bali.", heroTitle2: "Your own ride.",
  heroIntro: "Electric motorcycles delivered to your stay. Helmets on request. Daily, weekly and monthly rates.",
  heroPrimary: "Check availability", heroSecondary: "Monthly rentals",
  fleetTitle: "Find your Bali ride.", fleetIntro: "Four electric models for different kinds of days. Compare rates, then choose the one that fits your plans.",
  monthlyEyebrow: "Stay a little longer", monthlyTitle1: "Make it your", monthlyTitle2: "everyday ride.",
  monthlyIntro: "Your coffee run, coworking commute and sunset stop. Monthly electric motorcycle rental gives your Bali routine a ride of its own.",
  monthlyCta: "Explore monthly rentals", essentialsTitle1: "The essentials.", essentialsTitle2: "Already sorted.",
  essentialsIntro: "Your rental is more than a motorcycle. Here is what comes with every Werigo ride.",
  areasTitle: "Your stay is our starting point.", areasIntro: "Arrange motorcycle delivery to your hotel or villa in eight Bali service areas. Airport handover is also available by arrangement.",
  closingTitle1: "Give your Bali plans", closingTitle2: "a ride of their own.", closingIntro: "Choose your dates. We will help with the rest.", closingCta: "Check availability",
  howTitle: "Your ride, made simple.", howIntro: "Choose your motorcycle. Set your dates. Start exploring.", howCta: "Find your ride",
  faqTitle1: "Good questions.", faqTitle2: "Clear answers.", faqIntro: "A little planning makes a better ride.",
  seoTitle: "Electric Motorcycle Rental Bali | Daily & Monthly",
  seoDescription: "Rent a Wedison electric motorcycle in Bali from Rp90,000/day. Hotel and villa delivery, helmets available on request, plus weekly and monthly rates. Check your dates.",
};
const home: ContentPayloads["home"] = {
  copy: Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, localized(value)])) as Record<HomeField, LocalizedText>,
  steps: [
    ["Choose your ride", "Compare Wedison models and choose the motorcycle that fits your plans."],
    ["Plan your rental", "Set your dates, pick-up or delivery, and any helmets you need."],
    ["Review & book", "Check your rental total and follow the checkout steps to book."],
    ["Pick up & explore", "Collect at Werigo or arrange delivery. Get a riding and charging briefing before you go."],
  ].map(([title, detail]) => ({ title: localized(title), detail: localized(detail) })),
  faqs: marketingFaqs.map(faq => ({ question: localized(faq.question), answer: localized(faq.answer) })),
};
function place(input: Partial<CmsPlace> & Pick<CmsPlace, "id" | "kind" | "name" | "area" | "description" | "website">): CmsPlace {
  const photo = getPlacePhoto(input.id);
  return { enabled: true, category: "Places", query: `${input.name} ${input.area} Bali`, tip: "", image: "", imageAlt: input.name,
    photoLabel: "", photoCredit: "", photoSource: "", imagePosition: "", neighbourhood: "", address: "", headline: "", brand: "", featured: false,
    categories: [], highlights: [], ...input,
    ...(photo ? { image: photo.src, imageAlt: photo.alt, photoCredit: photo.credit, photoSource: photo.page } : {}),
  };
}
const places: ContentPayloads["places"] = { items: [
  ...appActivities.map((p, i) => place({ ...p, id: `activity-${i + 1}`, kind: "activity" })),
  ...appPlaces.map(p => place({ ...p, kind: "place" })),
  ...appCafes.map(p => place({ ...p, kind: "cafe" })),
  ...appStays.map(p => place({ ...p, kind: "stay", category: "Where to stay", query: `${p.name} ${p.address}`, highlights: [...p.highlights] })),
  ...appWellness.map(p => place({ ...p, kind: "wellness", category: "Workout & wellness", categories: [...p.categories], highlights: [...p.highlights] })),
  place({ id: "pepito", kind: "shop", name: "Pepito Market Dewi Sri", area: "Kuta", category: "Shopping", description: "Find everyday essentials at Pepito Market Dewi Sri, or use Google Maps to find a store near your Bali base.", website: "https://pepitosupermarket.co.id/", query: "Pepito Market Dewi Sri Bali", brand: "Pepito" }),
] };
export const cmsDefaults: ContentPayloads = { home: parseContent("home", home), places: parseContent("places", places) };
