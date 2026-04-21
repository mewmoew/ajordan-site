import { addRequest, getAccount, getRequestsByUser, getSession, getUserById, updateAccount } from "@/lib/db";
import { cookies } from "next/headers";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function rankFromPoints(points: number): string {
  if (points >= 1800) return "NETWORK CORE";
  if (points >= 800)  return "TRUSTED";
  if (points >= 350)  return "ESTABLISHED";
  if (points >= 100)  return "ACTIVE NODE";
  return "NEW MEMBER";
}

const SUBMISSION_LABELS: Record<string, string> = {
  free:      "Standard",
  tb_unlock: "Priority",
  priority:  "Deep Work",
};

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
  submissionType: string;
  tbSpent: number;
  userRank?: string;
  xpAtSubmission?: number;
  streakAtSubmission?: number;
  submittedAt: string;
}): string {
  const {
    username, isGuest, reason, contactInfo, preset, note,
    submissionType, tbSpent, userRank, xpAtSubmission, streakAtSubmission, submittedAt,
  } = data;

  const typeLabel = SUBMISSION_LABELS[submissionType] ?? submissionType;
  const typeBadgeColor = submissionType === "priority" ? "#00e5ff" : submissionType === "tb_unlock" ? "#00bcd4" : "#5a7a6a";

  const row = (label: string, value: string, accent?: string) => `
    <tr>
      <td style="padding:9px 16px;border-bottom:1px solid #150a25;color:#5a4a7a;font-size:0.7em;letter-spacing:0.16em;white-space:nowrap;vertical-align:top;width:140px;">${label}</td>
      <td style="padding:9px 16px;border-bottom:1px solid #150a25;color:${accent ?? "#e0d8f0"};font-size:0.88em;white-space:pre-wrap;word-break:break-word;">${escHtml(value)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#07070f;font-family:monospace;">
  <div style="max-width:580px;margin:0 auto;background:#0d0d18;border:1px solid rgba(192,38,211,0.35);border-top:3px solid #c026d3;">
    <div style="padding:20px 24px 16px;border-bottom:1px solid rgba(192,38,211,0.15);display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <div>
        <div style="color:#c026d3;font-size:1.25em;letter-spacing:0.22em;">// NEW TRANSMISSION //</div>
        <div style="color:#5a4a7a;font-size:0.7em;letter-spacing:0.14em;margin-top:3px;">AJORDAN Contact Form</div>
      </div>
      <div style="margin-left:auto;background:rgba(0,0,0,0.4);border:1px solid ${typeBadgeColor}33;color:${typeBadgeColor};font-size:0.7em;padding:3px 10px;letter-spacing:0.18em;">
        ${typeLabel.toUpperCase()}${tbSpent > 0 ? ` · ${tbSpent} TB` : ""}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${row("REASON", reason)}
      ${contactInfo ? row("CONTACT", contactInfo) : ""}
      ${preset ? row("QUICK SELECT", preset) : ""}
      ${note ? row("MESSAGE", note) : ""}
      ${row("SENDER", isGuest ? "guest" : username)}
      ${userRank ? row("RANK", userRank, "#7ac8d8") : ""}
      ${xpAtSubmission !== undefined ? row("TB BALANCE", `${xpAtSubmission} pts`) : ""}
      ${streakAtSubmission !== undefined ? row("STREAK", `${streakAtSubmission}d`) : ""}
      ${row("SUBMITTED", submittedAt)}
    </table>
    <div style="padding:10px 24px;border-top:1px solid rgba(192,38,211,0.08);color:#3a2a5a;font-size:0.62em;letter-spacing:0.12em;">
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
    if (!sessionId) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = getSession(sessionId);
    if (!session) return Response.json({ error: "Session expired" }, { status: 401 });

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
        if (user) { userId = user.id; username = user.username; isGuest = false; }
      }
    }

    const body = await req.json();
    const {
      title, message, contactInfo, preset, note,
      submissionType = "free",
      tbCost = 0,
    } = body as {
      title: string; message: string; contactInfo?: string;
      preset?: string; note?: string;
      submissionType?: "free" | "tb_unlock" | "priority";
      tbCost?: number;
    };

    if (!title || typeof title !== "string" || !title.trim())
      return Response.json({ error: "Title required" }, { status: 400 });
    if (!message || typeof message !== "string" || !message.trim())
      return Response.json({ error: "Message required" }, { status: 400 });
    if (title.length > 100)
      return Response.json({ error: "Title too long (max 100 chars)" }, { status: 400 });
    if (message.length > 2000)
      return Response.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });

    // TB deduction — server-side authoritative check
    let actualTbSpent = 0;
    let account = !isGuest ? getAccount(userId) : null;

    if (tbCost > 0) {
      if (isGuest) return Response.json({ error: "Sign in to use TB" }, { status: 401 });
      if (!account || account.points < tbCost)
        return Response.json({ error: "Insufficient TB balance" }, { status: 402 });
      account = updateAccount(userId, { points: account.points - tbCost });
      actualTbSpent = tbCost;
    }

    // Capture rank snapshot at submission time
    const userRank      = account ? rankFromPoints(account.points) : undefined;
    const xpAtSub       = account ? account.points : undefined;
    const streakAtSub   = account ? account.dailyStreak : undefined;

    const request = addRequest(
      userId,
      username,
      title.trim(),
      message.trim(),
      isGuest,
      contactInfo ? String(contactInfo).slice(0, 100) : undefined,
      submissionType,
      actualTbSpent || undefined,
      userRank,
      xpAtSub,
      streakAtSub,
      preset ? String(preset).slice(0, 200) : undefined,
    );

    // Email — non-fatal if it fails
    if (resend && process.env.CONTACT_EMAIL) {
      try {
        const typeLabel = SUBMISSION_LABELS[submissionType] ?? submissionType;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "AJORDAN Contact <onboarding@resend.dev>",
          to: process.env.CONTACT_EMAIL,
          subject: `[${typeLabel.toUpperCase()}] New Transmission — ${title.trim()}`,
          html: buildEmailHtml({
            username,
            isGuest,
            reason: title.trim(),
            contactInfo: contactInfo ? String(contactInfo).slice(0, 100) : undefined,
            preset: preset ? String(preset).slice(0, 200) : undefined,
            note: note ? String(note).slice(0, 500) : undefined,
            submissionType,
            tbSpent: actualTbSpent,
            userRank,
            xpAtSubmission: xpAtSub,
            streakAtSubmission: streakAtSub,
            submittedAt: new Date().toUTCString(),
          }),
        });
      } catch (emailErr) {
        console.error("[contact] email send failed:", emailErr);
      }
    }

    // Return updated balance so client can refresh without an extra round-trip
    return Response.json({
      request,
      ...(actualTbSpent > 0 && account ? { newTbBalance: account.points } : {}),
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
