"use client";

import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";

/* ── types ─────────────────────────────────────────────── */

interface User { id: string; username: string }
interface PrivReq { id: string; username: string; title: string; message: string; status: string; createdAt: string }

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic" | "ultra_rare";

interface InvEntry {
  id: string;
  itemId: string;
  itemName: string;
  itemIcon: string;
  quantity: number;
  rarity: Rarity;
  stackable: boolean;
  acquiredAt: string;
  tradableAt: string;
  source: string;
  status: "held" | "tradable";
  estimatedValue: number;
  effect: string;
  effectDescription: string;
  flavorText?: string;
  fuseMin?: number;
  fusesInto?: string;
}


type FeedType = "claim" | "drop_enter" | "win" | "whisker" | "general";

interface FeedItem {
  id: string;
  text: string;
  t: number;
  type: FeedType;
}

interface VaultData {
  points: number;
  canClaim: boolean;
  nextClaimAt: string | null;
  claimAmount: number;
  dailyStreak: number;
  inventory: InvEntry[];
}


/* ── static feed data ───────────────────────────────────── */

/* ══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */

export default function Home() {
  /* ── auth state ── */
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);


  const wttPanelRef = useRef<HTMLDivElement>(null);
  const [myRequests, setMyRequests] = useState<PrivReq[]>([]);

  function scrollToWTT() {
    wttPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── vault / economy ── */
  const [vault, setVault] = useState<VaultData | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimFlash, setClaimFlash] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  /* ── signal level-up toast ── */
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const prevLevelRef = useRef<number>(0);

  /* ── win moment toast ── */
  const [winToast, setWinToast] = useState<string | null>(null);

  /* ── async error states ── */
  /* ── activity feed ── */
  // SSR initial state uses t:0 so server/client HTML are identical.
  // Real timestamps injected in useEffect (client-only).
  const [activityFeed, setActivityFeed] = useState<FeedItem[]>([
    { id: "seed-1", text: "signal_node claimed daily TB",    t: 0, type: "claim"   },
    { id: "seed-2", text: "ghost_user unlocked access",      t: 0, type: "general" },
    { id: "seed-3", text: "0xwave claimed daily TB",         t: 0, type: "claim"   },
    { id: "seed-4", text: "static_rift booked a 1:1",        t: 0, type: "general" },
  ]);

  /* ── item detail modal ── */
  const [selectedItem, setSelectedItem] = useState<InvEntry | null>(null);

  /* ── countdown tick (1s interval — drives all timers) ── */
  const [, setTick] = useState(0);

  /* ── contact modal ── */
  const [showContact, setShowContact] = useState(false);
  const [contactXUser, setContactXUser] = useState("");
  const [contactReason, setContactReason] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [contactPreset, setContactPreset] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState("");
  const [showTherapeuticHint, setShowTherapeuticHint] = useState(false);

  /* ── intro overlay ── */
  const [showIntro, setShowIntro] = useState(false);
  const introVideoRef = useRef<HTMLVideoElement>(null);

  /* ── onboarding tour ── */
  // -1 = not showing, 0..6 = step index
  const [tourStep, setTourStep] = useState(-1);

  /* ── phone CTA ── */
  const [mounted, setMounted] = useState(false);
  const [phoneTucked, setPhoneTucked] = useState(false);
  const [phoneRaised, setPhoneRaised] = useState(false);

  /* pecanTimer removed — paw widget now derives countdown from nextDropTarget() + tick */

  /* ── auth: check session on mount ── */
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  /* ── intro overlay: show once per session ── */
  useEffect(() => {
    if (!sessionStorage.getItem("intro_seen")) {
      setShowIntro(true);
      setTimeout(() => {
        introVideoRef.current?.play().catch(() => {});
      }, 50);
    }
  }, []);

  function skipIntro() {
    setShowIntro(false);
    sessionStorage.setItem("intro_seen", "1");
    // Guide auto-trigger is handled by the auth-gated effect below — not here
  }
  const enterSite = skipIntro; // alias — same action, cleaner label

  /* ── mark client mount so server/client renders always match ── */
  useEffect(() => { setMounted(true); }, []);


  /* ── populate activity feed timestamps client-side only ──
     Keeps SSR HTML (t:0) identical to initial hydration HTML;
     real relative times appear after mount. */
  useEffect(() => {
    const now = Date.now();
    setActivityFeed([
      { id: "seed-1", text: "signal_node claimed daily TB",          t: now - 120_000,   type: "claim"   },
      { id: "seed-2", text: "ghost_user unlocked Tier I access",     t: now - 360_000,   type: "general" },
      { id: "seed-3", text: "0xwave claimed daily TB",               t: now - 610_000,   type: "claim"   },
      { id: "seed-4", text: "pulse_rx booked a 1:1 session",         t: now - 820_000,   type: "general" },
      { id: "seed-5", text: "static_rift reserved a priority slot",  t: now - 900_000,   type: "general" },
      { id: "seed-6", text: "nova_grid built activity streak: 7d",   t: now - 1_500_000, type: "claim"   },
      { id: "seed-7", text: "echo_signal sent a project request",    t: now - 1_900_000, type: "general" },
      { id: "seed-8", text: "zero_flux claimed daily TB",            t: now - 2_100_000, type: "claim"   },
    ]);
  }, []);

  /* ── onboarding tour: auto-show once per session after login/signup ──
     Requires user to be authenticated AND intro to be finished.
     Uses sessionStorage("guide_shown") so it only auto-fires once per tab session.
     Manual replay via "How it works" button is always available while logged in. */
  useEffect(() => {
    if (!user || showIntro) return;
    if (sessionStorage.getItem("guide_shown")) return;
    const t = setTimeout(() => {
      setTourStep(0);
      sessionStorage.setItem("guide_shown", "1");
    }, 1000);
    return () => clearTimeout(t);
  }, [user, showIntro]);

  /* ── phone CTA: appear after scrolling past the hero section ── */
  useEffect(() => {
    const THRESHOLD = 320; // px scrolled before phone slides up
    function onScroll() {
      const scrolled = window.scrollY > THRESHOLD;
      setPhoneTucked(scrolled);
      if (!scrolled) setPhoneRaised(false);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on mount in case page loads mid-scroll
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/requests").then(r => r.json()).then(d => { if (d.requests) setMyRequests(d.requests); }).catch(() => {});
  }, [user]);

  /* ── countdown tick ── */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);


  /* ── load vault on login → feeds Signal Profile immediately ── */
  useEffect(() => {
    if (!user) return;
    fetchVault();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── auth handlers ── */
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUser, password: authPass }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Error"); return; }
      setUser(data);
      setShowAuth(false);
      setAuthUser(""); setAuthPass("");
    } catch { setAuthError("Network error"); }
    finally { setAuthSubmitting(false); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTourStep(-1); // close guide if open
    sessionStorage.removeItem("guide_shown"); // allow guide to re-show on next login
    setMyRequests([]);
  }

  /* ── vault / drops handlers ── */
  async function fetchVault() {
    setVaultLoading(true);
    try {
      const r = await fetch("/api/account");
      const d = await r.json();
      if (!d.error) setVault(d as VaultData);
    } catch {}
    setVaultLoading(false);
  }

  async function claimDaily() {
    if (claimLoading) return;
    setClaimLoading(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/account/daily-claim", { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        const streakMsg = d.streakBonus > 0
          ? ` · STREAK ×${d.streak} +${d.streakBonus} BONUS`
          : ` · STREAK ×${d.streak}`;
        const whiskerMsg = d.whiskersGranted > 0 ? ` · 〜 +${d.whiskersGranted} WHISKER` : "";
        setClaimMsg(`+${d.gained} TB RECEIVED${streakMsg}${whiskerMsg}`);
        setClaimFlash(true);
        setTimeout(() => setClaimFlash(false), 1000);
        setTimeout(() => setClaimMsg(null), 5000);
        fetchVault();
        addFeedItem(`${user?.username ?? "user"} claimed daily reward`, "claim");
        if (d.whiskersGranted > 0) {
          setTimeout(() => addFeedItem(`${user?.username ?? "user"} received Cat Whisker`, "whisker"), 600);
          setTimeout(() => fireWinToast("〜 BOOST APPLIED — ASSET RECEIVED"), 400);
          haptic(60);
        } else {
          fireWinToast(`⚡ +${d.gained} TB RECEIVED`);
          haptic(45);
        }
      } else {
        setClaimMsg(d.error ?? "Error");
        setTimeout(() => setClaimMsg(null), 3000);
      }
    } catch { setClaimMsg("Claim failed — retry"); }
    setClaimLoading(false);
  }

  /* ── countdown helpers ── */
  function fmtCountdown(isoTarget: string): string {
    const ms = new Date(isoTarget).getTime() - Date.now();
    if (ms <= 0) return "00:00:00";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    if (h >= 24) {
      const days = Math.floor(h / 24);
      return `${days}d ${h % 24}h`;
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /* ── item image map ─────────────────────────────────────
     Maps itemId → public image path. Falls back to emoji icon
     if itemId is not in the map. */
  const ITEM_IMAGES: Record<string, string> = {
    cat_whisker:  "/cat_whisker.png",
    signal_chip:  "/signal_chip.png",
    todd_bucks:   "/todd_bucks.gif",
    void_crystal: "/void_crystal.png",
  };
  function itemImgSrc(itemId: string): string | null {
    return ITEM_IMAGES[itemId] ?? null;
  }

  function rarityClass(r: Rarity) { return `rarity-${r}`; }
  function rarityLabel(r: Rarity) {
    if (r === "mythic")     return "✦ MYTHIC";
    if (r === "ultra_rare") return "✦ MYTHIC";   // legacy alias
    if (r === "legendary")  return "★ LEGENDARY";
    if (r === "epic")       return "◈ EPIC";
    if (r === "rare")       return "◆ RARE";
    return "COMMON";
  }
  /* ── helpers ── */
  function fmtTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode); setAuthError(""); setShowAuth(true);
  };

  /* ── signal level system (5-tier, multi-factor) ── */
  interface SignalLevel {
    level: number;
    label: string;
    color: string;
    score: number;
    nextThreshold: number; // -1 when max
    progress: number;      // 0–100
  }

  const SIGNAL_LEVEL_DEFS = [
    { level: 1, label: "NEW MEMBER",      color: "#7a5a8a", threshold: 0    },
    { level: 2, label: "ACTIVE NODE",     color: "#c026d3", threshold: 100  },
    { level: 3, label: "ESTABLISHED",     color: "#7c3aed", threshold: 350  },
    { level: 4, label: "TRUSTED",         color: "#ffd700", threshold: 800  },
    { level: 5, label: "NETWORK CORE",    color: "#ff00e5", threshold: 1800 },
  ] as const;

  function computeSignalScore(v: VaultData): number {
    let score = v.points;
    score += v.dailyStreak * 2;
    v.inventory.forEach(item => {
      if (item.itemId === "cat_whisker")  score += item.quantity * 15;
      else if (item.itemId === "todd_bucks") score += item.quantity * 100;
      else if (item.rarity === "mythic" || item.rarity === "ultra_rare") score += 50;
      else if (item.rarity === "legendary") score += 25;
      else if (item.rarity === "epic")      score += 15;
      else if (item.rarity === "rare")      score += 10;
    });
    return score;
  }

  function getSignalLevel(v: VaultData): SignalLevel {
    const score = computeSignalScore(v);
    let def = SIGNAL_LEVEL_DEFS[0] as typeof SIGNAL_LEVEL_DEFS[number];
    for (const d of SIGNAL_LEVEL_DEFS) {
      if (score >= d.threshold) def = d;
    }
    const idx = SIGNAL_LEVEL_DEFS.findIndex(d => d.level === def.level);
    const next = SIGNAL_LEVEL_DEFS[idx + 1] as typeof SIGNAL_LEVEL_DEFS[number] | undefined;
    const lo = def.threshold;
    const hi = next ? next.threshold : lo + 500;
    const progress = next
      ? Math.min(100, Math.round(((score - lo) / (hi - lo)) * 100))
      : 100;
    return {
      level: def.level,
      label: def.label,
      color: def.color,
      score,
      nextThreshold: next ? next.threshold : -1,
      progress,
    };
  }

  /* ── live feed: age label ── */
  function fmtFeedAge(t: number): string {
    if (t === 0) return "now";
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  }

  /* ── live feed: prepend a real event (client-only, always safe) ── */
  function addFeedItem(text: string, type: FeedType) {
    setActivityFeed(prev => [
      { id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, t: Date.now(), type },
      ...prev.slice(0, 9),
    ]);
  }

  /* ── win moment toast: show briefly then auto-clear ── */
  function fireWinToast(msg: string) {
    setWinToast(null); // reset if already showing
    requestAnimationFrame(() => {
      setWinToast(msg);
      setTimeout(() => setWinToast(null), 2900);
    });
  }

  /* ── haptic: light vibration on mobile (silent if unsupported) ── */
  function haptic(ms = 40) {
    try { (navigator as Navigator & { vibrate?: (ms: number) => void }).vibrate?.(ms); } catch {}
  }

  /* ── signal level-up detection ── */
  useEffect(() => {
    if (!vault) return;
    const lvl = getSignalLevel(vault);
    if (prevLevelRef.current > 0 && lvl.level > prevLevelRef.current) {
      setLevelUpMsg(`ACTIVITY SIGNAL LEVEL UP → ${lvl.label}`);
      setTimeout(() => setLevelUpMsg(null), 3800);
    }
    prevLevelRef.current = lvl.level;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault]);

  function openContactModal() {
    setContactXUser(""); setContactReason(""); setContactNote("");
    setContactPreset(""); setContactSent(false); setShowContact(true);
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactReason || contactSending) return;
    setContactSending(true);
    setContactError("");
    try {
      const contactVal = contactXUser.trim();
      const xPart = contactVal ? `Contact: ${contactVal}` : "";
      const notePart = contactNote.trim();
      const message = [xPart, notePart].filter(Boolean).join("\n\n") || "(no details provided)";
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: contactReason,
          message,
          contactInfo: contactVal || undefined,
          preset: contactPreset || undefined,
          note: notePart || undefined,
        }),
      });
      if (res.ok) {
        setContactSent(true);
        setTimeout(() => { setShowContact(false); setContactSent(false); }, 2500);
        if (user) {
          fetch("/api/requests").then(r => r.json()).then(d => { if (d.requests) setMyRequests(d.requests); }).catch(() => {});
          addFeedItem(`${user.username} sent a transmission`, "general");
        }
      } else {
        setContactError("Transmission failed. Please try again.");
      }
    } catch {
      setContactError("Transmission failed. Please try again.");
    }
    setContactSending(false);
  }

  /* ══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── GALAXY BACKGROUND ── */}
      <div id="galaxy-bg">
        <div className="stars-sm" />
        <div className="stars-lg" />
        <div className="nebula-1" />
        <div className="nebula-2" />
        <div className="nebula-3" />
      </div>

      {/* ── MAIN BACKGROUND IMAGE ── */}
      <div id="mainbg-wrap">
        <div id="mainbg-overlay" />
      </div>

      {/* ── CRT SCANLINES ── */}
      <div className="crt-scanlines" />

      {/* ── INTRO OVERLAY ── */}
      {showIntro && (
        <div id="introOverlay" onClick={enterSite}>
          <video
            ref={introVideoRef}
            id="introVideo"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/intro.mp4" type="video/mp4" />
          </video>
          <div id="introGlow" />
          <div id="introScanlines" />
          <div id="introText">TRANSMISSION INITIALIZING...</div>
          {/* ENTER button — centered, prominent */}
          <button id="introEnter" onClick={e => { e.stopPropagation(); enterSite(); }}>
            ENTER
          </button>
          {/* SKIP — subtle, bottom-right */}
          <button id="introSkip" onClick={e => { e.stopPropagation(); skipIntro(); }}>SKIP</button>
        </div>
      )}

      {/* ── PHONE CTA — always in DOM; translateY handles peek/raise/hide ── */}
      <div
        id="phoneCTA"
        style={{
          position: "fixed",
          left: "22px",
          bottom: "20px",
          width: "140px",
          zIndex: 9000,
          cursor: "pointer",
          /* translateY(65%) = bottom 65% hidden, top 35% peeks above viewport bottom */
          transform: !mounted || !phoneTucked
            ? "translateY(120%)"
            : phoneRaised ? "translateY(0%)" : "translateY(65%)",
          opacity: mounted && phoneTucked ? 1 : 0,
          pointerEvents: mounted && phoneTucked ? "auto" : "none",
          transition: "transform 0.52s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
        }}
        onMouseEnter={() => setPhoneRaised(true)}
        onMouseLeave={() => setPhoneRaised(false)}
        onClick={openContactModal}
      >
        <img
          src="/phone.png"
          alt="Contact"
          style={{
            width: "100%",
            display: "block",
            transition: "filter 0.35s",
            filter: phoneRaised
              ? "drop-shadow(0 0 12px rgba(0,255,65,0.7)) drop-shadow(0 0 24px rgba(0,255,65,0.35))"
              : "none",
            animation: mounted && phoneRaised
              ? "phoneFloat 3.5s ease-in-out infinite, phoneGlowPulse 4.5s ease-in-out infinite"
              : "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "18%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            fontFamily: "var(--font-vt323),'VT323',monospace",
            fontSize: "0.92rem",
            letterSpacing: "0.1em",
            color: "#00ff41",
            textShadow: "0 0 8px #00ff41, 0 0 16px rgba(0,255,65,0.5)",
            textAlign: "center",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
            pointerEvents: "none",
          }}
        >
          WANT TO<br />WORK?
        </div>
      </div>

      {/* ── ITEM DETAIL MODAL ── */}
      {selectedItem && (() => {
        const isMythic = selectedItem.rarity === "mythic" || selectedItem.rarity === "ultra_rare";
        const isLegendary = selectedItem.rarity === "legendary";
        const isEpic = selectedItem.rarity === "epic";
        const boxClass = `item-detail-box${isMythic ? " detail-mythic" : isLegendary ? " detail-legendary" : isEpic ? " detail-epic" : ""}`;
        return (
          <div className="item-detail-overlay" onClick={() => setSelectedItem(null)}>
            <div className={boxClass} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedItem(null)} style={{ position: "absolute", top: "14px", right: "16px", color: isMythic ? "#ff00e5" : isEpic ? "#9333ea" : "#c026d3", background: "none", border: "none", cursor: "pointer", fontSize: "1.6rem", lineHeight: 1 }}>×</button>

              {/* Rarity badge */}
              <div className={`rarity-badge ${rarityClass(selectedItem.rarity)}`} style={{ marginBottom: "10px" }}>
                {rarityLabel(selectedItem.rarity)}
              </div>

              {/* Icon / image */}
              <div className={`item-detail-icon${isMythic ? " icon-mythic" : isLegendary ? " icon-legendary" : isEpic ? " icon-epic" : ""}`}>
                {itemImgSrc(selectedItem.itemId) ? (
                  <img
                    src={itemImgSrc(selectedItem.itemId)!}
                    alt={selectedItem.itemName}
                    className="item-detail-img"
                    loading="lazy"
                    decoding="async"
                  />
                ) : selectedItem.itemIcon}
              </div>

              {/* Name */}
              <div className={`item-detail-name${isMythic ? " name-mythic" : isLegendary ? " name-legendary" : isEpic ? " name-epic" : ""}`}>
                {selectedItem.itemName}
              </div>

              {/* Quantity */}
              {selectedItem.stackable && (
                <div style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "1.05rem", color: isMythic ? "#cc00cc" : "#5a4a6a", letterSpacing: "0.12em", marginBottom: "6px" }}>
                  OWNED: ×{selectedItem.quantity}
                </div>
              )}

              {/* Effect description */}
              <div className="item-detail-effect">{selectedItem.effectDescription}</div>

              {/* Account benefit row */}
              {selectedItem.effect && (
                <div className="item-detail-row">
                  <span className="item-detail-row-label">BENEFIT</span>
                  <span className="item-detail-row-val" style={{ color: isMythic ? "#ff00e5" : isEpic ? "#9333ea" : isLegendary ? "#ffd700" : "#c026d3" }}>
                    {selectedItem.effect}
                  </span>
                  {selectedItem.stackable && selectedItem.quantity > 1 && (
                    <span style={{ fontSize: "0.72rem", color: "#4a3a5a" }}>× {selectedItem.quantity}</span>
                  )}
                </div>
              )}

              {/* Estimated value */}
              <div className="item-detail-row">
                <span className="item-detail-row-label">EST. VALUE</span>
                <span className="item-detail-row-val">~{selectedItem.estimatedValue} PTS</span>
                <span style={{ fontSize: "0.62rem", color: "#3a2a4a", letterSpacing: "0.08em" }}>ESTIMATED VALUE</span>
              </div>

              {/* Instance ID / serial hook */}
              <div className="item-detail-row">
                <span className="item-detail-row-label">INSTANCE</span>
                <span style={{ fontSize: "0.65rem", color: "#3a2a4a", letterSpacing: "0.08em", fontFamily: "var(--font-vt323),'VT323',monospace" }}>
                  {selectedItem.id.slice(0, 12).toUpperCase()}
                </span>
              </div>

              {/* Trade / hold status */}
              <div className="item-detail-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "5px" }}>
                <span className="item-detail-row-label">TRADE STATUS</span>
                {isMythic ? (
                  <div>
                    <div style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "0.85rem", color: "#aa00aa", letterSpacing: "0.1em" }}>ACCOUNT BOUND — VAULT ONLY</div>
                    <div style={{ fontSize: "0.65rem", color: "#5a1a5a", letterSpacing: "0.06em", marginTop: "3px" }}>Future wallet-linked utility planned. Not yet redeemable.</div>
                  </div>
                ) : selectedItem.status === "tradable" ? (
                  <div>
                    <div style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "0.88rem", color: "#00ff41", letterSpacing: "0.1em" }}>✦ READY FOR MARKET</div>
                    <div style={{ fontSize: "0.65rem", color: "#1a5a2a", letterSpacing: "0.06em", marginTop: "3px" }}>Hold period complete. Eligible for future marketplace listing.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "0.85rem", color: "#b05828", letterSpacing: "0.1em", marginBottom: "3px" }}>HOLD ACTIVE</div>
                    <div className="countdown-digits" style={{ fontSize: "0.8rem", color: "#5a3a3a" }}>TRADABLE IN {fmtCountdown(selectedItem.tradableAt)}</div>
                    <div style={{ fontSize: "0.65rem", color: "#3a1a14", letterSpacing: "0.05em", marginTop: "3px" }}>Hold items to mature them for future market listing.</div>
                  </div>
                )}
              </div>

              {/* Stackable / marketplace hook */}
              <div className="item-detail-row">
                <span className="item-detail-row-label">TYPE</span>
                <span style={{ fontSize: "0.72rem", color: "#5a4a6a", letterSpacing: "0.08em" }}>
                  {selectedItem.stackable ? "STACKABLE" : "UNIQUE"} &nbsp;·&nbsp;
                  {isMythic ? " WALLET-READY LATER" : " MARKET-LISTABLE LATER"}
                </span>
              </div>

              {/* Fusion info */}
              {selectedItem.fuseMin && selectedItem.fusesInto && (
                <div className="item-detail-row">
                  <span className="item-detail-row-label">FUSION</span>
                  <span style={{ fontSize: "0.72rem", color: "#3a2a4a", letterSpacing: "0.06em" }}>
                    {selectedItem.fuseMin}× → upgrade &nbsp;<span style={{ color: "#2a1a3a" }}>coming soon</span>
                  </span>
                </div>
              )}

              {/* Todd Bucks specific wallet note */}
              {isMythic && (
                <div className="item-detail-wallet-note">
                  Todd Bucks are the network&apos;s core currency asset. Stored in your vault now — future wallet-linked utility planned. Not active for cash use or withdrawal.
                </div>
              )}

              {/* Flavor text */}
              {selectedItem.flavorText && (
                <div className="item-detail-flavor">&ldquo;{selectedItem.flavorText}&rdquo;</div>
              )}

              {/* Acquired meta */}
              <div style={{ marginTop: "14px", fontSize: "0.62rem", color: "#2a1a2a", letterSpacing: "0.07em" }}>
                ACQUIRED: {fmtTime(selectedItem.acquiredAt)} · SOURCE: {selectedItem.source.toUpperCase()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div className="auth-overlay" onClick={() => setShowAuth(false)}>
          <div className="tp-modal-box p-8" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div className="neon-purple" style={{ fontSize: "1.15rem", letterSpacing: "0.2em" }}>
                {authMode === "login" ? "// SIGN IN //" : "// REGISTER //"}
              </div>
              <button onClick={() => setShowAuth(false)} style={{ color: "#c026d3", background: "none", border: "none", cursor: "pointer", fontSize: "1.8rem", lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleAuth}>
              <div className="auth-field">
                <label className="auth-label">USERNAME</label>
                <input type="text" value={authUser} onChange={e => setAuthUser(e.target.value)}
                  className="auth-input" placeholder="Enter username..." autoFocus maxLength={20} />
              </div>
              <div className="auth-field">
                <label className="auth-label">PASSWORD</label>
                <input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)}
                  className="auth-input" placeholder="Enter password..." maxLength={128} />
              </div>
              {authError && <div className="auth-error">{authError}</div>}
              <button type="submit" disabled={authSubmitting} className="btn-purple"
                style={{ width: "100%", padding: "10px 0", fontSize: "1rem", marginTop: "8px" }}>
                {authSubmitting ? "PROCESSING..." : authMode === "login" ? "AUTHENTICATE" : "CREATE ACCOUNT"}
              </button>
            </form>

            <p className="auth-switch" style={{ marginTop: "12px" }}>
              {authMode === "login" ? (
                <>No account?{" "}<button type="button" onClick={() => { setAuthMode("signup"); setAuthError(""); }} className="auth-link">REGISTER</button></>
              ) : (
                <>Have an account?{" "}<button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }} className="auth-link">SIGN IN</button></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── CONTACT MODAL ── */}
      {showContact && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "16px",
            overflowY: "auto",
          }}
          onClick={() => setShowContact(false)}
        >
          <div
            style={{
              background: "rgba(10,0,20,0.97)",
              border: "1px solid rgba(192,38,211,0.6)",
              boxShadow: "0 0 40px rgba(192,38,211,0.25), inset 0 0 40px rgba(0,0,0,0.5)",
              borderRadius: "2px",
              padding: "32px",
              width: "100%",
              maxWidth: "480px",
              position: "relative",
              margin: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "1.4rem", color: "#c026d3", letterSpacing: "0.2em", textShadow: "0 0 10px rgba(192,38,211,0.6)" }}>
                // CONTACT AJORDAN //
              </div>
              <button
                onClick={() => setShowContact(false)}
                style={{ color: "#c026d3", background: "none", border: "none", cursor: "pointer", fontSize: "1.8rem", lineHeight: 1 }}
              >×</button>
            </div>

            {contactSent ? (
              <div
                className="contact-success-pulse"
                style={{
                  textAlign: "center", padding: "28px 0 32px",
                  animation: "signalFadeIn 0.4s ease forwards",
                  borderRadius: "2px",
                }}
              >
                <div style={{
                  fontFamily: "var(--font-vt323),'VT323',monospace",
                  fontSize: "2.1rem", color: "#00ff41",
                  letterSpacing: "0.22em",
                  textShadow: "0 0 16px rgba(0,255,65,0.8), 0 0 32px rgba(0,255,65,0.3)",
                  marginBottom: "10px",
                }}>
                  TRANSMISSION SENT
                </div>
                <div style={{
                  width: "48px", height: "1px",
                  background: "rgba(0,255,65,0.4)",
                  margin: "0 auto 14px",
                }} />
                <div style={{ color: "#b0a0c0", fontSize: "0.88rem", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  Activity signal received. Todd will review your message.
                </div>
                <div style={{ color: "#5a8a6a", fontSize: "0.78rem", letterSpacing: "0.08em" }}>
                  Expect a reply within 24–48 hours.
                </div>
                {myRequests.length > 1 && (
                  <div style={{
                    marginTop: "18px", fontSize: "0.72rem",
                    color: "#3a6a5a", letterSpacing: "0.12em",
                    border: "1px solid rgba(0,255,65,0.12)",
                    padding: "5px 12px", display: "inline-block",
                  }}>
                    RETURNING SIGNAL DETECTED — WELCOME BACK
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={submitContact}>
                {/* X / email */}
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.18em", color: "#c026d3", marginBottom: "6px" }}>
                    X USERNAME OR EMAIL
                  </label>
                  <input
                    type="text"
                    value={contactXUser}
                    onChange={e => setContactXUser(e.target.value)}
                    placeholder="@yourhandle or email@example.com"
                    maxLength={80}
                    style={{
                      width: "100%", padding: "9px 10px",
                      background: "rgba(0,0,0,0.5)", border: "1px solid rgba(192,38,211,0.4)",
                      color: "#e0e0e0", fontFamily: "var(--font-geist-mono),'Geist Mono',monospace",
                      fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ fontSize: "0.68rem", color: "#4a2a5a", letterSpacing: "0.06em", marginTop: "4px" }}>
                    So Todd can reach you back — not required but recommended.
                  </div>
                </div>

                {/* reason buttons */}
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.18em", color: "#c026d3", marginBottom: "10px" }}>
                    REASON FOR CONTACT
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {[
                      "Creative Management",
                      "Therapeutic Help",
                      "Project Partnership",
                      "Collaboration",
                    ].map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setContactReason(reason)}
                        style={{
                          padding: "10px 8px",
                          border: `1px solid ${contactReason === reason ? "#c026d3" : "rgba(192,38,211,0.3)"}`,
                          background: contactReason === reason ? "rgba(192,38,211,0.18)" : "rgba(0,0,0,0.4)",
                          color: contactReason === reason ? "#e879f9" : "#8a6a9a",
                          fontFamily: "var(--font-vt323),'VT323',monospace",
                          fontSize: "0.9rem",
                          letterSpacing: "0.08em",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textShadow: contactReason === reason ? "0 0 8px rgba(192,38,211,0.6)" : "none",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        {reason}
                        {reason === "Therapeutic Help" && (
                          /* Wrapper owns the hover state — icon + tooltip are one zone */
                          <span
                            onMouseEnter={e => { e.stopPropagation(); setShowTherapeuticHint(true); }}
                            onMouseLeave={e => { e.stopPropagation(); setShowTherapeuticHint(false); }}
                            style={{
                              position: "relative",
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {/* icon */}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                border: "1px solid rgba(0,255,65,0.5)",
                                color: "#00ff41",
                                fontSize: "9px",
                                lineHeight: 1,
                                cursor: "help",
                                opacity: 0.8,
                              }}
                            >
                              ⓘ
                            </span>
                            {/* tooltip — absolutely anchored to the wrapper, pointerEvents:none so it never breaks hover */}
                            {showTherapeuticHint && (
                              <span
                                style={{
                                  position: "absolute",
                                  bottom: "calc(100% + 7px)",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  width: "172px",
                                  padding: "8px 10px",
                                  background: "rgba(0,8,4,0.96)",
                                  border: "1px solid rgba(0,255,65,0.2)",
                                  color: "#5a9a6a",
                                  fontSize: "0.75rem",
                                  letterSpacing: "0.05em",
                                  lineHeight: 1.55,
                                  whiteSpace: "normal",
                                  zIndex: 200,
                                  pointerEvents: "none", /* cursor passes through — no re-enter/leave flicker */
                                  boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                                }}
                              >
                                Got a lot on your mind? We&apos;re all human. Todd is here.
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* preset chips */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#5a3a6a", marginBottom: "7px" }}>
                    QUICK SELECT
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {[
                      "Need direction on a project",
                      "Looking to collaborate",
                      "Need creative help",
                      "Need support",
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className={`preset-chip${contactPreset === preset ? " active" : ""}`}
                        onClick={() => {
                          if (contactPreset === preset) {
                            setContactPreset("");
                            setContactNote("");
                          } else {
                            setContactPreset(preset);
                            setContactNote(preset);
                          }
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* notes */}
                <div style={{ marginBottom: "22px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.18em", color: "#c026d3", marginBottom: "6px" }}>
                    NOTES (OPTIONAL)
                  </label>
                  <textarea
                    value={contactNote}
                    onChange={e => { setContactNote(e.target.value); setContactPreset(""); }}
                    rows={3}
                    placeholder="Describe your project or situation..."
                    maxLength={500}
                    style={{
                      width: "100%", padding: "10px",
                      background: "rgba(0,0,0,0.5)", border: "1px solid rgba(192,38,211,0.35)",
                      color: "#e0e0e0", fontFamily: "var(--font-geist-mono),'Geist Mono',monospace",
                      fontSize: "0.85rem", resize: "none", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* submit */}
                <button
                  type="submit"
                  disabled={!contactReason || contactSending}
                  style={{
                    width: "100%", padding: "13px 0",
                    background: contactSending
                      ? "rgba(192,38,211,0.22)"
                      : contactReason ? "rgba(192,38,211,0.13)" : "rgba(40,0,60,0.3)",
                    border: `1px solid ${contactReason ? "#c026d3" : "rgba(192,38,211,0.18)"}`,
                    color: contactReason ? "#e879f9" : "#4a2a6a",
                    fontFamily: "var(--font-vt323),'VT323',monospace",
                    fontSize: "1.2rem", letterSpacing: "0.22em",
                    cursor: contactReason && !contactSending ? "pointer" : "not-allowed",
                    transition: "all 0.18s",
                    textShadow: contactReason ? "0 0 10px rgba(192,38,211,0.55)" : "none",
                    boxShadow: contactSending ? "0 0 18px rgba(192,38,211,0.25), inset 0 0 12px rgba(192,38,211,0.08)" : "none",
                    transform: contactSending ? "scale(0.995)" : "scale(1)",
                  }}
                >
                  {contactSending ? "TRANSMITTING..." : "SEND TRANSMISSION"}
                </button>
                {contactError && (
                  <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "#ff4444", letterSpacing: "0.12em", textAlign: "center" }}>
                    ✗ {contactError}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── SIGNAL LEVEL-UP TOAST ── */}
      {mounted && levelUpMsg && (
        <div className="level-up-toast">
          ◈ {levelUpMsg}
        </div>
      )}

      {/* ── WIN MOMENT TOAST — system success feedback ── */}
      {mounted && winToast && (
        <div className="win-toast">{winToast}</div>
      )}

      {/* ── MOBILE STICKY ACTION BAR ── context-aware, only when actionable ── */}
      {mounted && user && vault && (() => {
        const hasClaimable = vault.canClaim;
        if (!hasClaimable) return null;
        return (
          <div className="mobile-sticky-bar">
            <button
              className="mobile-sticky-btn mobile-sticky-btn-claim"
              onClick={claimDaily}
            >
              ⚡ CLAIM DAILY REWARD
            </button>
          </div>
        );
      })()}

      {/* ── ONBOARDING TOUR OVERLAY ──
          Guarded by !showIntro so it NEVER overlaps the intro video. */}
      {user && tourStep >= 0 && !showIntro && (() => {
        const TOUR_STEPS = [
          {
            icon: "◈",
            title: "Activity Signal Acquired",
            body: "You're in. Claim TB daily, build your activity signal, and unlock access to Todd's time.",
          },
          {
            icon: "⚡",
            title: "Claim Daily",
            body: "Hit CLAIM DAILY REWARD in your profile. TB is your fuel — claim every day. Streaks compound your balance.",
          },
          {
            icon: "◍",
            title: "Unlock Access",
            body: "Use TB to unlock tiers in WORK WITH TODD. Higher tiers = deeper collaboration. Stay consistent.",
          },
          {
            icon: "〜",
            title: "Cat Whiskers",
            body: "Whiskers are collectible signal boosters. Stack them to strengthen your position in the network.",
          },
          {
            icon: "✦",
            title: "Todd Bucks",
            body: "The rarest item on the site. Mythic tier. Account-bound now — future utility is coming.",
          },
          {
            icon: "★",
            title: "Activity Signal Compounds",
            body: "Stay consistent. Streaks multiply your TB. Rare items mature over time and unlock future utility.",
          },
          {
            icon: "◉",
            title: "You're Live.",
            body: "Build your collection. Your activity signal grows. The network remembers who showed up early.",
            final: true,
          },
        ] as const;

        const step = TOUR_STEPS[tourStep];
        const isFinal = "final" in step && step.final;

        function closeTour() {
          setTourStep(-1);
          localStorage.setItem("tour_seen", "1");
        }

        return (
          <div className="tour-overlay">
            <div className="tour-card">
              {/* Step indicator */}
              <div className="tour-step-indicator">
                STEP {tourStep + 1} / {TOUR_STEPS.length}
                <div className="tour-step-dots">
                  {TOUR_STEPS.map((_, i) => (
                    <div key={i} className={`tour-step-dot${i === tourStep ? " active" : ""}`} />
                  ))}
                </div>
              </div>

              <div className="tour-icon">{step.icon}</div>
              <div className="tour-title">{step.title}</div>
              <div className="tour-body">{step.body}</div>

              {isFinal ? (
                <div>
                  <button className="tour-enter-btn" onClick={closeTour}>
                    ENTER NETWORK →
                  </button>
                </div>
              ) : (
                <div className="tour-actions">
                  <button className="tour-skip-btn" onClick={closeTour}>Skip tour</button>
                  <button className="tour-next-btn" onClick={() => setTourStep(s => s + 1)}>
                    NEXT →
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════ */}
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto" style={{ padding: "16px 16px 80px" }}>

          {/* ── HEADER BAR ── */}
          <div className="header-bar mb-6">
            {/* Social icons — left side */}
            <div className="header-socials">
              <a href="https://x.com/ajordanweb3" target="_blank" rel="noopener noreferrer" className="social-icon" title="X / Twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/>
                </svg>
              </a>
              <a href="https://discord.gg/ajordan" target="_blank" rel="noopener noreferrer" className="social-icon" title="Discord">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/>
                </svg>
              </a>
            </div>
            <span className="live-dot" style={{ marginLeft: "8px" }} />
            <span style={{ fontSize: "1.05rem", letterSpacing: "0.18em", color: "#00ff41", textShadow: "0 0 8px #00ff41, 0 0 16px rgba(0,255,65,0.4)", flex: 1, textAlign: "center" }}>
              AJORDAN IS ONLINE // NETWORK ACTIVE
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              {authLoading ? (
                <span style={{ fontSize: "0.72rem", color: "#4a1a5a", letterSpacing: "0.1em" }}>...</span>
              ) : user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", color: "#00ff41", textShadow: "0 0 6px rgba(0,255,65,0.4)", letterSpacing: "0.1em", border: "1px solid rgba(0,255,65,0.3)", padding: "2px 8px" }}>
                    <span className="live-dot-green" style={{ width: "6px", height: "6px", marginRight: "5px" }} />
                    {user.username}
                  </span>
                  {vault && (() => {
                    const lvl = getSignalLevel(vault);
                    return (
                      <>
                        <span style={{ fontSize: "0.72rem", color: "#00cc33", letterSpacing: "0.1em", border: "1px solid rgba(0,255,65,0.18)", padding: "2px 7px", fontFamily: "var(--font-vt323),'VT323',monospace" }}>
                          ⚡ {vault.points} TB
                        </span>
                        <span style={{ fontSize: "0.68rem", color: lvl.color, letterSpacing: "0.12em", border: `1px solid ${lvl.color}44`, padding: "2px 7px" }}>
                          LVL {lvl.level} · {lvl.label}
                        </span>
                      </>
                    );
                  })()}
                  <button onClick={handleLogout} className="tp-header-btn btn-sm">SIGN OUT</button>
                </div>
              ) : (
                <button onClick={() => openAuth("login")} className="tp-header-btn btn-sm">JOIN / SIGN IN</button>
              )}
            </div>
          </div>

          {/* ── HERO ── */}
          <div className="glass-panel glass-ice hero-sweep p-8 mb-6 text-center"
               style={{ background: "#000", backdropFilter: "none" }}>

            {/* ── AJORDAN BRAND LOGO ── */}
            <div className="hero-logo-wrap">
              <NextImage
                src="/Ajordantxt.png"
                alt="AJORDAN"
                width={1016}
                height={378}
                className="hero-logo-img"
                unoptimized
                preload={false}
                style={{ width: "100%", height: "auto" }}
              />
            </div>

            <p className="mt-3 neon-green" style={{ fontSize: "0.95rem", letterSpacing: "0.2em" }}>
              @AJORDANWEB3 &nbsp;•&nbsp; CREATIVE DIRECTOR &nbsp;•&nbsp; NYC
            </p>
            <p className="mt-4" style={{ fontSize: "1.1rem", color: "#c8c0d8", letterSpacing: "0.1em", opacity: 0.88 }}>
              I build ideas that actually move people.
            </p>
            {/* Hero CTA */}
            <div className="mt-6" style={{ textAlign: "center" }}>
              <button onClick={scrollToWTT} className="hero-cta-btn">
                ENTER THE NETWORK ↓
              </button>
              <div className="core-philosophy-line mt-3">
                <span className="cpl-dim">Activity builds trust.</span>
                {" "}<span className="cpl-bright">TB unlocks access.</span>
              </div>
            </div>

            {/* Flow line */}
            <div className="how-it-works mt-5">
              Claim daily&nbsp;&nbsp;→&nbsp;&nbsp;Build activity signal&nbsp;&nbsp;→&nbsp;&nbsp;Unlock access with TB
            </div>
            <div className="how-it-works-subline">
              This is not a store. Access is earned.
            </div>

            {/* Return hook — logged-in users see their next action inline */}
            {mounted && user && vault && (() => {
              const nextClaim = vault.canClaim
                ? null
                : vault.nextClaimAt ? fmtCountdown(vault.nextClaimAt) : null;
              return (
                <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                  {vault.canClaim && (
                    <span style={{ fontSize: "0.72rem", color: "#00cc33", letterSpacing: "0.12em", border: "1px solid rgba(0,255,65,0.3)", padding: "2px 10px", animation: "claimReadyPulse 2.2s ease-in-out infinite" }}>
                      ⚡ DAILY CLAIM READY
                    </span>
                  )}
                  {nextClaim && (
                    <span style={{ fontSize: "0.72rem", color: "#5a7a5a", letterSpacing: "0.1em" }}>
                      NEXT CLAIM IN <span className="countdown-digits" style={{ color: "#8aaa8a" }}>{nextClaim}</span>
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── 2-COLUMN GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── LEFT: PROFILE ── blends into black background */}
            <div className="lg:col-span-4 glass-panel glass-purple glass-left glass-left-blend p-6 text-center">

              <img src="/catmain.png" alt="AJORDAN"
                   className="w-full mb-6"
                   loading="lazy"
                   decoding="async"
                   style={{ border: "2px solid rgba(192,38,211,0.7)", boxShadow: "0 0 18px rgba(192,38,211,0.45), inset 0 0 20px rgba(192,38,211,0.1)" }}
                   onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

              <h1 className="text-5xl title-purple tracking-widest" style={{ fontFamily: "var(--font-vt323), monospace" }}>AJORDAN ★</h1>

              <div className="mt-6 space-y-2" style={{ fontSize: "1.12rem" }}>
                <div className="neon-green">› solana trencher</div>
                <div className="neon-green">› creative director</div>
                <div className="neon-green">› media manager</div>
              </div>

              {/* ── SIGNAL PROFILE ── primary account identity + status + daily claim ── */}
              {mounted && (
                <div style={{ marginTop: "20px", borderTop: "1px solid rgba(192,38,211,0.18)", paddingTop: "14px" }}>
                  <div className="neon-purple tracking-wider mb-3" style={{ fontSize: "0.85rem", letterSpacing: "0.2em" }}>// ACTIVITY SIGNAL PROFILE //</div>
                  {user && vault ? (
                    (() => {
                      const lvl = getSignalLevel(vault);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>

                          {/* Username row */}
                          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00ff41", flexShrink: 0, boxShadow: "0 0 6px rgba(0,255,65,0.9)" }} />
                            <span style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "1.15rem", color: "#00ff41", letterSpacing: "0.12em" }}>{user.username}</span>
                          </div>

                          {/* Level badge */}
                          <div style={{ fontFamily: "var(--font-vt323),'VT323',monospace", fontSize: "0.92rem", color: lvl.color, letterSpacing: "0.12em", textShadow: `0 0 10px ${lvl.color}55`, border: `1px solid ${lvl.color}33`, padding: "3px 8px", display: "inline-block", alignSelf: "flex-start" }}>
                            LVL {lvl.level} · {lvl.label}
                          </div>

                          {/* Progress bar */}
                          {lvl.nextThreshold > 0 && (
                            <div>
                              <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginBottom: "3px" }}>
                                <div style={{ height: "100%", width: `${lvl.progress}%`, background: lvl.color, borderRadius: "2px", transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)" }} />
                              </div>
                              <div style={{ fontSize: "0.6rem", color: "#3a2a4a", letterSpacing: "0.08em" }}>
                                {lvl.score} / {lvl.nextThreshold} · NEXT LEVEL
                              </div>
                            </div>
                          )}

                          {/* TB balance + streak */}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <div className={`pts-display${claimFlash ? " claim-flash" : ""}`} style={{ fontSize: "1.9rem", lineHeight: 1 }}>
                              {vault.points}<span style={{ fontSize: "1rem", color: "#3a6a4a", marginLeft: "4px" }}>TB</span>
                            </div>
                            {vault.dailyStreak > 1 && (
                              <div className="streak-badge">🔥 {vault.dailyStreak}d</div>
                            )}
                          </div>

                          {/* Streak milestones */}
                          <div className="streak-milestone-block">
                            <div className="streak-current">CURRENT STREAK: {vault.dailyStreak} DAY{vault.dailyStreak !== 1 ? "S" : ""}</div>
                            <div className="streak-goals">
                              <span className={vault.dailyStreak >= 3  ? "streak-goal-done" : "streak-goal"}>Day 3 → +5 TB</span>
                              <span className={vault.dailyStreak >= 7  ? "streak-goal-done" : "streak-goal"}>Day 7 → +15 TB</span>
                              <span className={vault.dailyStreak >= 14 ? "streak-goal-done" : "streak-goal"}>Day 14 → +30 TB</span>
                            </div>
                            <div className="streak-consistency-note">Consistency increases your position.</div>
                          </div>

                          {/* Daily claim button or next-claim countdown */}
                          {vault.canClaim ? (
                            <div>
                              <div style={{ fontSize: "0.62rem", color: "#3a5a3a", letterSpacing: "0.12em", marginBottom: "4px" }}>
                                TODAY: +{vault.claimAmount} TB
                              </div>
                              <button onClick={claimDaily} disabled={claimLoading} className="claim-btn" style={{ width: "100%" }}>
                                {claimLoading ? "CLAIMING..." : "CLAIM DAILY REWARD"}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <div style={{ fontSize: "0.7rem", color: "#a080b0", letterSpacing: "0.12em" }}>NEXT CLAIM IN</div>
                              <div className="countdown-digits" style={{ fontSize: "1rem", color: "#c898d8" }}>
                                {vault.nextClaimAt ? fmtCountdown(vault.nextClaimAt) : "--:--:--"}
                              </div>
                            </div>
                          )}

                          {/* Claim result message */}
                          {claimMsg && (
                            <div style={{ fontSize: "0.68rem", color: "#3a7a4a", letterSpacing: "0.07em", lineHeight: 1.5, padding: "4px 0" }}>{claimMsg}</div>
                          )}

                        </div>
                      );
                    })()
                  ) : user && vaultLoading ? (
                    <div style={{ fontSize: "0.75rem", color: "#4a2a5a", letterSpacing: "0.1em" }}>
                      LOADING ACTIVITY SIGNAL...
                    </div>
                  ) : user ? (
                    <div style={{ fontSize: "0.78rem", color: "#4a2a5a", letterSpacing: "0.08em" }}>
                      <span className="live-dot-green" style={{ width: "5px", height: "5px", marginRight: "5px" }} />
                      {user.username} — activity signal initializing...
                    </div>
                  ) : (
                    <div>
                      {/* Early-joiner signal preview */}
                      <div className="early-signal-box">
                        <div className="early-signal-plus">+10 TB CLAIMED</div>
                        <div className="early-signal-label">ACTIVITY STARTED</div>
                        <div className="early-signal-text">You are early. Stay consistent to unlock access.</div>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#6a4a7a", letterSpacing: "0.07em", marginBottom: "10px", lineHeight: 1.5 }}>
                        Join to build your activity signal, earn TB, and unlock access in the network.
                      </div>
                      <button
                        onClick={() => openAuth("signup")}
                        style={{
                          width: "100%", padding: "8px 0",
                          background: "rgba(192,38,211,0.1)", border: "1px solid rgba(192,38,211,0.4)",
                          color: "#c026d3", fontFamily: "var(--font-vt323),'VT323',monospace",
                          fontSize: "1rem", letterSpacing: "0.18em", cursor: "pointer",
                          textShadow: "0 0 8px rgba(192,38,211,0.5)",
                        }}
                      >
                        JOIN NETWORK →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT: CONTENT STACK ── */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* POPULAR POST */}
              <div className="glass-panel glass-ice p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-base tracking-widest neon-green">// POPULAR POST</span>
                  <span className="trending-badge">TRENDING</span>
                </div>
                <div className="post-card p-4">
                  <div className="text-xs neon-green mb-3 tracking-wider">@AJORDANWEB3 // VIRAL TRANSMISSION</div>
                  <p className="mb-5 leading-snug" style={{ color: "#e0e0e0", fontSize: "1.05rem" }}>
                    watch Todd push a community of mask cats all around Manhattan
                  </p>
                  <div id="tweet-container" className="mb-4">
                    <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true" data-width="100%">
                      <a href="https://x.com/ajordanweb3/status/1954282878285849067"></a>
                    </blockquote>
                    <script async src="https://platform.twitter.com/widgets.js" />
                  </div>
                  <a href="https://x.com/ajordanweb3/status/1954282878285849067"
                     target="_blank" rel="noopener noreferrer"
                     className="btn-green block w-full text-center py-2 text-base tracking-widest"
                     style={{ fontFamily: "var(--font-vt323), monospace", textDecoration: "none" }}>
                    WATCH POST ↗
                  </a>
                </div>
              </div>

              {/* CREATIVE DIRECTOR PROFILE */}
              <div className="glass-panel glass-purple p-6">
                <div className="text-base mb-3 neon-purple tracking-wider">// CREATIVE DIRECTOR PROFILE</div>
                <div className="leading-relaxed" style={{ color: "#d0d0d0", fontSize: "1.12rem", fontWeight: 600 }}>
                  TODD A JORDAN — CREATIVE DIRECTOR &amp; MEDIA STRATEGIST<br /><br />
                  NYC-based Creative Director specializing in high-impact content architecture.
                  I excel at <span className="highlight-purple">creative directing</span> — turning raw chaotic energy
                  into sharp, viral campaigns that cut through the noise. As a professional Content Manager
                  and Media Strategist, I help X creators, KOLs, and Web3 builders scale their brands with
                  strategic storytelling, meme warfare, and polished execution.
                </div>
                <button onClick={openContactModal}
                  className="btn-purple mt-6 w-full py-3 text-lg tracking-widest"
                  style={{ fontFamily: "var(--font-vt323), monospace" }}>
                  CONTACT AJORDAN ↗
                </button>
              </div>

              {/* WHY TODD? */}
              <div className="glass-panel glass-purple p-6">
                <div className="text-base mb-4 neon-purple tracking-wider">// WHY TODD?</div>
                <div>
                  {[
                    { icon: "◈", title: "Strategy that executes", body: "Not just ideas — a clear path from concept to finished work." },
                    { icon: "◈", title: "Real help for stuck creators", body: "When the momentum is gone, Todd helps you find it again." },
                    { icon: "◈", title: "Community-first approach", body: "Every project is built to grow something people actually stay for." },
                    { icon: "◈", title: "Sharp direction, fast", body: "No endless back-and-forth. Clear moves. Real execution." },
                  ].map(item => (
                    <div key={item.title} className="why-todd-row">
                      <span className="why-todd-bullet">{item.icon}</span>
                      <div>
                        <div style={{ color: "#c8b8d8", fontSize: "0.9rem", letterSpacing: "0.07em", marginBottom: "2px" }}>{item.title}</div>
                        <div style={{ color: "#6a5a7a", fontSize: "0.8rem", letterSpacing: "0.04em", lineHeight: 1.45 }}>{item.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={openContactModal}
                  className="btn-purple mt-5 w-full py-2 text-base tracking-widest"
                  style={{ fontFamily: "var(--font-vt323), monospace" }}>
                  START A CONVERSATION ↗
                </button>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              WORK WITH TODD — EARNED ACCESS
          ═══════════════════════════════════════════════════ */}
          {/* ── LIVE ACTIVITY FEED ── */}
          {mounted && (
            <div className="live-feed-section mt-6">
              <div className="live-feed-header">
                <span className="live-dot-green" />
                <span className="live-feed-title">// LIVE SIGNAL FEED //</span>
                <span className="live-feed-badge">LIVE</span>
              </div>
              <div className="live-feed-list">
                {activityFeed.slice(0, 8).map(item => {
                  const [user, ...rest] = item.text.split(" ");
                  return (
                    <div key={item.id} className="live-feed-item">
                      <span className="live-feed-user">{user}</span>
                      <span className="live-feed-action">{rest.join(" ")}</span>
                      <span className="live-feed-time">{fmtFeedAge(item.t)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mounted && (() => {
            const wttTiers = [
              {
                id: "quick-idea",
                label: "TIER I",
                name: "QUICK IDEA",
                desc: "A focused 15-min session — one problem, one direction.",
                cost: 2,
              },
              {
                id: "content-direction",
                label: "TIER II",
                name: "CONTENT DIRECTION",
                desc: "Full content map — strategy, positioning, execution path.",
                cost: 5,
              },
              {
                id: "full-help",
                label: "TIER III",
                name: "FULL HELP",
                desc: "Deep collaboration — builds, campaigns, or complex problems.",
                cost: 10,
              },
            ];

            const tbBalance = vault?.inventory?.find(i => i.itemId === "todd_bucks")?.quantity ?? 0;

            function tbTierStatus(required: number, owned: number): "locked" | "building" | "soon" {
              if (owned === 0) return "locked";
              if (owned >= required) return "soon";
              return "building";
            }

            const statusLabel: Record<string, string> = {
              locked:   "🔒 Requires TB + Activity",
              building: "Build more TB",
              soon:     "✓ Unlock Available",
            };

            return (
              <div className="wtt-panel mt-6 p-6" ref={wttPanelRef}>
                {/* Header */}
                <div className="wtt-header">
                  <div className="wtt-title">// WORK WITH TODD //</div>
                  <span className="wtt-access-badge">EARNED ACCESS</span>
                </div>

                {/* Philosophy line — location 3 */}
                <div className="core-philosophy-line" style={{ marginBottom: "14px" }}>
                  <span className="cpl-dim">Activity builds trust.</span>
                  {" "}<span className="cpl-bright">TB unlocks access.</span>
                </div>

                {/* Description */}
                <div className="wtt-desc-block">
                  <div className="wtt-desc-line">This isn&apos;t a store. Access is earned through consistency and TB.</div>
                </div>

                {/* TB Currency block */}
                <div className="wtt-currency-block">
                  <div className="wtt-currency-title">TODD BUCKS // NETWORK CURRENCY</div>
                  <div className="wtt-currency-desc">
                    Todd Bucks (TB) are the only currency on the site.
                    You earn TB by showing up and staying active.
                    You use TB to unlock access and opportunities.
                  </div>
                </div>

                {/* Balance block */}
                {user && vault ? (
                  <div className="wtt-balance-card">
                    <div>
                      <div className="wtt-balance-label">TODD BUCKS BALANCE</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
                        <span className="wtt-balance-val">{tbBalance}</span>
                        <span className="wtt-balance-unit">TB</span>
                      </div>
                      <div className="wtt-balance-stack-note">Stack now. Spend with intent.</div>
                    </div>
                    <div className="wtt-balance-empty">
                      {tbBalance === 0
                        ? "Earned through daily activity and consistency."
                        : "Keep building — more TB unlocks higher tiers."}
                    </div>
                  </div>
                ) : user && vaultLoading ? (
                  <div className="wtt-balance-card">
                    <div>
                      <div className="wtt-balance-label">TODD BUCKS BALANCE</div>
                      <div className="skeleton-line skeleton-med" style={{ marginTop: "6px" }} />
                    </div>
                  </div>
                ) : !user ? (
                  <div className="wtt-guest-prompt">
                    <div className="wtt-guest-text">Sign in to track Todd Bucks and unlock earned access.</div>
                  </div>
                ) : null}

                {/* Tier cards */}
                <div className="wtt-tier-grid">
                  {wttTiers.map(tier => {
                    const status = user && vault ? tbTierStatus(tier.cost, tbBalance) : "locked";
                    return (
                      <div key={tier.id} className={`wtt-tier${status === "soon" ? " wtt-tier-available" : ""}`}>
                        <div className="wtt-tier-label">{tier.label}</div>
                        <div className="wtt-tier-name">{tier.name}</div>
                        <div className="wtt-tier-desc">{tier.desc}</div>
                        <div className="wtt-tier-cost">
                          <span className="wtt-tier-cost-val">{tier.cost}</span>
                          <span className="wtt-tier-cost-label">&nbsp;TB</span>
                        </div>
                        <div className={`wtt-status wtt-status-${status}`}>
                          {statusLabel[status]}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="wtt-limit-note">
                  <span className="wtt-limit-dot">◉</span>
                  Limited slots each week. Access opens in controlled windows.
                </div>
              </div>
            );
          })()}


        </div>
      </div>
    </>
  );
}
