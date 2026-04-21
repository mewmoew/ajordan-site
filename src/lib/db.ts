import fs from "fs";
import path from "path";
import crypto from "crypto";

/* ── paths ─────────────────────────────────────────── */
const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read<T>(file: string): T[] {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, "utf-8").trim();
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function write<T>(file: string, data: T[]) {
  ensureDir();
  const tmp = path.join(DATA_DIR, file + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, path.join(DATA_DIR, file));
}

/* ── types ─────────────────────────────────────────── */

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  email?: string;
  earlyAccess?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export interface PrivateRequest {
  id: string;
  userId: string;
  username: string;
  title: string;
  message: string;
  status: "pending" | "seen" | "responded";
  createdAt: string;
  guest?: boolean;
  contactInfo?: string;
  submissionType?: "free" | "tb_unlock" | "priority";
  tbSpent?: number;
  userRank?: string;
  xpAtSubmission?: number;
  streakAtSubmission?: number;
  preset?: string;
}

export interface Booking {
  id: string;
  userId: string;
  username: string;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  note: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

/* ── password hashing (pbkdf2) ─────────────────────── */

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

/* ── users ─────────────────────────────────────────── */

const USERS_FILE = "users.json";

export function getUsers(): User[] {
  return read<User>(USERS_FILE);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function createUser(username: string, password: string, email?: string, earlyAccess?: boolean): User {
  const users = getUsers();
  const { hash, salt } = hashPassword(password);
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
    ...(email ? { email } : {}),
    ...(earlyAccess ? { earlyAccess: true } : {}),
  };
  users.push(user);
  write(USERS_FILE, users);
  return user;
}

/* ── sessions ──────────────────────────────────────── */

const SESSIONS_FILE = "sessions.json";

export function createSession(userId: string): Session {
  const sessions = read<Session>(SESSIONS_FILE);
  const session: Session = {
    id: crypto.randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
  sessions.push(session);
  write(SESSIONS_FILE, sessions);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  const sessions = read<Session>(SESSIONS_FILE);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return undefined;
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession(sessionId);
    return undefined;
  }
  return session;
}

export function deleteSession(sessionId: string) {
  const sessions = read<Session>(SESSIONS_FILE).filter((s) => s.id !== sessionId);
  write(SESSIONS_FILE, sessions);
}

/* ── chat messages ─────────────────────────────────── */

const CHAT_FILE = "chat.json";

export function getChatMessages(limit = 50): ChatMessage[] {
  const messages = read<ChatMessage>(CHAT_FILE);
  return messages.slice(-limit);
}

export function addChatMessage(userId: string, username: string, message: string): ChatMessage {
  const messages = read<ChatMessage>(CHAT_FILE);
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    userId,
    username,
    message,
    createdAt: new Date().toISOString(),
  };
  messages.push(msg);
  // Keep last 500 messages
  const trimmed = messages.slice(-500);
  write(CHAT_FILE, trimmed);
  return msg;
}

/* ── private requests ──────────────────────────────── */

const REQUESTS_FILE = "requests.json";

export function getRequests(): PrivateRequest[] {
  return read<PrivateRequest>(REQUESTS_FILE);
}

export function getRequestsByUser(userId: string): PrivateRequest[] {
  return getRequests().filter((r) => r.userId === userId);
}

export function addRequest(
  userId: string,
  username: string,
  title: string,
  message: string,
  guest?: boolean,
  contactInfo?: string,
  submissionType?: "free" | "tb_unlock" | "priority",
  tbSpent?: number,
  userRank?: string,
  xpAtSubmission?: number,
  streakAtSubmission?: number,
  preset?: string,
): PrivateRequest {
  const requests = getRequests();
  const req: PrivateRequest = {
    id: crypto.randomUUID(),
    userId,
    username,
    title,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...(guest ? { guest: true } : {}),
    ...(contactInfo ? { contactInfo } : {}),
    submissionType: submissionType ?? "free",
    ...(tbSpent ? { tbSpent } : {}),
    ...(userRank ? { userRank } : {}),
    ...(xpAtSubmission !== undefined ? { xpAtSubmission } : {}),
    ...(streakAtSubmission !== undefined ? { streakAtSubmission } : {}),
    ...(preset ? { preset } : {}),
  };
  requests.push(req);
  write(REQUESTS_FILE, requests);
  return req;
}

