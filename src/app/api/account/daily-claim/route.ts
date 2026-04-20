import { getSession, getUserById, getAccount, getInventoryByUser, updateAccount, addTxEntry, addInventoryItem } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const CLAIM_COOLDOWN_MS = 24 * 3_600_000;
const BASE_CLAIM = 10;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const session = getSession(sessionId);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const user = getUserById(session.userId);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const account = getAccount(user.id);
    const now = Date.now();
    const lastClaim = account.lastDailyClaimAt
      ? new Date(account.lastDailyClaimAt).getTime()
      : 0;

    if (now - lastClaim < CLAIM_COOLDOWN_MS) {
      const nextClaimAt = new Date(lastClaim + CLAIM_COOLDOWN_MS).toISOString();
      return Response.json({ error: "Already claimed", nextClaimAt }, { status: 429 });
    }

    // Calculate bonus from inventory
    const inv = getInventoryByUser(user.id);
    const chipBonus = inv.reduce((s, e) => s + (e.itemId === "signal_chip" ? e.quantity * 2 : 0), 0);
    const crystalBonus = inv.reduce((s, e) => s + (e.itemId === "void_crystal" ? e.quantity * 5 : 0), 0);
    const novaBonus = inv.reduce((s, e) => s + (e.itemId === "nova_fragment" ? e.quantity * 25 : 0), 0);
    const gained = BASE_CLAIM + chipBonus + crystalBonus + novaBonus;

    // Streak logic
    const yesterday = now - CLAIM_COOLDOWN_MS;
    const withinStreak = lastClaim > 0 && lastClaim >= yesterday - 3_600_000; // 1h grace
    const newStreak = withinStreak ? account.dailyStreak + 1 : 1;

    // Streak milestone bonuses
    const streakBonus =
      newStreak % 7 === 0 ? 10 :
      newStreak % 5 === 0 ? 5 :
      newStreak % 3 === 0 ? 2 : 0;

    const totalGained = gained + streakBonus;

    const updated = updateAccount(user.id, {
      points: account.points + totalGained,
      lastDailyClaimAt: new Date().toISOString(),
      dailyStreak: newStreak,
    });

    // Log to transaction history
    addTxEntry(user.id, "daily_claim", `Claimed Daily Signal — +${totalGained} PTS`, totalGained);

    // Whisker reward on streak milestones (every 5th day, grant 1 cat whisker)
    let whiskersGranted = 0;
    if (newStreak % 5 === 0) {
      whiskersGranted = 1;
      addInventoryItem(user.id, "cat_whisker", 1, "common", true, 24, 30, "reward");
      addTxEntry(user.id, "item_received", `Streak Bonus — received Cat Whisker ×1`);
    }

    const nextClaimAt = new Date(now + CLAIM_COOLDOWN_MS).toISOString();

    return Response.json({
      gained: totalGained,
      newBalance: updated.points,
      nextClaimAt,
      streak: newStreak,
      streakBonus,
      whiskersGranted,
      breakdown: { base: BASE_CLAIM, chipBonus, crystalBonus, novaBonus, streakBonus },
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
