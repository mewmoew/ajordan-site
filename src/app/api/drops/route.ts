import {
  getDrops, updateDrop, initDropsIfEmpty, ensureWhiskerDrops,
  getDropParticipantsByDrop, hasEnteredDrop, resolveDrop,
  getSession, getUserById,
} from "@/lib/db";
import { ITEM_CATALOG } from "@/lib/items";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    initDropsIfEmpty();
    ensureWhiskerDrops();

    // Optional auth for entry status
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    let userId: string | null = null;
    if (sessionId) {
      const session = getSession(sessionId);
      if (session) {
        const user = getUserById(session.userId);
        if (user) userId = user.id;
      }
    }

    const now = new Date();
    const drops = getDrops();

    // Lazy: promote coming_soon -> live, live -> resolve
    for (const drop of drops) {
      if (drop.status === "coming_soon" && new Date(drop.startsAt) <= now) {
        updateDrop(drop.id, { status: "live" });
        drop.status = "live";
      }
      if (drop.status === "live" && new Date(drop.endsAt) <= now) {
        const resolved = resolveDrop(drop);
        Object.assign(drop, resolved);
      }
    }

    const hydrated = drops.map((drop) => {
      const def = ITEM_CATALOG[drop.rewardItemId];
      const participants = getDropParticipantsByDrop(drop.id);
      return {
        ...drop,
        rewardItemName: def?.name ?? drop.rewardItemId,
        rewardIcon: def?.icon ?? "◈",
        rewardEffect: def?.effect ?? "",
        participantCount: participants.length,
        userEntered: userId ? hasEnteredDrop(drop.id, userId) : false,
        spotsLeft: drop.maxParticipants != null
          ? Math.max(0, drop.maxParticipants - participants.length)
          : null,
      };
    });

    return Response.json({ drops: hydrated });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
