import { addRequest, getRequestsByUser, getSession, getUserById } from "@/lib/db";
import { cookies } from "next/headers";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmailHtml(data: {
  username: string;
  isGuest: boolean;
  reason: string;
  contactInfo?: string;
  preset?: string;
  note?: string;
  submittedAt: string;
}): string {
  const { username, isGuest, reason, contactInfo, preset, note, submittedAt } = data;
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #1a0a2a;color:#5a4a7a;font-size:0.72em;letter-spacing:0.16em;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1a0a2a;color:#e0d8f0;font-size:0.9em;white-space:pre-wrap;word-break:break-word;">${escHtml(value)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#07070f;font-family:monospace;">
  <div style="max-width:560px;margin:0 auto;background:#0d0d18;border:1px solid rgba(192,38,211,0.35);border-top:2px solid #c026d3;">
    <div style="padding:20px 24px 16px;border-bottom:1px solid rgba(192,38,211,0.18);">
      <div style="color:#c026d3;font-size:1.3em;letter-spacing:0.22em;">// NEW TRANSMISSION //</div>
      <div style="color:#5a4a7a;font-size:0.72em;letter-spacing:0.14em;margin-top:4px;">AJORDAN Contact Form</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${row("REASON", reason)}
      ${contactInfo ? row("CONTACT", contactInfo) : ""}
      ${preset ? row("QUICK SELECT", preset) : ""}
      ${note ? row("MESSAGE", note) : ""}
      ${row("SENDER", isGuest ? "guest" : username)}
      ${row("SUBMITTED", submittedAt)}
    </table>
    <div style="padding:12px 24px;border-top:1px solid rgba(192,38,211,0.1);color:#3a2a5a;font-size:0.65em;letter-spacing:0.12em;">
      AJORDAN NETWORK · CONTACT SYSTEM
    </div>
  </div>
</body>
</html>`;
}

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

    const { title, message, contactInfo, preset, note } = await req.json();

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

    // Send email — failure is non-fatal; submission is already persisted
    if (resend && process.env.CONTACT_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "AJORDAN Contact <onboarding@resend.dev>",
          to: process.env.CONTACT_EMAIL,
          subject: `New Transmission — ${title.trim()}`,
          html: buildEmailHtml({
            username,
            isGuest,
            reason: title.trim(),
            contactInfo: contactInfo ? String(contactInfo).slice(0, 100) : undefined,
            preset: preset ? String(preset).slice(0, 200) : undefined,
            note: note ? String(note).slice(0, 500) : undefined,
            submittedAt: new Date().toUTCString(),
          }),
        });
      } catch (emailErr) {
        console.error("[contact] email send failed:", emailErr);
      }
    }

    return Response.json({ request });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
