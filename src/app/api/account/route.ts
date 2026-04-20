import { getSession, getUserById, getAccount, getInventoryByUser } from "@/lib/db";
import { ITEM_CATALOG } from "@/lib/items";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const session = getSession(sessionId);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const user = getUserById(session.userId);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const account = getAccount(user.id);
    const rawInventory = getInventoryByUser(user.id);

    // Hydrate inventory with item definitions
    const inventory = rawInventory.map((entry) => {
      const def = ITEM_CATALOG[entry.itemId];
      return {
        ...entry,
        itemName: def?.name ?? entry.itemId,
        itemIcon: def?.icon ?? "◈",
        effect: def?.effect ?? "",
        effectDescription: def?.effectDescription ?? "",
        flavorText: def?.flavorText,
        fuseMin: def?.fuseMin,
        fusesInto: def?.fusesInto,
      };
    });

    // Calculate how much today's claim would give
    const chipCount = rawInventory.reduce(
      (s, e) => s + (e.itemId === "signal_chip" ? e.quantity : 0), 0
    );
    const crystalCount = rawInventory.reduce(
      (s, e) => s + (e.itemId === "void_crystal" ? e.quantity : 0), 0
    );
    const novaCount = rawInventory.reduce(
      (s, e) => s + (e.itemId === "nova_fragment" ? e.quantity : 0), 0
    );
    const claimAmount = 10 + chipCount * 2 + crystalCount * 5 + novaCount * 25;

    // Check claim availability
    const CLAIM_COOLDOWN_MS = 24 * 3_600_000;
    const now = Date.now();
    const lastClaim = account.lastDailyClaimAt ? new Date(account.lastDailyClaimAt).getTime() : 0;
    const canClaim = now - lastClaim >= CLAIM_COOLDOWN_MS;
    const nextClaimAt = canClaim ? null : new Date(lastClaim + CLAIM_COOLDOWN_MS).toISOString();

    return Response.json({
      points: account.points,
      dailyStreak: account.dailyStreak,
      canClaim,
      nextClaimAt,
      claimAmount,
      inventory,
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
