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

export type SagaModel = "athena" | "victory" | "edpower" | "bees";

export interface SagaEpisode {
  number: number;
  slug: string;
  title: string;
  titleId: string;
  logline: string;
  loglineId: string;
  featuredModels: SagaModel[];
  published: boolean;
}

export interface SagaPageImage {
  src: string;
  width: number;
  height: number;
}

export interface SagaCharacter {
  id: string;
  name: string;
  role: string;
  roleId: string;
  about: string;
  aboutId: string;
  model: SagaModel | null;
  modelNote?: string;
  modelNoteId?: string;
}

export const saga = {
  title: "WERIGO SAGA",
  tagline: "A Bali webtoon about the day the ride changed.",
  taglineId: "Webtoon dari Bali tentang hari ketika perjalanan berubah.",
  synopsis: [
    "Arya delivers food across Denpasar on a petrol bike that barely starts. The night he switches to an olive Wedison Athena, a System only he can see starts handing him quests.",
    "It turns out he is not the only one. There is a guild of riders, a storm that shuts the island's petrol stations, and a best friend who wants in. Every bike you see in the story is a real Wedison you can rent from us.",
  ],
  synopsisId: [
    "Arya mengantar makanan keliling Denpasar dengan motor bensin yang susah dinyalakan. Malam ketika dia beralih ke Wedison Athena hijau zaitun, sebuah System yang hanya bisa dia lihat mulai memberinya quest.",
    "Ternyata dia bukan satu-satunya. Ada guild para pengendara, badai yang menutup SPBU di seluruh pulau, dan sahabat yang ingin ikut. Setiap motor di cerita ini adalah Wedison asli yang bisa kamu sewa di Werigo.",
  ],
  instagram: "https://www.instagram.com/werigo.official/",
  disclaimer:
    "WERIGO SAGA is fiction. The System, the auras and the flood scenes are made up. The bikes, the charging and the rental service are real. Always wear a helmet, ride within your licence and never ride through floodwater.",
  disclaimerId:
    "WERIGO SAGA adalah fiksi. System, aura dan adegan banjir hanyalah karangan. Motor, cara mengisi daya dan layanan sewanya nyata. Selalu pakai helm, berkendara sesuai SIM kamu dan jangan pernah menerobos banjir.",
};

const allEpisodes: SagaEpisode[] = [
  {
    number: 1,
    slug: "episode-1",
    title: "The Weakest Rider",
    titleId: "Pengendara Terlemah",
    logline:
      "Arya starts his day at 4:58 AM on a petrol bike that will not start. By midnight he has a new ride and a System only he can see.",
    loglineId:
      "Hari Arya dimulai pukul 04.58 dengan motor bensin yang tidak mau menyala. Tengah malam, dia punya motor baru dan System yang hanya bisa dia lihat.",
    featuredModels: ["athena"],
    published: true,
  },
  {
    number: 2,
    slug: "episode-2",
    title: "The First Quest",
    titleId: "Quest Pertama",
    logline:
      "One working day on the Athena: thirty five orders, a sick child on the other side of town, a grandmother's blessing and a rival on a loud sportbike.",
    loglineId:
      "Satu hari kerja dengan Athena: tiga puluh lima orderan, anak yang sakit di ujung kota, restu seorang nenek dan rival dengan motor sport yang berisik.",
    featuredModels: ["athena"],
    published: true,
  },
  {
    number: 3,
    slug: "episode-3",
    title: "The Raid",
    titleId: "Raid",
    logline:
      "A storm shuts every petrol station on the Bukit. Forty medical kits, one clinic, forty five minutes, and Komang is stuck in the flood.",
    loglineId:
      "Badai menutup semua SPBU di Bukit. Empat puluh kit medis, satu klinik, empat puluh lima menit, dan Komang terjebak banjir.",
    featuredModels: ["athena", "edpower"],
    published: true,
  },
  {
    number: 4,
    slug: "episode-4",
    title: "The Second Awakening",
    titleId: "Kebangkitan Kedua",
    logline:
      "Komang finds the guild, and the guild has a day job. Three rental deliveries before 10:00 decide whether he awakens.",
    loglineId:
      "Komang menemukan guild, dan guild itu punya pekerjaan sehari-hari. Tiga antaran sewa sebelum jam 10.00 menentukan apakah dia bangkit.",
    featuredModels: ["bees", "victory", "athena", "edpower"],
    published: true,
  },
  {
    number: 5,
    slug: "episode-5",
    title: "The Visitor",
    titleId: "Sang Pengunjung",
    logline:
      "A burnt-out designer from Melbourne lands in Bali with a cursed petrol scooter and a forty minute fuel queue. Then two riders glide past without a sound, and the island makes her an offer.",
    loglineId:
      "Seorang desainer dari Melbourne yang kelelahan tiba di Bali dengan motor bensin terkutuk dan antrean bensin empat puluh menit. Lalu dua pengendara lewat tanpa suara, dan pulau ini memberinya sebuah tawaran.",
    featuredModels: ["athena", "edpower"],
    published: true,
  },
  {
    number: 6,
    slug: "episode-6",
    title: "The Handover",
    titleId: "Serah Terima",
    logline:
      "Arya meets ODY, the Operator who built the island's network from zero, then hands Chloe and Jake their bikes. That night, the Board lands in Bali.",
    loglineId:
      "Arya bertemu ODY, sang Operator yang membangun jaringan pulau ini dari nol, lalu menyerahkan motor untuk Chloe dan Jake. Malam itu, the Board mendarat di Bali.",
    featuredModels: ["athena", "edpower"],
    published: true,
  },
];

