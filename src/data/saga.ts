/**
 * WERIGO SAGA, the Werigo webtoon. Single source for the series page,
 * the episode reader, the homepage teaser, the sitemap and JSON-LD.
 *
 * Page images live in public/media/saga/ep-<n>/p<NN>.webp and are
 * exported (with sagaPages.json and sagaTranscripts.json) by
 * instagram/source-html/export-saga-web.py and export-saga-transcripts.py
 * in the Werigo OneDrive workspace. To hold an episode back, set
 * published: false; it disappears from every surface and its route 404s.
 */
import pages from "./sagaPages.json";
import transcripts from "./sagaTranscripts.json";

export type SagaModel = "athena" | "victory" | "edpower" | "bees";

export interface SagaEpisode {
  number: number;
  slug: string;
  title: string;
  logline: string;
  featuredModels: SagaModel[];
  published: boolean;
}

export interface SagaPageImage {
  src: string;
  width: number;
  height: number;
}

export interface SagaTranscriptBeat {
  label: string;
  text: string;
  lines: { who: string; text: string }[];
}

export interface SagaCharacter {
  id: string;
  name: string;
  role: string;
  about: string;
  model: SagaModel | null;
  modelNote?: string;
}

export const saga = {
  title: "WERIGO SAGA",
  tagline: "A Bali webtoon about the day the ride changed.",
  synopsis: [
    "Arya delivers food across Denpasar on a petrol bike that barely starts. The night he switches to an olive Wedison Athena, a System only he can see starts handing him quests.",
    "It turns out he is not the only one. There is a guild of riders, a storm that shuts the island's petrol stations, and a best friend who wants in. Every bike you see in the story is a real Wedison you can rent from us.",
  ],
  instagram: "https://www.instagram.com/werigo.official/",
  disclaimer:
    "WERIGO SAGA is fiction. The System, the auras and the flood scenes are made up. The bikes, the charging and the rental service are real. Always wear a helmet, ride within your licence and never ride through floodwater.",
};

const allEpisodes: SagaEpisode[] = [
  {
    number: 1,
    slug: "episode-1",
    title: "The Weakest Rider",
    logline:
      "Arya starts his day at 4:58 AM on a petrol bike that will not start. By midnight he has a new ride and a System only he can see.",
    featuredModels: ["athena"],
    published: true,
  },
  {
    number: 2,
    slug: "episode-2",
    title: "The First Quest",
    logline:
      "One working day on the Athena: thirty five orders, a sick child on the other side of town, a grandmother's blessing and a rival on a loud sportbike.",
    featuredModels: ["athena"],
    published: true,
  },
  {
    number: 3,
    slug: "episode-3",
    title: "The Raid",
    logline:
      "A storm shuts every petrol station on the Bukit. Forty medical kits, one clinic, forty five minutes, and Komang is stuck in the flood.",
    featuredModels: ["athena", "edpower"],
    published: true,
  },
  {
    number: 4,
    slug: "episode-4",
    title: "The Second Awakening",
    logline:
      "Komang finds the guild, and the guild has a day job. Three rental deliveries before 10:00 decide whether he awakens.",
    featuredModels: ["bees", "victory", "athena", "edpower"],
    published: true,
  },
];

export const characters: SagaCharacter[] = [
  {
    id: "arya",
    name: "Arya",
    role: "The Silent Rider",
    about: "Delivery rider from Denpasar. Tired, broke and kind. The first one to awaken.",
    model: "athena",
  },
  {
    id: "komang",
    name: "Komang",
    role: "Pathfinder",
    about: "Arya's best friend since primary school. Loud, loyal and done pushing his late father's petrol bike.",
    model: "victory",
  },
  {
    id: "sekar",
    name: "Sekar",
    role: "Rank C",
    about: "Calm, sharp and quietly soft. She saw something in Arya before anyone else did.",
    model: "athena",
  },
  {
    id: "dewa",
    name: "Dewa",
    role: "Rank A, guild master",
    about: "Gruff and fair. Runs the guild, and the guild runs a rental crew in Canggu.",
    model: "edpower",
  },
  {
    id: "chloe",
    name: "Chloe",
    role: "The Visitor",
    about: "Designer from Melbourne on her first Bali trip. Right now she is sunburnt and stuck in a petrol queue.",
    model: null,
    modelNote: "Her ride arrives in Episode 5",
  },
  {
    id: "bayu",
    name: "Bayu",
    role: "The Rival",
    about: "Fast, loud and always one fuel stop away from trouble.",
    model: null,
    modelNote: "Still on petrol",
  },
];

export const modelNames: Record<SagaModel, string> = {
  athena: "Wedison Athena",
  victory: "Wedison Victory",
  edpower: "Wedison EdPower",
  bees: "Wedison Bees",
};

type PagesManifest = Record<string, { pages: number; width: number; heights: number[] }>;
type TranscriptManifest = Record<string, SagaTranscriptBeat[]>;

export function getEpisodes(): SagaEpisode[] {
  return allEpisodes.filter((e) => e.published);
}

export function getEpisode(slug: string): SagaEpisode | undefined {
  return getEpisodes().find((e) => e.slug === slug);
}

export function getNeighbours(episode: SagaEpisode) {
  const list = getEpisodes();
  const i = list.findIndex((e) => e.slug === episode.slug);
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

export function getPages(episode: SagaEpisode): SagaPageImage[] {
  const entry = (pages as PagesManifest)[String(episode.number)];
  if (!entry) return [];
  return entry.heights.map((height, i) => ({
    src: `/media/saga/ep-${episode.number}/p${String(i + 1).padStart(2, "0")}.webp`,
    width: entry.width,
    height,
  }));
}

export function getTranscript(episode: SagaEpisode): SagaTranscriptBeat[] {
  return (transcripts as TranscriptManifest)[String(episode.number)] ?? [];
}

export function coverSrc(episode: SagaEpisode) {
  return `/media/saga/covers/ep-${episode.number}.webp`;
}

export function ogSrc(episode: SagaEpisode) {
  return `/media/saga/covers/ep-${episode.number}-og.jpg`;
}

export function totalPages(): number {
  return getEpisodes().reduce((sum, e) => sum + getPages(e).length, 0);
}

/** Trailer: Episode 1 as a motion comic (vertical). Flip available when the files exist. */
export const trailer = {
  available: true,
  mp4: "/media/saga/trailer/werigo-saga-ep1-motion.mp4",
  poster: "/media/saga/trailer/werigo-saga-ep1-motion-poster.webp",
  width: 720,
  height: 1280,
};
