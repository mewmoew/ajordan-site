import { getChatMessages, addChatMessage, getSession, getUserById } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = getChatMessages(80);
    return Response.json({ messages });
  } catch {
    return Response.json({ messages: [] });
  }
}

export async function POST(req: Request) {
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

    const user = getUserById(session.userId);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }

    if (message.length > 500) {
      return Response.json({ error: "Message too long (max 500 chars)" }, { status: 400 });
    }

    const msg = addChatMessage(user.id, user.username, message.trim());
    return Response.json({ message: msg });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
