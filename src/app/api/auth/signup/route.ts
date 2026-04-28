import { createUser, getUserByUsername, getUsers, createSession, grantStarterRewards, initDropsIfEmpty, redeemPromoCode } from "@/lib/db";
import { cookies } from "next/headers";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const WELCOME_MESSAGES = [
  "yoo fam 🔥 site will be up soon — you just locked in your early spot. something's waiting for you when we go live.",
  "early bird spotted 👀 we see you. site's almost ready and you're already in before the crowd hits.",
  "yo you caught us before launch — that's the move 🚀 early members get first access when the network drops.",
  "fam you're early as hell 💜 site's cooking. when we drop, you'll already have a head start on everyone.",
  "nice timing ✨ you just got on the early list. something real is waiting for you when ajordan.xyz goes live.",
  "you're in 🫡 not everyone gets this early. site drops soon and you'll be ahead of the wave.",
  "aye you showed up before the doors even opened 🔓 that means something here. see you on the other side.",
  "real ones show up early 💎 site's almost ready. you'll be one of the first to hit the network.",
];

function buildWelcomeEmail(username: string, promoApplied?: { xpBonus: number; description: string }): string {
  const msg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
  const promoBlock = promoApplied ? `
    <div style="margin:20px 0;padding:14px 18px;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.25);border-left:3px solid #00e5ff;">
      <div style="color:#00e5ff;font-size:0.85em;letter-spacing:0.14em;margin-bottom:4px;">PROMO CODE APPLIED</div>
      <div style="color:#c8d8e0;font-size:0.92em;">${promoApplied.description} — <strong style="color:#00e5ff;">+${promoApplied.xpBonus} XP</strong> already stacked on your account.</div>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#07070f;font-family:monospace;">
  <div style="max-width:520px;margin:0 auto;background:#0d0d18;border:1px solid rgba(192,38,211,0.3);border-top:3px solid #c026d3;">
    <div style="padding:22px 24px 16px;border-bottom:1px solid rgba(192,38,211,0.15);">
      <div style="color:#c026d3;font-size:1.2em;letter-spacing:0.22em;">// AJORDAN NETWORK //</div>
      <div style="color:#5a4a7a;font-size:0.7em;letter-spacing:0.14em;margin-top:4px;">EARLY ACCESS CONFIRMED</div>
    </div>
    <div style="padding:22px 24px;">
      <div style="color:#e0d8f0;font-size:1.05em;line-height:1.65;margin-bottom:18px;">
        <strong style="color:#00ff41;letter-spacing:0.08em;">@${username}</strong> — ${msg}
      </div>
      ${promoBlock}
      <div style="color:#4a3a6a;font-size:0.75em;letter-spacing:0.1em;line-height:1.6;margin-top:18px;border-top:1px solid rgba(192,38,211,0.1);padding-top:14px;">
        when we launch, sign in with your username and your account will already be set up.<br>
        keep an eye out — we're close.
      </div>
    </div>
    <div style="padding:10px 24px;border-top:1px solid rgba(192,38,211,0.08);color:#3a2a5a;font-size:0.62em;letter-spacing:0.12em;">
      AJORDAN NETWORK · EARLY ACCESS
    </div>
  </div>
</body>
</html>`;
}

