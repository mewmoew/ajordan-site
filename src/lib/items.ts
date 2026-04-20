/* ══════════════════════════════════════════════════════════
   ITEM CATALOG
   Pure data — no Node.js imports. Safe for server & client.
═══════════════════════════════════════════════════════════ */

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic" | "ultra_rare";

export interface FuseRequirement {
  itemId: string;
  qty: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  stackable: boolean;
  holdHours: number;        // how long before tradable
  effect: string;           // short label e.g. "+2 Daily Points"
  effectDescription: string;// full explanation
  dailyPointsBonus: number; // points added to daily claim per copy owned
  estimatedValue: number;   // base market value (pts equivalent)
  flavorText?: string;      // shown for rare/legendary
  fuseMin?: number;         // copies needed to fuse
  fusesInto?: string;       // item id produced by fusion
  boostValue?: number;      // drop weight boost per copy (0.02 = +2% chance)
}

/* ── catalog ─────────────────────────────────────────── */

export const ITEM_CATALOG: Record<string, ItemDefinition> = {
  signal_chip: {
    id: "signal_chip",
    name: "Signal Chip",
    icon: "◈",
    rarity: "common",
    stackable: true,
    holdHours: 24,
    effect: "+2 Daily Points",
    effectDescription: "Each copy adds +2 points to your daily claim.",
    dailyPointsBonus: 2,
    estimatedValue: 50,
    fuseMin: 3,
    fusesInto: "void_crystal",
  },
  entry_boost: {
    id: "entry_boost",
    name: "Entry Boost",
    icon: "◎",
    rarity: "common",
    stackable: true,
    holdHours: 24,
    effect: "+1 Drop Entry",
    effectDescription: "Each copy grants one free drop entry when used.",
    dailyPointsBonus: 0,
    estimatedValue: 75,
    fuseMin: 2,
    fusesInto: "ghost_key",
  },
  void_crystal: {
    id: "void_crystal",
    name: "Void Crystal",
    icon: "◆",
    rarity: "rare",
    stackable: true,
    holdHours: 72,
    effect: "+5 Daily Points",
    effectDescription: "Each copy adds +5 points to your daily claim.",
    dailyPointsBonus: 5,
    estimatedValue: 150,
    flavorText: "Condensed creative frequency.",
    fuseMin: 2,
    fusesInto: "nova_fragment",
  },
  ghost_key: {
    id: "ghost_key",
    name: "Ghost Key",
    icon: "◬",
    rarity: "rare",
    stackable: false,
    holdHours: 72,
    effect: "Hold Bypass",
    effectDescription: "Skips the hold timer on one item. Single use.",
    dailyPointsBonus: 0,
    estimatedValue: 200,
    flavorText: "Opens doors that aren't there yet.",
  },
  nova_fragment: {
    id: "nova_fragment",
    name: "Nova Fragment",
    icon: "★",
    rarity: "legendary",
    stackable: false,
    holdHours: 168, // 7 days
    effect: "+25 Claim Bonus",
    effectDescription: "Grants +25 bonus points on your next daily claim.",
    dailyPointsBonus: 25,
    estimatedValue: 1000,
    flavorText: "Not many of these exist. Hold it well.",
  },

  /* ── Todd Bucks — mythic-tier premium signal asset ── */
  todd_bucks: {
    id: "todd_bucks",
    name: "Todd Bucks",
    icon: "✦",
    rarity: "mythic",
    stackable: true,
    holdHours: 720, // 30 days
    effect: "Premium Signal Asset",
    effectDescription:
      "A rare premium signal asset. Stored in your vault now. Future wallet-linked utility planned. Not active for cash use or withdrawal.",
    dailyPointsBonus: 0,
    estimatedValue: 5000,
    boostValue: 0,
    flavorText: "Rare. Vault-bound. The value expands later.",
    // Future wallet hooks — serialisable so they can be picked up by
    // a wallet-linking layer without schema changes:
    // walletReady: true  (flag for future wallet-link logic)
    // marketStatus: "future"
    // serialized: true   (each unit will carry a unique instance id)
  },

  /* ── Whisker Rewards ─────────────────────────────── */
  cat_whisker: {
    id: "cat_whisker",
    name: "Cat Whisker",
    icon: "〜",
    rarity: "common",
    stackable: true,
    holdHours: 24,
    effect: "Signal Boost",
    effectDescription: "Increases your weight in drops. Stack whiskers to raise your signal strength.",
    dailyPointsBonus: 0,
    estimatedValue: 30,
    boostValue: 0.02, // +2% drop weight per whisker
    flavorText: "The cats are watching. They approve.",
    fuseMin: 5,
    fusesInto: "void_crystal",
  },
};

export function getItem(id: string): ItemDefinition | undefined {
  return ITEM_CATALOG[id];
}

export function getHoldHours(rarity: Rarity): number {
  if (rarity === "mythic" || rarity === "ultra_rare") return 720;
  if (rarity === "legendary") return 168;
  if (rarity === "epic") return 120;
  if (rarity === "rare") return 72;
  return 24;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common:     "#8a7a9a",
  rare:       "#c026d3",
  epic:       "#7c3aed",  // deep violet-purple
  legendary:  "#ffd700",
  mythic:     "#ff00e5",  // neon magenta
  ultra_rare: "#00e5ff",  // legacy alias — electric cyan
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common:     "rgba(138,122,154,0.3)",
  rare:       "rgba(192,38,211,0.4)",
  epic:       "rgba(124,58,237,0.45)",
  legendary:  "rgba(255,215,0,0.4)",
  mythic:     "rgba(255,0,229,0.5)",
  ultra_rare: "rgba(0,229,255,0.45)",  // legacy
};
