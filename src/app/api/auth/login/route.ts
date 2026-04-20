import { getUserByUsername, verifyPassword, createSession } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash, user.salt)) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

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