/* ── bookings ──────────────────────────────────────── */

const BOOKINGS_FILE = "bookings.json";

export function getBookings(): Booking[] {
  return read<Booking>(BOOKINGS_FILE);
}

export function getBookingsByUser(userId: string): Booking[] {
  return getBookings().filter((b) => b.userId === userId);
}

/* ── user accounts (points + daily claim) ─────────────── */

const ACCOUNTS_FILE = "accounts.json";

export interface UserAccount {
  userId: string;
  points: number;
  lastDailyClaimAt: string | null;
  dailyStreak: number;
  updatedAt: string;
  // X integration prep — populated when user connects X account
  xHandle?: string;
  isXConnected?: boolean;
  totalActions?: number;
  lastXSync?: string | null;
}

export function getAccounts(): UserAccount[] {
  return read<UserAccount>(ACCOUNTS_FILE);
}

export function getAccount(userId: string): UserAccount {
  const accounts = getAccounts();
  const existing = accounts.find((a) => a.userId === userId);
  if (existing) return existing;
  const fresh: UserAccount = {
    userId,
    points: 0,
    lastDailyClaimAt: null,
    dailyStreak: 0,
    updatedAt: new Date().toISOString(),
  };
  accounts.push(fresh);
  write(ACCOUNTS_FILE, accounts);
  return fresh;
}

export function updateAccount(
  userId: string,
  updates: Partial<Omit<UserAccount, "userId">>
): UserAccount {
  // ensure account exists
  getAccount(userId);
  const accounts = getAccounts();
  const idx = accounts.findIndex((a) => a.userId === userId);
  accounts[idx] = { ...accounts[idx], ...updates, updatedAt: new Date().toISOString() };
  write(ACCOUNTS_FILE, accounts);
  return accounts[idx];
}

export function grantStarterRewards(userId: string) {
  // Called once at signup — give 75 points + Signal Chip + Entry Boost
  const account = getAccount(userId);
  if (account.points === 0 && account.lastDailyClaimAt === null) {
    updateAccount(userId, { points: 75 });
    addInventoryItem(userId, "signal_chip", 1, "common", true, 24, 50, "starter");
    addInventoryItem(userId, "entry_boost", 1, "common", true, 24, 75, "starter");
  }
}

/* ── inventory ────────────────────────────────────────── */

const INVENTORY_FILE = "inventory.json";

export interface InventoryEntry {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic" | "ultra_rare";
  stackable: boolean;
  acquiredAt: string;
  tradableAt: string;
  source: "starter" | "drop" | "purchase" | "reward";
  status: "held" | "tradable";
  marketListable: boolean;
  listStatus: "unlisted" | "listed" | "sold";
  estimatedValue: number;
}

export function getInventory(): InventoryEntry[] {
  return read<InventoryEntry>(INVENTORY_FILE);
}

export function getInventoryByUser(userId: string): InventoryEntry[] {
  const now = new Date();
  const inv = read<InventoryEntry>(INVENTORY_FILE);
  let changed = false;
  const user = inv.filter((e) => e.userId === userId);
  user.forEach((e) => {
    const shouldBe: "held" | "tradable" = now >= new Date(e.tradableAt) ? "tradable" : "held";
    if (e.status !== shouldBe) { e.status = shouldBe; changed = true; }
  });
  if (changed) write(INVENTORY_FILE, inv);
  return user;
}

export function addInventoryItem(
  userId: string,
  itemId: string,
  quantity: number,
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic" | "ultra_rare",
  stackable: boolean,
  holdHours: number,
  estimatedValue: number,
  source: "starter" | "drop" | "purchase" | "reward"
): InventoryEntry {
  const inventory = getInventory();
  const now = new Date();
  const tradableAt = new Date(now.getTime() + holdHours * 3_600_000).toISOString();

  if (stackable) {
    const idx = inventory.findIndex((e) => e.userId === userId && e.itemId === itemId);
    if (idx !== -1) {
      inventory[idx].quantity += quantity;
      // status refresh
      inventory[idx].status = new Date() >= new Date(inventory[idx].tradableAt) ? "tradable" : "held";
      write(INVENTORY_FILE, inventory);
      return inventory[idx];
    }
  }

  const entry: InventoryEntry = {
    id: crypto.randomUUID(),
    userId,
    itemId,
    quantity,
    rarity,
    stackable,
    acquiredAt: now.toISOString(),
    tradableAt,
    source,
    status: "held",
    marketListable: false,
    listStatus: "unlisted",
    estimatedValue,
  };
  inventory.push(entry);
  write(INVENTORY_FILE, entry.stackable ? inventory : inventory);
  return entry;
}