export const characters: SagaCharacter[] = [
  {
    id: "arya",
    name: "Arya",
    role: "The Silent Rider",
    about: "Delivery rider from Denpasar. Tired, broke and kind. The first one to awaken.",
    roleId: "The Silent Rider",
    aboutId: "Kurir dari Denpasar. Lelah, bokek dan baik hati. Orang pertama yang bangkit.",
    model: "athena",
  },
  {
    id: "komang",
    name: "Komang",
    role: "Pathfinder",
    about: "Arya's best friend since primary school. Loud, loyal and done pushing his late father's petrol bike.",
    roleId: "Pathfinder",
    aboutId: "Sahabat Arya sejak SD. Berisik, setia dan sudah capek mendorong motor bensin peninggalan almarhum bapaknya.",
    model: "victory",
  },
  {
    id: "sekar",
    name: "Sekar",
    role: "Rank C",
    about: "Calm, sharp and quietly soft. She saw something in Arya before anyone else did.",
    roleId: "Rank C",
    aboutId: "Tenang, tajam dan diam-diam lembut. Dia melihat sesuatu dalam diri Arya sebelum orang lain.",
    model: "athena",
  },
  {
    id: "dewa",
    name: "Dewa",
    role: "Rank A, guild master",
    about: "Gruff and fair. Runs the guild, and the guild runs a rental crew in Canggu.",
    roleId: "Rank A, guild master",
    aboutId: "Galak tapi adil. Memimpin guild, dan guild itu menjalankan kru rental di Canggu.",
    model: "edpower",
  },
  {
    id: "chloe",
    name: "Chloe",
    role: "The Visitor",
    about: "Designer from Melbourne on her first Bali trip. Burnt out, sunburnt and done with petrol queues. The island has other plans.",
    roleId: "Sang Pengunjung",
    aboutId: "Desainer dari Melbourne yang pertama kali ke Bali. Kelelahan, gosong kepanasan dan kapok antre bensin. Pulau ini punya rencana lain.",
    model: "athena",
  },
  {
    id: "jake",
    name: "Jake",
    role: "The Surfer",
    roleId: "Sang Peselancar",
    about: "Chloe's partner. Twenty nine, board under his arm, and finally old enough for the bike he wants.",
    aboutId: "Pasangan Chloe. Umur dua puluh sembilan, papan selancar di tangan, dan akhirnya cukup umur untuk motor yang dia mau.",
    model: "edpower",
  },
  {
    id: "ody",
    name: "ODY",
    role: "The Operator",
    roleId: "The Operator",
    about: "From Jakarta, two years on the island. Hired by the Board to build Wedison Bali from zero. Every SuperCharge station he opens is a gate. Never sleeps, always on WhatsApp.",
    aboutId: "Dari Jakarta, dua tahun di pulau ini. Direkrut the Board untuk membangun Wedison Bali dari nol. Setiap stasiun SuperCharge yang dia buka adalah gerbang. Tidak pernah tidur, selalu di WhatsApp.",
    model: null,
    modelNote: "Rides whatever needs testing",
    modelNoteId: "Mengendarai motor apa pun yang perlu diuji",
  },
  {
    id: "chan",
    name: "Pak Chan",
    role: "Chairman of the Board",
    roleId: "Ketua the Board",
    about: "Cold, strict and almost never smiles. Every time a quest is cleared, he drops a bigger one.",
    aboutId: "Dingin, tegas dan hampir tidak pernah tersenyum. Setiap quest selesai, dia memberi yang lebih besar.",
    model: null,
    modelNote: "The Board",
    modelNoteId: "The Board",
  },
  {
    id: "remy",
    name: "Pak Remy",
    role: "The Board's numbers man",
    roleId: "Ahli angka the Board",
    about: "Twenty nine and the youngest on the Board. One question ends most ideas: what price are you suggesting?",
    aboutId: "Dua puluh sembilan tahun dan termuda di the Board. Satu pertanyaan mengakhiri banyak ide: berapa harga yang kamu ajukan?",
    model: null,
    modelNote: "The Board",
    modelNoteId: "The Board",
  },
  {
    id: "bayu",
    name: "Bayu",
    role: "The Rival",
    about: "Fast, loud and always one fuel stop away from trouble.",
    roleId: "Sang Rival",
    aboutId: "Cepat, berisik dan selalu nyaris kehabisan bensin di saat genting.",
    model: null,
    modelNote: "Still on petrol",
    modelNoteId: "Masih pakai bensin",
  },
];

export const modelNames: Record<SagaModel, string> = {
  athena: "Wedison Athena",
  victory: "Wedison Victory",
  edpower: "Wedison EdPower",
  bees: "Wedison Bees",
};

/** Clean official transparent cutouts for the dark saga surfaces. */
const bikeImages: Record<SagaModel, { src: string; width: number; height: number }> = {
  athena: { src: "/media/saga/bikes/athena.webp", width: 900, height: 758 },
  edpower: { src: "/media/saga/bikes/edpower.webp", width: 900, height: 757 },
  victory: { src: "/media/saga/bikes/victory.webp", width: 792, height: 751 },
  bees: { src: "/media/saga/bikes/bees.webp", width: 900, height: 823 },
};

export function bikeImage(model: SagaModel) {
  return bikeImages[model];
}

type PagesManifest = Record<string, { pages: number; width: number; heights: number[] }>;

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
