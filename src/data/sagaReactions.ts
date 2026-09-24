/** Reactions readers can leave on a WERIGO SAGA episode (one per browser). */
export const REACTIONS = [
  { id: "love", en: "Love it", idn: "Suka", color: "#ff5c8a" },
  { id: "fire", en: "Fire", idn: "Mantap", color: "#ff8a3d" },
  { id: "cool", en: "Cool", idn: "Keren", color: "#2ee0b0" },
  { id: "haha", en: "Haha", idn: "Ngakak", color: "#ffd24a" },
  { id: "touched", en: "Touching", idn: "Terharu", color: "#6fb6ff" },
  { id: "hype", en: "Hyped", idn: "Seru", color: "#b88cff" },
] as const;

export type ReactionId = (typeof REACTIONS)[number]["id"];

export const REACTION_IDS = REACTIONS.map((r) => r.id) as unknown as [ReactionId, ...ReactionId[]];

export const SHARE_CHANNELS = ["whatsapp", "facebook", "x", "copy", "native"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];