/* ── drops ───────────────────────────────────────────── */

const DROPS_FILE = "drops.json";

export interface Drop {
  id: string;
  name: string;
  description: string;
  rewardItemId: string;
  rewardQuantity: number;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic" | "ultra_rare";
  entryCost: number;
  maxParticipants: number | null;
  startsAt: string;
  endsAt: string;
  status: "live" | "ended" | "coming_soon" | "resolved";
  dropType?: "standard" | "whisker" | "jackpot";
  winnerId?: string;
  winnerUsername?: string;
}

export function getDrops(): Drop[] {
  return read<Drop>(DROPS_FILE);
}

export function getDrop(dropId: string): Drop | undefined {
  return getDrops().find((d) => d.id === dropId);
}

export function updateDrop(dropId: string, updates: Partial<Drop>): Drop | null {
  const drops = getDrops();
  const idx = drops.findIndex((d) => d.id === dropId);
  if (idx === -1) return null;
  drops[idx] = { ...drops[idx], ...updates };
  write(DROPS_FILE, drops);
  return drops[idx];
}

export function resolveDrop(drop: Drop): Drop {
  const participants = getDropParticipantsByDrop(drop.id);
  if (participants.length === 0) {
    return updateDrop(drop.id, { status: "resolved" }) as Drop;
  }

  // Weighted selection — whiskerBoost adds extra weight (default 1.0 per entry)
  const weights = participants.map((p) => 1.0 + (p.whiskerBoost ?? 0));
  const total = weights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  let winner = participants[participants.length - 1];
  for (let i = 0; i < participants.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { winner = participants[i]; break; }
  }

  const { rarity, rewardItemId, rewardQuantity } = drop;
  const holdHours =
    rarity === "mythic" || rarity === "ultra_rare" ? 720 :
    rarity === "legendary"  ? 168 :
    rarity === "epic"       ? 120 :
    rarity === "rare"       ?  72 : 24;
  const ITEM_VALUES: Record<string, number> = {
    signal_chip: 50, entry_boost: 75, void_crystal: 150,
    ghost_key: 200, nova_fragment: 1000, cat_whisker: 30, todd_bucks: 5000,
  };
  const estimatedValue = ITEM_VALUES[rewardItemId] ?? 50;
  const rewardItem = ((): { stackable: boolean } => {
    const s: Record<string, boolean> = {
      signal_chip: true, entry_boost: true, void_crystal: true,
      ghost_key: false, nova_fragment: false, cat_whisker: true, todd_bucks: true,
    };
    return { stackable: s[rewardItemId] ?? false };
  })();
  addInventoryItem(
    winner.userId, rewardItemId, rewardQuantity, rarity,
    rewardItem.stackable, holdHours, estimatedValue, "drop"
  );
  // Log item received for winner
  const qtyLabel = rewardQuantity > 1 ? ` ×${rewardQuantity}` : "";
  addTxEntry(
    winner.userId,
    "item_received",
    `Won ${drop.name} — received ${rewardItemId.replace(/_/g, " ")}${qtyLabel}`
  );
  return updateDrop(drop.id, {
    status: "resolved",
    winnerId: winner.userId,
    winnerUsername: winner.username,
  }) as Drop;
}

