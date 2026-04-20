import { addRequest, getRequestsByUser, getSession, getUserById } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const requests = getRequestsByUser(session.userId);
    return Response.json({ requests: requests.reverse() });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    // Resolve user from session (optional — guests allowed)
    let userId = "guest";
    let username = "guest";
    let isGuest = true;

    if (sessionId) {
      const session = getSession(sessionId);
      if (session) {
        const user = getUserById(session.userId);
        if (user) {
          userId = user.id;
          username = user.username;
          isGuest = false;
        }
      }
    }

    const { title, message, contactInfo } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return Response.json({ error: "Title required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }
    if (title.length > 100) {
      return Response.json({ error: "Title too long (max 100 chars)" }, { status: 400 });
    }
    if (message.length > 2000) {
      return Response.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
    }

    const request = addRequest(
      userId,
      username,
      title.trim(),
      message.trim(),
      isGuest,
      contactInfo ? String(contactInfo).slice(0, 100) : undefined
    );
    return Response.json({ request });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
