/**
 * WERIGO SAGA, the Werigo webtoon. Single source for the series page,
 * the chapter reader, the homepage teaser, the sitemap and JSON-LD.
 * Each installment is a "Chapter" on the site (it is a comic, not a series).
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
  /** Public URL segment: /saga/chapter-N. Old /saga/episode-N links redirect (next.config.ts). */
  slug: string;
  /**
   * Stable storage id ("episode-N") for view/share/reaction counts and
   * browser reading progress. Never change it: the stats file and readers'
   * localStorage are keyed by it. Comments are keyed by `number`.
   */
  key: string;
  title: string;
  titleId: string;
  logline: string;
  loglineId: string;
  /** Versioned media URLs keep revised artwork fresh in browser and CDN caches. */
  assetVersion?: string;
  /** One-based page revisions for isolated art corrections. */
  pageAssetVersions?: Record<number, string>;
  featuredModels: SagaModel[];
  published: boolean;
  /** The end-card question, shown above the episode's comments. */
  commentPrompt?: { en: string; id: string };
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
    slug: "chapter-1",
    key: "episode-1",
    title: "The Weakest Rider",
    titleId: "Pengendara Terlemah",
    logline:
      "Arya starts his day at 4:58 AM on a petrol bike that will not start. By midnight he has a new ride and a System only he can see.",
    loglineId:
      "Hari Arya dimulai pukul 04.58 dengan motor bensin yang tidak mau menyala. Tengah malam, dia punya motor baru dan System yang hanya bisa dia lihat.",
    featuredModels: ["athena"],
    commentPrompt: {
      en: "Where should Arya ride first? Tell us in the comments.",
      id: "Ke mana Arya harus pergi duluan? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 2,
    slug: "chapter-2",
    key: "episode-2",
    title: "The First Quest",
    titleId: "Quest Pertama",
    logline:
      "One working day on the Athena: thirty five orders, a sick child on the other side of town, a grandmother's blessing and a rival on a loud sportbike.",
    loglineId:
      "Satu hari kerja dengan Athena: tiga puluh lima orderan, anak yang sakit di ujung kota, restu seorang nenek dan rival dengan motor sport yang berisik.",
    featuredModels: ["athena"],
    commentPrompt: {
      en: "Should Arya show up at Uluwatu? And who is she? Tell us in the comments.",
      id: "Perlukah Arya datang ke Uluwatu? Dan siapa sebenarnya dia? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 3,
    slug: "chapter-3",
    key: "episode-3",
    title: "The Raid",
    titleId: "Raid",
    logline:
      "A storm shuts every petrol station on the Bukit. Forty medical kits, one clinic, forty five minutes, and Komang is stuck in the flood.",
    loglineId:
      "Badai menutup semua SPBU di Bukit. Empat puluh kit medis, satu klinik, empat puluh lima menit, dan Komang terjebak banjir.",
    featuredModels: ["athena", "edpower"],
    commentPrompt: {
      en: "Which Wedison should Komang awaken with? Vote in the comments.",
      id: "Wedison mana yang cocok untuk kebangkitan Komang? Pilih di kolom komentar.",
    },
    published: true,
  },
  {
    number: 4,
    slug: "chapter-4",
    key: "episode-4",
    title: "The Second Awakening",
    titleId: "Kebangkitan Kedua",
    logline:
      "Komang finds the guild, and the guild has a day job. Three rental deliveries before 10:00 decide whether he awakens.",
    loglineId:
      "Komang menemukan guild, dan guild itu punya pekerjaan sehari-hari. Tiga antaran sewa sebelum jam 10.00 menentukan apakah dia bangkit.",
    featuredModels: ["bees", "victory", "athena", "edpower"],
    commentPrompt: {
      en: "Tell us your worst scooter story from Bali.",
      id: "Ceritakan pengalaman naik motor paling apes kamu di Bali.",
    },
    published: true,
  },
  {
    number: 5,
    slug: "chapter-5",
    key: "episode-5",
    title: "The Visitor",
    titleId: "Sang Pengunjung",
    logline:
      "A burnt-out designer from Melbourne lands in Bali with a cursed petrol scooter and a forty minute fuel queue. Then two riders glide past without a sound, and the island makes her an offer.",
    loglineId:
      "Seorang desainer dari Melbourne yang kelelahan tiba di Bali dengan motor bensin terkutuk dan antrean bensin empat puluh menit. Lalu dua pengendara lewat tanpa suara, dan pulau ini memberinya sebuah tawaran.",
    featuredModels: ["athena", "edpower"],
    commentPrompt: {
      en: "Which bike would you pick for your Bali trip?",
      id: "Motor mana yang kamu pilih untuk liburan ke Bali?",
    },
    published: true,
  },
  {
    number: 6,
    slug: "chapter-6",
    key: "episode-6",
    title: "The Handover",
    titleId: "Serah Terima",
    logline:
      "Arya meets ODY, the Operator who built the island's network from zero, then hands Chloe and Jake their bikes. That night, the Board lands in Bali.",
    loglineId:
      "Arya bertemu ODY, sang Operator yang membangun jaringan pulau ini dari nol, lalu menyerahkan motor untuk Chloe dan Jake. Malam itu, the Board mendarat di Bali.",
    featuredModels: ["athena", "edpower"],
    commentPrompt: {
      en: "Would you survive an audit from Pak Remy? Tell us in the comments.",
      id: "Kamu bakal lolos audit Pak Remy nggak? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 7,
    slug: "chapter-7",
    key: "episode-7",
    title: "Seven Days",
    titleId: "Tujuh Hari",
    logline:
      "Seven days of Bali for Chloe and Jake: Ubud at dawn, a flat tyre in the rain, a sunset charge at Uluwatu. Seven days of audit for the guild, and Pak Remy has a secret.",
    loglineId:
      "Tujuh hari Bali untuk Chloe dan Jake: Ubud saat fajar, ban bocor di tengah hujan, cas saat senja di Uluwatu. Tujuh hari audit untuk guild, dan Pak Remy punya rahasia.",
    featuredModels: ["athena", "edpower", "victory"],
    commentPrompt: {
      en: "Should the Board shut the island down? Vote in the comments.",
      id: "Haruskah the Board menutup pulau ini? Vote di kolom komentar.",
    },
    published: true,
  },
  {
    number: 8,
    slug: "chapter-8",
    key: "episode-8",
    title: "The Verdict",
    titleId: "Putusan",
    logline:
      "The Board lets the island stay, then sends Yoko, a loud senior advisor who wants ODY's seat. Thirty days, a Tumpek Landep blessing and one appraisal later, the System shows who really carried the guild.",
    loglineId:
      "The Board membiarkan pulau ini tetap jalan, lalu mengirim Yoko, penasihat senior yang berisik dan mengincar kursi ODY. Tiga puluh hari, satu berkat Tumpek Landep dan satu appraisal kemudian, System menunjukkan siapa yang sebenarnya memikul guild.",
    featuredModels: ["athena", "victory", "edpower"],
    commentPrompt: {
      en: "Who should join Arya's squad first? Tell us in the comments.",
      id: "Siapa yang harus gabung ke squad Arya duluan? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 9,
    slug: "chapter-9",
    key: "episode-9",
    title: "The Recruits",
    titleId: "Para Rekrut",
    logline:
      "Arya opens recruitment and five locals show up. Yoko, now working for a foreign rival, tries to buy every one of them. Then the grandmother who blessed Arya reveals she has been playing since 1963.",
    loglineId:
      "Arya membuka rekrutmen dan lima anak lokal datang. Yoko, kini bekerja untuk pesaing asing, mencoba membeli mereka semua. Lalu nenek yang dulu memberkati Arya mengungkap bahwa dia sudah bermain sejak 1963.",
    featuredModels: ["athena", "victory", "edpower"],
    commentPrompt: {
      en: "Which recruit is your favourite? Tell us in the comments.",
      id: "Rekrut mana favoritmu? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 10,
    slug: "chapter-10",
    key: "episode-10",
    title: "The Owner",
    titleId: "Sang Pemilik",
    logline:
      "Pak Liam, the owner of WEDISON, gives ODY three days: a dawn golf test, the street, and a night at a dark gate beside a cemetery. No slides allowed.",
    loglineId:
      "Pak Liam, pemilik WEDISON, memberi ODY tiga hari: ujian golf subuh, jalanan, dan satu malam di gate yang padam di samping setra. Tanpa slide.",
    featuredModels: ["edpower", "athena", "victory"],
    commentPrompt: {
      en: "Would you pass Pak Liam's test? Tell us in the comments.",
      id: "Kamu bakal lulus ujian Pak Liam? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 11,
    slug: "chapter-11",
    key: "chapter-11",
    title: "The Backdrop War",
    titleId: "Perang Backdrop",
    logline:
      "One hundred gates in one hundred days. ODY and Cinta hunt sites across seven dungeons of Bali, the landlords hate giant backdrops, Yoko summons a Backdrop Golem, and only Komang can find the last corner.",
    loglineId:
      "Seratus gate dalam seratus hari. ODY dan Cinta berburu lokasi di tujuh dungeon Bali, para tuan tanah benci backdrop raksasa, Yoko memanggil Golem Backdrop, dan hanya Komang yang bisa menemukan pojok terakhir.",
    featuredModels: ["athena", "edpower", "victory"],
    commentPrompt: {
      en: "Where should the next gate go? Tell us your spot in the comments.",
      id: "Gate berikutnya harus di mana? Tulis spot favoritmu di kolom komentar.",
    },
    published: true,
  },
  {
    number: 12,
    slug: "chapter-12",
    key: "chapter-12",
    title: "Rent to Own",
    titleId: "Sewa Jadi Milik",
    logline:
      "Werigo, from \"where we go?\", is born on a napkin. ODY loses his first team, finds a ledger he was never meant to see, almost logs out, then wins over the Jakarta tower so drivers can rent a Wedison until it's theirs.",
    loglineId:
      "Werigo, dari \"where we go?\", lahir di selembar serbet. ODY kehilangan tim pertamanya, menemukan buku besar yang tak seharusnya ia lihat, hampir keluar, lalu meyakinkan menara Jakarta agar driver bisa menyewa Wedison sampai jadi milik sendiri.",
    featuredModels: ["bees", "athena", "victory", "edpower"],
    commentPrompt: {
      en: "Would you rent to own your first Wedison? Tell us in the comments.",
      id: "Mau sewa jadi milik untuk Wedison pertamamu? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 13,
    slug: "chapter-13",
    key: "chapter-13",
    title: "The Nomad",
    titleId: "Sang Nomad",
    logline:
      "Denisa has lived in thirty countries and never stayed longer than ninety days. One Werigo month, a white Victory, a red Bees Pro full of cold brew and a night of floating lights on Kajeng Kliwon later, Bali has other plans.",
    loglineId:
      "Denisa sudah tinggal di tiga puluh negara dan tak pernah bertahan lebih dari sembilan puluh hari. Satu bulan Werigo, Victory putih, Bees Pro merah penuh cold brew, dan satu malam cahaya melayang saat Kajeng Kliwon kemudian, Bali punya rencana lain.",
    featuredModels: ["victory", "bees", "athena"],
    commentPrompt: {
      en: "Did Bali keep you, or did it let you go? Tell us in the comments.",
      id: "Bali menahanmu, atau melepasmu pergi? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 14,
    slug: "chapter-14",
    key: "chapter-14",
    title: "Nyepi",
    titleId: "Nyepi",
    logline:
      "Once a year the whole island switches off. Every Werigo bike goes home full the day before, Chloe and Jake land on the last flight, an ogoh-ogoh looks suspiciously like Pak Chan, and for twenty-four hours even the System goes quiet.",
    loglineId:
      "Setahun sekali seluruh pulau dimatikan. Semua motor Werigo pulang dengan baterai penuh sehari sebelumnya, Chloe dan Jake mendarat di penerbangan terakhir, ada ogoh-ogoh yang mirip sekali dengan Pak Chan, dan selama dua puluh empat jam bahkan System ikut diam.",
    featuredModels: ["athena", "edpower", "victory", "bees"],
    commentPrompt: {
      en: "What would you do with one day of total silence? Tell us in the comments.",
      id: "Kalau dapat satu hari sunyi total, kamu mau ngapain? Tulis di kolom komentar.",
    },
    published: true,
  },
  {
    number: 15,
    assetVersion: "series-v2",
    slug: "chapter-15",
    key: "chapter-15",
    title: "The Citadel",
    titleId: "The Citadel",
    logline:
      "Three days to find a home for the Wedison Experience Centre. Pak Chan has a long list of demands, Dewa has an EdPower, and the land has a guardian. But where does Werigo belong?",
    loglineId:
      "Tiga hari untuk mencari tempat bagi Wedison Experience Centre. Pak Chan membawa daftar syarat panjang, Dewa membawa EdPower, dan lahan itu punya penjaga. Lalu, di mana tempat Werigo?",
    featuredModels: ["edpower", "athena", "bees"],
    commentPrompt: {
      en: "If you could design one corner of a Wedison Experience Centre, what would it be?",
      id: "Kalau kamu bisa merancang satu sudut Wedison Experience Centre, kamu ingin membuat apa?",
    },
    published: true,
  },
  {
    number: 16,
    assetVersion: "jules-v1",
    slug: "chapter-16",
    key: "chapter-16",
    title: "Werigo Must Stand Alone",
    titleId: "Werigo Harus Berdiri Sendiri",
    logline: "One bike, two promises, and a trial the team must finish without Ody taking over. Then someone returns a key before the doors have opened.",
    loglineId: "Satu motor, dua janji, dan uji coba yang harus tim selesaikan tanpa diambil alih Ody. Lalu seseorang mengembalikan kunci sebelum kantor dibuka.",
    featuredModels: ["athena", "victory", "edpower"],
    commentPrompt: {
      en: "Would you open the door, or leave the key where it was?",
      id: "Kamu akan buka pintunya, atau biarkan kunci itu di tempatnya?",
    },
    published: true,
  },
  {
    number: 17,
    assetVersion: "jules-v1",
    slug: "chapter-17",
    key: "episode-17",
    title: "Too Many Hats",
    titleId: "Kebanyakan Peran",
    logline: "A simple booking map reveals a return with no beginning. Ody takes two hours off in Sanur, but the office refuses to let him go.",
    loglineId: "Peta booking sederhana mengungkap pengembalian tanpa awal. Ody mengambil dua jam jeda di Sanur, tetapi kantor belum mau melepasnya.",
    featuredModels: [
      "athena",
      "edpower"
    ],
    commentPrompt: {
      en: "What would you ask the two Odys to find out which one is real?",
      id: "Apa yang lo tanyakan ke dua Ody supaya tahu mana yang asli?"
    },
    published: true
  },
  {
    number: 18,
    assetVersion: "jules-v1",
    slug: "chapter-18",
    key: "episode-18",
    title: "One Good Day",
    titleId: "Satu Hari yang Cukup",
    logline: "An impossible office offers Arya the perfect day he once wished for. Komang must find a real way home before the price erases them.",
    loglineId: "Kantor yang mustahil menawarkan hari sempurna yang pernah Arya minta. Komang harus menemukan jalan pulang sebelum harganya menghapus mereka.",
    featuredModels: [
      "edpower"
    ],
    commentPrompt: {
      en: "Would you notice the hidden price of your perfect day?",
      id: "Kalau ditawari hari yang sempurna, apa lo bakal membaca syaratnya?"
    },
    published: true,
  },
  {
    number: 19,
    slug: "chapter-19",
    key: "episode-19",
    title: "The Small Yes",
    titleId: "Mulai dari Satu Ya",
    logline: "A sealed key takes the team into the Gatekeeper’s 1963 record. A forgotten friend, a stolen face, and one small business test reveal how an offer becomes a trap.",
    loglineId: "Kunci tersegel membawa tim ke catatan Gatekeeper tahun 1963. Teman yang terlupakan, wajah curian, dan satu tes bisnis kecil mengungkap cara sebuah tawaran menjadi jebakan.",
    featuredModels: [
      "edpower"
    ],
    commentPrompt: {
      en: "Would you trade a painful memory for a comforting lie?",
      id: "Maukah lo menukar ingatan menyakitkan dengan kebohongan yang menenangkan?"
    },
    published: true,
    assetVersion: "first-v1"
  },
  {
    number: 20,
    slug: "chapter-20",
    key: "episode-20",
    title: "The Name the Door Stole",
    titleId: "Nama yang Dicuri Pintu",
    logline: "A paid booking with no payment brings a perfect copy to Werigo’s door. While the team follows the costs behind its offer, the Gatekeeper must face the memory hiding a friend’s name.",
    loglineId: "Booking lunas tanpa pembayaran membawa peniru sempurna ke pintu Werigo. Saat tim menelusuri biaya di balik tawarannya, Gatekeeper harus menghadapi ingatan yang menyembunyikan nama temannya.",
    featuredModels: [
      "edpower"
    ],
    commentPrompt: {
      en: "Which would fool you first: a familiar face, a perfect review, or beautiful numbers?",
      id: "Mana yang paling mudah menipu lo: wajah familiar, ulasan sempurna, atau angka yang bagus?"
    },
    published: true,
    assetVersion: "first-v1"
  },
  {
    number: 21,
    slug: "chapter-21",
    key: "episode-21",
    title: "The Customer Who Never Came",
    titleId: "Pelanggan yang Tak Pernah Datang",
    logline: "A forged testimonial heralds an invasion. Monsters kill, multiple races cross into Earth, and every human receives a System. Werigo has forty-five seconds to protect a route home.",
    loglineId: "Testimoni palsu menandai invasi. Monster membunuh, berbagai ras menyeberang ke Bumi, dan semua manusia mendapat Sistem. Werigo punya empat puluh lima detik untuk menjaga rute pulang.",
    featuredModels: [
      "edpower",
      "athena",
      "victory",
      "bees"
    ],
    commentPrompt: {
      en: "Can Werigo keep people moving when the invaders want to own every road?",
      id: "Bisakah Werigo menjaga orang tetap bergerak saat penjajah ingin memiliki semua jalan?"
    },
    published: true,
    assetVersion: "first-v1"
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
  return entry.heights.map((height, i) => {
    const version = episode.pageAssetVersions?.[i + 1] ?? episode.assetVersion;
    return {
      src: `/media/saga/ep-${episode.number}/p${String(i + 1).padStart(2, "0")}${version ? `-${version}` : ""}.webp`,
      width: entry.width,
      height,
    };
  });
}


export function coverSrc(episode: SagaEpisode) {
  return `/media/saga/covers/ep-${episode.number}${episode.assetVersion ? `-${episode.assetVersion}` : ""}.webp`;
}

export function ogSrc(episode: SagaEpisode) {
  return `/media/saga/covers/ep-${episode.number}${episode.assetVersion ? `-${episode.assetVersion}` : ""}-og.jpg`;
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