export function initDropsIfEmpty() {
  const drops = getDrops();
  if (drops.length > 0) return;
  const now = Date.now();
  const h = (n: number) => new Date(now + n * 3_600_000).toISOString();
  const starter: Drop[] = [
    {
      id: "drop_signal_001",
      name: "Signal Chip Drop",
      description: "Stack them for daily point bonuses. Entry-level access to the network economy.",
      rewardItemId: "signal_chip",
      rewardQuantity: 2,
      rarity: "common",
      entryCost: 15,
      maxParticipants: 20,
      startsAt: h(0),
      endsAt: h(3),
      status: "live",
    },
    {
      id: "drop_void_001",
      name: "Void Crystal Cache",
      description: "Rare crystals amplify your daily signal. High value, limited access.",
      rewardItemId: "void_crystal",
      rewardQuantity: 1,
      rarity: "rare",
      entryCost: 40,
      maxParticipants: 8,
      startsAt: h(0),
      endsAt: h(8),
      status: "live",
    },
    {
      id: "drop_nova_001",
      name: "Nova Fragment",
      description: "One-of-a-kind legendary fragment. Only the most committed signals win.",
      rewardItemId: "nova_fragment",
      rewardQuantity: 1,
      rarity: "legendary",
      entryCost: 100,
      maxParticipants: 5,
      startsAt: h(24),
      endsAt: h(48),
      status: "coming_soon",
    },
  ];
  write(DROPS_FILE, starter);
}

/** Ensures Whisker Reward and Jackpot drops exist — safe to call on every request */
export function ensureWhiskerDrops() {
  const drops = getDrops();
  const ids = new Set(drops.map((d) => d.id));
  const now = Date.now();
  const h = (n: number) => new Date(now + n * 3_600_000).toISOString();
  const toAdd: Drop[] = [];

  if (!ids.has("drop_whisker_001")) {
    toAdd.push({
      id: "drop_whisker_001",
      name: "Whisker Reward Drop",
      description: "Win a bundle of Cat Whiskers. Stack them to boost your weight in future drops.",
      rewardItemId: "cat_whisker",
      rewardQuantity: 3,
      rarity: "common",
      entryCost: 10,
      maxParticipants: 25,
      startsAt: h(0),
      endsAt: h(6),
      status: "live",
      dropType: "whisker",
    });
  }

  if (!ids.has("drop_whisker_jackpot_001")) {
    toAdd.push({
      id: "drop_whisker_jackpot_001",
      name: "Whisker Jackpot",
      description: "One winner takes a massive whisker bundle. Highest boost prize in the network.",
      rewardItemId: "cat_whisker",
      rewardQuantity: 10,
      rarity: "legendary",
      entryCost: 75,
      maxParticipants: 12,
      startsAt: h(12),
      endsAt: h(36),
      status: "coming_soon",
      dropType: "jackpot",
    });
  }

  if (!ids.has("drop_todd_jackpot_001")) {
    toAdd.push({
      id: "drop_todd_jackpot_001",
      name: "Todd Bucks Jackpot",
      description: "One winner claims Todd Bucks — the rarest asset in the network. Vault-bound now. High-value utility coming.",
      rewardItemId: "todd_bucks",
      rewardQuantity: 1,
      rarity: "mythic",
      entryCost: 150,
      maxParticipants: 5,
      startsAt: h(48),
      endsAt: h(96),
      status: "coming_soon",
      dropType: "jackpot",
    });
  }

  if (toAdd.length > 0) {
    write(DROPS_FILE, [...drops, ...toAdd]);
  }
}

/* ── drop participants ────────────────────────────────── */

const DROP_PARTICIPANTS_FILE = "drop_participants.json";

export interface DropParticipant {
  dropId: string;
  userId: string;
  username: string;
  enteredAt: string;
  whiskerBoost?: number; // extra weight from Cat Whiskers (0.02 per whisker)
}

export function getDropParticipantsByDrop(dropId: string): DropParticipant[] {
  return read<DropParticipant>(DROP_PARTICIPANTS_FILE).filter((p) => p.dropId === dropId);
}

export function hasEnteredDrop(dropId: string, userId: string): boolean {
  return read<DropParticipant>(DROP_PARTICIPANTS_FILE).some(
    (p) => p.dropId === dropId && p.userId === userId
  );
}

export function addDropParticipant(
  dropId: string,
  userId: string,
  username: string,
  whiskerBoost = 0
): DropParticipant {
  const all = read<DropParticipant>(DROP_PARTICIPANTS_FILE);
  const p: DropParticipant = {
    dropId, userId, username,
    enteredAt: new Date().toISOString(),
    whiskerBoost,
  };
  all.push(p);
  write(DROP_PARTICIPANTS_FILE, all);
  return p;
}

