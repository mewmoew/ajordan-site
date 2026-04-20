import {
  getSession, getUserById, getAccount, updateAccount,
  getDrop, hasEnteredDrop, addDropParticipant,
  getDropParticipantsByDrop, getWhiskerCount, addTxEntry,
} from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: dropId } = await params;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const session = getSession(sessionId);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const user = getUserById(session.userId);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const drop = getDrop(dropId);
    if (!drop) return Response.json({ error: "Drop not found" }, { status: 404 });

    if (drop.status !== "live") {
      return Response.json({ error: "Drop is not active" }, { status: 400 });
    }

    if (new Date(drop.endsAt) <= new Date()) {
      return Response.json({ error: "Drop has ended" }, { status: 400 });
    }

    if (hasEnteredDrop(dropId, user.id)) {
      return Response.json({ error: "Already entered" }, { status: 409 });
    }

    // Check max participants
    if (drop.maxParticipants != null) {
      const count = getDropParticipantsByDrop(dropId).length;
      if (count >= drop.maxParticipants) {
        return Response.json({ error: "Drop is full" }, { status: 400 });
      }
    }

    const account = getAccount(user.id);
    if (account.points < drop.entryCost) {
      return Response.json(
        { error: "Insufficient points", points: account.points, required: drop.entryCost },
        { status: 402 }
      );
    }

    // Calculate whisker boost (0.02 per whisker, capped at 1.0 extra weight)
    const whiskers = getWhiskerCount(user.id);
    const whiskerBoost = Math.min(whiskers * 0.02, 1.0);

    // Deduct points, add participant, log transaction
    const updated = updateAccount(user.id, { points: account.points - drop.entryCost });
    addDropParticipant(dropId, user.id, user.username, whiskerBoost);
    addTxEntry(user.id, "drop_enter", `Entered ${drop.name} — -${drop.entryCost} PTS`, -drop.entryCost);

    return Response.json({
      success: true,
      newBalance: updated.points,
      deducted: drop.entryCost,
      whiskerBoost,
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