function buildOwnerNotificationEmail(
  username: string,
  email: string | undefined,
  promoApplied: { xpBonus: number; description: string } | undefined,
  earlyAccessCount: number,
): string {
  const promoRow = promoApplied
    ? `<tr><td style="padding:8px 16px;border-bottom:1px solid #150a25;color:#5a4a7a;font-size:0.7em;letter-spacing:0.16em;width:130px;">PROMO</td><td style="padding:8px 16px;border-bottom:1px solid #150a25;color:#00e5ff;font-size:0.85em;">${promoApplied.description} · +${promoApplied.xpBonus} XP</td></tr>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#07070f;font-family:monospace;">
  <div style="max-width:520px;margin:0 auto;background:#0d0d18;border:1px solid rgba(0,255,65,0.25);border-top:3px solid #00ff41;">
    <div style="padding:18px 24px 14px;border-bottom:1px solid rgba(0,255,65,0.1);">
      <div style="color:#00ff41;font-size:1.1em;letter-spacing:0.22em;">// NEW EARLY SIGNUP //</div>
      <div style="color:#3a6a3a;font-size:0.7em;letter-spacing:0.14em;margin-top:3px;">AJORDAN NETWORK · EARLY ACCESS</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 16px;border-bottom:1px solid #150a25;color:#5a4a7a;font-size:0.7em;letter-spacing:0.16em;width:130px;">USERNAME</td><td style="padding:8px 16px;border-bottom:1px solid #150a25;color:#00ff41;font-size:0.9em;letter-spacing:0.08em;">@${username}</td></tr>
      <tr><td style="padding:8px 16px;border-bottom:1px solid #150a25;color:#5a4a7a;font-size:0.7em;letter-spacing:0.16em;">EMAIL</td><td style="padding:8px 16px;border-bottom:1px solid #150a25;color:#e0d8f0;font-size:0.85em;">${email ?? "—"}</td></tr>
      ${promoRow}
      <tr><td style="padding:8px 16px;color:#5a4a7a;font-size:0.7em;letter-spacing:0.16em;">TOTAL EARLY</td><td style="padding:8px 16px;color:#c026d3;font-size:0.85em;">${earlyAccessCount} signed up</td></tr>
    </table>
    <div style="padding:10px 24px;border-top:1px solid rgba(0,255,65,0.08);color:#2a4a2a;font-size:0.62em;letter-spacing:0.12em;">
      AJORDAN NETWORK · EARLY ACCESS NOTIFICATION
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { username, password, email, promoCode, earlyAccess } = await req.json();

    if (!username || !password)
      return Response.json({ error: "Username and password required" }, { status: 400 });
    if (username.length < 3 || username.length > 20)
      return Response.json({ error: "Username must be 3–20 characters" }, { status: 400 });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return Response.json({ error: "Username: letters, numbers, underscores only" }, { status: 400 });
    if (password.length < 6)
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Response.json({ error: "Invalid email address" }, { status: 400 });

    const existing = getUserByUsername(username);
    if (existing) return Response.json({ error: "Username already taken" }, { status: 409 });

    const user = createUser(username, password, email?.trim() || undefined, earlyAccess === true);
    grantStarterRewards(user.id);
    initDropsIfEmpty();
    const session = createSession(user.id);

    // Apply promo code if provided
    let promoApplied: { xpBonus: number; description: string } | undefined;
    if (promoCode?.trim()) {
      const result = redeemPromoCode(promoCode.trim(), user.id, username);
      if (result) promoApplied = { xpBonus: result.xpBonus, description: result.description };
    }

    const cookieStore = await cookies();
    cookieStore.set("session_id", session.id, {
      httpOnly: true, path: "/", maxAge: 30 * 24 * 60 * 60, sameSite: "lax",
    });

    const trimmedEmail = email?.trim() || undefined;
    const earlyAccessCount = getUsers().filter(u => u.earlyAccess).length;

    // Welcome email to the new user (non-fatal)
    if (resend && trimmedEmail && process.env.RESEND_FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: trimmedEmail,
          subject: "you're in early 🔥 — AJORDAN Network",
          html: buildWelcomeEmail(username, promoApplied),
        });
      } catch (err) {
        console.error("[signup] welcome email failed:", err);
      }
    }

    // Owner notification email (non-fatal)
    if (resend && process.env.CONTACT_EMAIL && process.env.RESEND_FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: process.env.CONTACT_EMAIL,
          subject: `New Early Signup — @${username}`,
          html: buildOwnerNotificationEmail(username, trimmedEmail, promoApplied, earlyAccessCount),
        });
      } catch (err) {
        console.error("[signup] owner notification failed:", err);
      }
    }

    return Response.json({
      id: user.id,
      username: user.username,
      ...(promoApplied ? { promoApplied } : {}),
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
