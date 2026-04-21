"use client";

import { useState, useEffect, useRef } from "react";

const SUCCESS_LINES = [
  "you're in early 🔥 site drops soon — your account is ready.",
  "early bird locked 👀 something's waiting for you when we go live.",
  "nice one 💜 you're ahead of the crowd. we'll see you at launch.",
  "you made the list 🫡 real ones show up before the doors open.",
  "✨ you're on the early access list. keep an eye out — we're close.",
];

type PromoState = "idle" | "checking" | "valid" | "invalid";

export function MaintenanceScreen() {
  const [username,  setUsername]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>("idle");
  const [promoBonus, setPromoBonus] = useState<{ xpBonus: number; description: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [successLine, setSuccessLine] = useState("");
  const [promoLine,  setPromoLine]  = useState("");
  const [error,      setError]      = useState("");

  const promoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced promo code validation
  useEffect(() => {
    if (promoTimer.current) clearTimeout(promoTimer.current);
    const code = promoCode.trim();
    if (!code) { setPromoState("idle"); setPromoBonus(null); return; }
    setPromoState("checking");
    promoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/promo?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.valid) {
          setPromoState("valid");
          setPromoBonus({ xpBonus: data.xpBonus, description: data.description });
        } else {
          setPromoState("invalid");
          setPromoBonus(null);
        }
      } catch {
        setPromoState("idle");
      }
    }, 600);
  }, [promoCode]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          email: email.trim() || undefined,
          promoCode: promoCode.trim() || undefined,
          earlyAccess: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setSubmitting(false); return; }
      setSuccessLine(SUCCESS_LINES[Math.floor(Math.random() * SUCCESS_LINES.length)]);
      if (data.promoApplied) setPromoLine(`promo applied — +${data.promoApplied.xpBonus} XP stacked on your account 🎁`);
      setDone(true);
    } catch {
      setError("Connection error. Try again.");
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", boxSizing: "border-box",
    background: "rgba(0,0,0,0.55)", border: "1px solid rgba(192,38,211,0.35)",
    color: "#e0d8f0", fontFamily: "ui-monospace, monospace", fontSize: "0.9rem",
    outline: "none", letterSpacing: "0.04em",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.65rem", letterSpacing: "0.2em",
    color: "#7a4a9a", marginBottom: "5px",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2147483647,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center",
        padding: "24px", boxSizing: "border-box",
        background:
          "radial-gradient(ellipse 120% 80% at 50% 20%, rgba(124,58,237,0.22), transparent 55%), radial-gradient(ellipse 90% 60% at 80% 100%, rgba(192,38,211,0.18), transparent 50%), #030008",
        backgroundAttachment: "fixed",
        overflow: "auto",
      }}
    >
      {/* scan grid */}
      <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "linear-gradient(rgba(0,255,65,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(192,38,211,0.2) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.13) 2px, rgba(0,0,0,0.13) 4px)", pointerEvents: "none", mixBlendMode: "multiply" }} />

      {/* Heading */}
      <h1 style={{ position: "relative", margin: 0, fontFamily: "var(--font-orbitron), var(--font-vt323), system-ui, sans-serif", fontSize: "clamp(1.35rem, 5vw, 2.35rem)", fontWeight: 700, letterSpacing: "0.28em", color: "#f0e8ff", textTransform: "uppercase", textShadow: "0 0 20px rgba(192,38,211,0.9), 0 0 48px rgba(124,58,237,0.55), 0 0 80px rgba(0,255,65,0.25)", marginBottom: "clamp(16px, 3vh, 28px)" }}>
        AJORDAN is updating
      </h1>
      <p style={{ position: "relative", margin: 0, fontFamily: "var(--font-vt323), ui-monospace, monospace", fontSize: "clamp(1.15rem, 4.2vw, 1.85rem)", letterSpacing: "0.32em", color: "#00ff41", textShadow: "0 0 14px rgba(0,255,65,0.85), 0 0 36px rgba(0,255,65,0.35)", marginBottom: "clamp(28px, 5vh, 44px)" }}>
        Back soon.
      </p>

      {/* Sign-up card */}
      <div style={{ position: "relative", width: "100%", maxWidth: "380px", background: "rgba(8,0,18,0.92)", border: "1px solid rgba(192,38,211,0.45)", boxShadow: "0 0 40px rgba(192,38,211,0.12), inset 0 0 30px rgba(0,0,0,0.3)", padding: "clamp(20px, 4vw, 28px)", textAlign: "left" }}>

        {/* top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, rgba(192,38,211,0.7) 40%, rgba(192,38,211,0.7) 60%, transparent)" }} />

        {done ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ fontFamily: "var(--font-vt323), monospace", fontSize: "1.6rem", color: "#00ff41", letterSpacing: "0.2em", textShadow: "0 0 14px rgba(0,255,65,0.8)", marginBottom: "12px" }}>
              YOU&apos;RE IN ✓
            </div>
            <div style={{ color: "#c8b8e0", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: promoLine ? "14px" : "0" }}>
              {successLine}
            </div>
            {promoLine && (
              <div style={{ marginTop: "12px", fontSize: "0.78rem", color: "#00e5ff", letterSpacing: "0.08em", border: "1px solid rgba(0,229,255,0.2)", padding: "6px 12px" }}>
                {promoLine}
              </div>
            )}
            <div style={{ marginTop: "18px", fontSize: "0.65rem", color: "#4a3a6a", letterSpacing: "0.14em" }}>
              @{username} · EARLY ACCESS
            </div>
          </div>
        ) : (
          /* ── Sign-up form ── */
          <>
            <div style={{ fontFamily: "var(--font-vt323), monospace", fontSize: "0.9rem", color: "#6a3a8a", letterSpacing: "0.22em", marginBottom: "18px" }}>
              // JOIN EARLY //
            </div>

            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>USERNAME</label>
                <input style={inputStyle} type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="yourhandle" maxLength={20} autoComplete="username" required />
              </div>

              <div>
                <label style={labelStyle}>EMAIL <span style={{ color: "#3a2a5a" }}>(recommended — for updates)</span></label>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>

              <div>
                <label style={labelStyle}>PASSWORD</label>
                <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min 6 characters" minLength={6} autoComplete="new-password" required />
              </div>

              <div>
                <label style={labelStyle}>
                  PROMO CODE <span style={{ color: "#3a2a5a" }}>(optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...inputStyle, paddingRight: "32px", textTransform: "uppercase", letterSpacing: "0.14em" }}
                    type="text"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={32}
                    autoComplete="off"
                  />
                  {promoState === "checking" && (
                    <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "#5a4a7a" }}>…</span>
                  )}
                  {promoState === "valid" && (
                    <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#00ff41" }}>✓</span>
                  )}
                  {promoState === "invalid" && (
                    <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#ff4444" }}>✗</span>
                  )}
                </div>
                {promoState === "valid" && promoBonus && (
                  <div style={{ marginTop: "4px", fontSize: "0.68rem", color: "#00e5ff", letterSpacing: "0.1em" }}>
                    +{promoBonus.xpBonus} XP — {promoBonus.description}
                  </div>
                )}
                {promoState === "invalid" && (
                  <div style={{ marginTop: "4px", fontSize: "0.68rem", color: "#884444", letterSpacing: "0.08em" }}>
                    code not recognized
                  </div>
                )}
              </div>

              {error && (
                <div style={{ fontSize: "0.75rem", color: "#ff5555", letterSpacing: "0.1em", textAlign: "center" }}>
                  ✗ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: "4px", width: "100%", padding: "13px 0",
                  background: submitting ? "rgba(192,38,211,0.2)" : "rgba(192,38,211,0.1)",
                  border: "1px solid rgba(192,38,211,0.7)",
                  color: "#e879f9", fontFamily: "var(--font-vt323), monospace",
                  fontSize: "1.1rem", letterSpacing: "0.22em",
                  cursor: submitting ? "not-allowed" : "pointer",
                  textShadow: "0 0 10px rgba(192,38,211,0.5)",
                  transition: "all 0.18s",
                }}
              >
                {submitting ? "LOCKING IN..." : "LOCK IN EARLY SPOT"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
