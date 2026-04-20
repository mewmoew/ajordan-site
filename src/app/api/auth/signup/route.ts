import { createUser, getUserByUsername, createSession, grantStarterRewards, initDropsIfEmpty } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return Response.json({ error: "Username must be 3-20 characters" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return Response.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = getUserByUsername(username);
    if (existing) {
      return Response.json({ error: "Username already taken" }, { status: 409 });
    }

    const user = createUser(username, password);
    grantStarterRewards(user.id);  // 75 pts + Signal Chip + Entry Boost
    initDropsIfEmpty();            // seed drops on first signup if needed
    const session = createSession(user.id);

    const cookieStore = await cookies();
    cookieStore.set("session_id", session.id, {
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return Response.json({ id: user.id, username: user.username });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
