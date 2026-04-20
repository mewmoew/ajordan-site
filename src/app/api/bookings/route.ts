import { addBooking, getBookingsByUser, getSession, getUserById } from "@/lib/db";
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

    const bookings = getBookingsByUser(session.userId);
    return Response.json({ bookings: bookings.reverse() });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
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

    const { preferredDate, preferredTime, reason, note } = await req.json();

    if (!preferredDate || !preferredTime || !reason) {
      return Response.json({ error: "Date, time, and reason are required" }, { status: 400 });
    }
    if (reason.length > 200) {
      return Response.json({ error: "Reason too long (max 200 chars)" }, { status: 400 });
    }
    if (note && note.length > 500) {
      return Response.json({ error: "Note too long (max 500 chars)" }, { status: 400 });
    }

    const booking = addBooking(
      user.id,
      user.username,
      preferredDate,
      preferredTime,
      reason.trim(),
      (note || "").trim()
    );
    return Response.json({ booking });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
