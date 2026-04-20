import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, getUserById, getTxLog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) return NextResponse.json({ entries: [] });

    const session = getSession(sessionId);
    if (!session) return NextResponse.json({ entries: [] });

    const user = getUserById(session.userId);
    if (!user) return NextResponse.json({ entries: [] });

    const entries = getTxLog(user.id);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