/** Returns the number of Cat Whiskers a user owns */
export function getWhiskerCount(userId: string): number {
  const inv = read<InventoryEntry>(INVENTORY_FILE);
  const entry = inv.find((e) => e.userId === userId && e.itemId === "cat_whisker");
  return entry ? entry.quantity : 0;
}

/* ── existing addBooking ─────────────────────────────── */

/* ── transaction log ─────────────────────────────────── */

const TX_FILE = "transactions.json";

export interface TxEntry {
  id: string;
  userId: string;
  type: "drop_enter" | "daily_claim" | "item_received";
  label: string;
  amount?: number; // positive = gain pts, negative = spend pts
  createdAt: string;
}

export function getTxLog(userId: string, limit = 50): TxEntry[] {
  const all = read<TxEntry>(TX_FILE);
  return all
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function addTxEntry(
  userId: string,
  type: TxEntry["type"],
  label: string,
  amount?: number
): void {
  const all = read<TxEntry>(TX_FILE);
  // Trim oldest entries for this user if over 500
  const userIds = all.filter((e) => e.userId === userId);
  let base = all;
  if (userIds.length >= 500) {
    const oldest = [...userIds].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    base = all.filter((e) => e.id !== oldest.id);
  }
  const entry: TxEntry = {
    id: crypto.randomUUID(),
    userId,
    type,
    label,
    amount,
    createdAt: new Date().toISOString(),
  };
  write(TX_FILE, [entry, ...base]);
}

export function addBooking(
  userId: string,
  username: string,
  preferredDate: string,
  preferredTime: string,
  reason: string,
  note: string
): Booking {
  const bookings = getBookings();
  const booking: Booking = {
    id: crypto.randomUUID(),
    userId,
    username,
    preferredDate,
    preferredTime,
    reason,
    note,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  write(BOOKINGS_FILE, bookings);
  return booking;
}

/* ── promo codes ──────────────────────────────────────── */
// Add codes manually to data/promo_codes.json:
// [{ "code": "EARLYBIRD", "xpBonus": 50, "description": "+50 XP Early Bird", "maxUses": null, "uses": 0, "active": true, "createdAt": "..." }]

const PROMO_CODES_FILE  = "promo_codes.json";
const PROMO_USAGES_FILE = "promo_usages.json";

export interface PromoCode {
  code: string;
  xpBonus: number;
  description: string;
  maxUses: number | null;
  uses: number;
  active: boolean;
  createdAt: string;
}

export interface PromoUsage {
  code: string;
  userId: string;
  username: string;
  appliedAt: string;
}

export function getPromoCodes(): PromoCode[] {
  return read<PromoCode>(PROMO_CODES_FILE);
}

export function getPromoCode(code: string): PromoCode | undefined {
  return getPromoCodes().find(p => p.code.toUpperCase() === code.toUpperCase().trim());
}

export function isPromoValid(code: string, userId: string): { valid: true; promo: PromoCode } | { valid: false; reason: string } {
  const promo = getPromoCode(code);
  if (!promo || !promo.active) return { valid: false, reason: "Invalid code" };
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) return { valid: false, reason: "Code limit reached" };
  const usages = read<PromoUsage>(PROMO_USAGES_FILE);
  if (usages.some(u => u.code.toUpperCase() === code.toUpperCase() && u.userId === userId))
    return { valid: false, reason: "Already redeemed" };
  return { valid: true, promo };
}

export function redeemPromoCode(code: string, userId: string, username: string): PromoCode | null {
  const check = isPromoValid(code, userId);
  if (!check.valid) return null;
  const { promo } = check;

  // Increment usage count
  const codes = getPromoCodes();
  const idx = codes.findIndex(p => p.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return null;
  codes[idx].uses += 1;
  write(PROMO_CODES_FILE, codes);

  // Log usage
  const usages = read<PromoUsage>(PROMO_USAGES_FILE);
  usages.push({ code: code.toUpperCase(), userId, username, appliedAt: new Date().toISOString() });
  write(PROMO_USAGES_FILE, usages);

  // Apply XP bonus
  const account = getAccount(userId);
  updateAccount(userId, { points: account.points + promo.xpBonus });

  return promo;
}
