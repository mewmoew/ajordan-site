import { getSession, getUserById } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) {
      return Response.json({ user: null });
    }

    const session = getSession(sessionId);
    if (!session) {
      return Response.json({ user: null });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return Response.json({ user: null });
    }

    return Response.json({ user: { id: user.id, username: user.username } });
  } catch {
    return Response.json({ user: null });
  }
}
