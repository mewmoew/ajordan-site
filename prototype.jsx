import { useState, useEffect, useRef } from "react";

/* ─── tiny helpers ─── */
function fmtAge(t) {
  if (!t) return "now";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

const SIGNAL_LEVELS = [
  { threshold: 0,   level: 1, label: "LURKER",      color: "#4a3a5a" },
  { threshold: 25,  level: 2, label: "SIGNAL",      color: "#7a5a8a" },
  { threshold: 75,  level: 3, label: "ACTIVE",      color: "#a060b0" },
  { threshold: 150, level: 4, label: "CONSISTENT",  color: "#c026d3" },
  { threshold: 300, level: 5, label: "ARCHITECT",   color: "#e040fb" },
];

function getLevel(pts) {
  let def = SIGNAL_LEVELS[0];
  for (const l of SIGNAL_LEVELS) if (pts >= l.threshold) def = l;
  const idx = SIGNAL_LEVELS.indexOf(def);
  const next = SIGNAL_LEVELS[idx + 1];
  const prev = SIGNAL_LEVELS[idx];
  const range = next ? next.threshold - prev.threshold : 1;
  const progress = next ? Math.min(100, Math.floor(((pts - prev.threshold) / range) * 100)) : 100;
  return { ...def, nextThreshold: next?.threshold ?? -1, score: pts, progress };
}

const SEED_FEED = [
  { id: "s1", text: "signal_node claimed daily TB",         t: Date.now() - 90_000,   type: "claim"   },
  { id: "s2", text: "ghost_user unlocked Tier I access",    t: Date.now() - 340_000,  type: "general" },
  { id: "s3", text: "0xwave claimed daily TB",              t: Date.now() - 610_000,  type: "claim"   },
  { id: "s4", text: "pulse_rx booked a 1:1 session",        t: Date.now() - 800_000,  type: "general" },
  { id: "s5", text: "static_rift reserved a priority slot", t: Date.now() - 900_000,  type: "general" },
  { id: "s6", text: "nova_grid built streak: 7d",           t: Date.now() - 1_500_000, type: "claim"  },
  { id: "s7", text: "echo_signal sent a project request",   t: Date.now() - 1_900_000, type: "general"},
];

const WTT_TIERS = [
  { id: "quick-idea",        label: "TIER I",   name: "QUICK IDEA",        desc: "A focused 15-min session — one problem, one direction.", cost: 2  },
  { id: "content-direction", label: "TIER II",  name: "CONTENT DIRECTION", desc: "Full content map — strategy, positioning, execution path.", cost: 5  },
  { id: "full-help",         label: "TIER III", name: "FULL HELP",         desc: "Deep collaboration — builds, campaigns, or complex problems.", cost: 10 },
];

/* ─── styles ─── */
const C = {
  bg:      "#040008",
  glass:   "rgba(20,0,30,0.85)",
  purple:  "#c026d3",
  green:   "#00ff41",
  dim:     "#3a1a4a",
  muted:   "#6a4a7a",
  text:    "#d0c8e0",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Orbitron:wght@400;700;900&display=swap');

  .proto-root { font-family: 'Orbitron', monospace; background: #000; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .phone { width: 390px; height: 844px; background: ${C.bg}; border: 2px solid rgba(192,38,211,0.4); border-radius: 44px; overflow: hidden; position: relative; box-shadow: 0 0 60px rgba(192,38,211,0.18), 0 0 120px rgba(192,38,211,0.06); display: flex; flex-direction: column; }
  .phone-notch { height: 44px; background: #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-bottom: 1px solid rgba(192,38,211,0.1); }
  .phone-notch-pill { width: 120px; height: 30px; background: #000; border: 1px solid rgba(192,38,211,0.2); border-radius: 20px; }
  .phone-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; padding: 0 0 80px; }
  .phone-scroll::-webkit-scrollbar { display: none; }
  .phone-home { height: 34px; background: #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-top: 1px solid rgba(192,38,211,0.1); }
  .phone-home-bar { width: 120px; height: 4px; background: rgba(192,38,211,0.4); border-radius: 2px; }

  .vt { font-family: 'VT323', monospace !important; }
  .neon-green { color: ${C.green}; text-shadow: 0 0 8px rgba(0,255,65,0.5); }
  .neon-purple { color: ${C.purple}; text-shadow: 0 0 8px rgba(192,38,211,0.5); }

  .panel { background: rgba(10,0,18,0.9); border: 1px solid rgba(192,38,211,0.18); margin: 10px 10px 0; border-radius: 4px; }
  .panel-ice  { border-color: rgba(120,80,160,0.25); }
  .panel-purple { border-color: rgba(192,38,211,0.28); }

  .hero { background: #000 !important; border: 1px solid rgba(192,38,211,0.15); margin: 10px 10px 0; border-radius: 4px; padding: 22px 14px 18px; text-align: center; }

  .hero-logo { font-family: 'Orbitron', monospace; font-size: 2.8rem; font-weight: 900; color: ${C.purple}; letter-spacing: 0.08em; text-shadow: 0 0 30px rgba(192,38,211,0.7), 0 0 60px rgba(192,38,211,0.3); line-height: 1; }
  .hero-sub  { font-size: 0.62rem; color: ${C.green}; letter-spacing: 0.16em; margin-top: 6px; text-shadow: 0 0 6px rgba(0,255,65,0.4); }
  .hero-copy { font-size: 0.75rem; color: rgba(200,192,220,0.88); letter-spacing: 0.08em; margin-top: 8px; line-height: 1.4; }
  .hero-cta  { margin-top: 14px; background: rgba(192,38,211,0.12); border: 1px solid rgba(192,38,211,0.55); color: ${C.purple}; font-family: 'Orbitron', monospace; font-size: 0.72rem; letter-spacing: 0.18em; padding: 13px 20px; width: 100%; cursor: pointer; text-shadow: 0 0 8px rgba(192,38,211,0.5); transition: all 0.15s; }
  .hero-cta:active { background: rgba(192,38,211,0.22); transform: scale(0.98); }
  .hero-flow { margin-top: 10px; font-size: 0.58rem; color: #2a4a2a; letter-spacing: 0.07em; display: flex; flex-direction: column; gap: 2px; align-items: center; }

  .header { display: flex; align-items: center; justify-content: space-between; padding: 10px 10px 0; }
  .header-logo { font-size: 0.7rem; letter-spacing: 0.2em; color: ${C.purple}; }
  .btn-sm { font-family: 'VT323', monospace; font-size: 0.85rem; letter-spacing: 0.12em; padding: 5px 10px; background: rgba(192,38,211,0.08); border: 1px solid rgba(192,38,211,0.35); color: ${C.purple}; cursor: pointer; transition: all 0.12s; }
  .btn-sm:active { background: rgba(192,38,211,0.2); }
  .btn-sm-green { border-color: rgba(0,255,65,0.35); background: rgba(0,255,65,0.06); color: ${C.green}; }

  /* Profile */
  .profile { padding: 14px; text-align: center; }
  .cat-img { width: 100%; max-height: 160px; object-fit: cover; object-position: top; border: 2px solid rgba(192,38,211,0.7); box-shadow: 0 0 18px rgba(192,38,211,0.45); display: block; }
  .profile-name { font-family: 'VT323', monospace; font-size: 2.2rem; color: ${C.purple}; letter-spacing: 0.1em; margin-top: 10px; text-shadow: 0 0 14px rgba(192,38,211,0.5); }
  .role-tag { font-family: 'VT323', monospace; font-size: 1rem; color: ${C.green}; text-shadow: 0 0 6px rgba(0,255,65,0.35); }

  .signal-divider { border: none; border-top: 1px solid rgba(192,38,211,0.16); margin: 10px 0; }
  .signal-label { font-size: 0.6rem; color: ${C.purple}; letter-spacing: 0.2em; margin-bottom: 8px; }

  .pts { font-family: 'VT323', monospace; font-size: 2.4rem; color: ${C.green}; line-height: 1; text-shadow: 0 0 12px rgba(0,255,65,0.5); }
  .pts-unit { font-size: 1.1rem; color: #3a6a4a; margin-left: 3px; }

  .streak-badge { font-family: 'VT323', monospace; font-size: 0.9rem; background: rgba(255,140,0,0.1); border: 1px solid rgba(255,140,0,0.3); color: #ff8c00; padding: 2px 8px; letter-spacing: 0.1em; }

  .progress-bar-wrap { height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; margin: 6px 0 2px; }
  .progress-bar-fill { height: 100%; border-radius: 2px; transition: width 0.7s cubic-bezier(0.22,1,0.36,1); }

  .streak-goal { font-size: 0.62rem; padding: 2px 6px; border: 1px solid rgba(192,38,211,0.2); color: #4a2a5a; font-family: 'VT323', monospace; letter-spacing: 0.06em; }
  .streak-goal-done { font-size: 0.62rem; padding: 2px 6px; border: 1px solid rgba(0,255,65,0.3); color: #2a6a3a; font-family: 'VT323', monospace; letter-spacing: 0.06em; }

  .claim-btn { width: 100%; padding: 12px 0; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.45); color: ${C.green}; font-family: 'VT323', monospace; font-size: 1.2rem; letter-spacing: 0.2em; cursor: pointer; transition: all 0.15s; min-height: 48px; animation: claimPulse 2.2s ease-in-out infinite; }
  .claim-btn:hover { background: rgba(0,255,65,0.16); }
  .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; animation: none; }
  .claim-btn:active { transform: scale(0.98); background: rgba(0,255,65,0.2); animation: none; }
  @keyframes claimPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,255,65,0); } 50% { box-shadow: 0 0 0 5px rgba(0,255,65,0), 0 0 14px rgba(0,255,65,0.25); } }

  .join-btn { width: 100%; padding: 10px 0; background: rgba(192,38,211,0.1); border: 1px solid rgba(192,38,211,0.4); color: ${C.purple}; font-family: 'VT323', monospace; font-size: 1.1rem; letter-spacing: 0.18em; cursor: pointer; min-height: 48px; transition: all 0.15s; }
  .join-btn:active { background: rgba(192,38,211,0.22); transform: scale(0.98); }

  /* Live Feed */
  .feed-section { background: rgba(0,4,0,0.75); border: 1px solid rgba(0,255,65,0.1); margin: 10px 10px 0; padding: 12px 12px; position: relative; }
  .feed-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(0,255,65,0.25) 40%, rgba(0,255,65,0.25) 60%, transparent 100%); }
  .feed-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: ${C.green}; box-shadow: 0 0 6px rgba(0,255,65,0.8); animation: livePulse 1.4s ease-in-out infinite; flex-shrink: 0; }
  @keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  .feed-title { font-family: 'VT323', monospace; font-size: 0.9rem; color: ${C.green}; letter-spacing: 0.2em; text-shadow: 0 0 8px rgba(0,255,65,0.35); }
  .live-badge { font-family: 'VT323', monospace; font-size: 0.6rem; letter-spacing: 0.14em; color: ${C.green}; border: 1px solid rgba(0,255,65,0.28); padding: 1px 6px; animation: claimPulse 2.5s ease-in-out infinite; }
  .feed-item { display: flex; align-items: baseline; gap: 6px; padding: 5px 0; border-bottom: 1px solid rgba(0,255,65,0.05); flex-wrap: wrap; }
  .feed-item:last-child { border-bottom: none; }
  .feed-user { font-family: 'VT323', monospace; color: ${C.green}; font-size: 0.85rem; flex-shrink: 0; text-shadow: 0 0 5px rgba(0,255,65,0.28); }
  .feed-action { font-family: 'VT323', monospace; color: #2a5a2a; font-size: 0.78rem; flex: 1; min-width: 0; }
  .feed-time { font-family: 'VT323', monospace; color: #1a3a1a; font-size: 0.68rem; flex-shrink: 0; }

  /* WTT */
  .wtt-panel { background: rgba(8,0,14,0.95); border: 1px solid rgba(192,38,211,0.28); margin: 10px 10px 0; padding: 16px 14px; }
  .wtt-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .wtt-title { font-size: 0.75rem; color: ${C.purple}; letter-spacing: 0.18em; text-shadow: 0 0 8px rgba(192,38,211,0.4); }
  .wtt-badge { font-family: 'VT323', monospace; font-size: 0.65rem; letter-spacing: 0.1em; border: 1px solid rgba(192,38,211,0.4); color: rgba(192,38,211,0.7); padding: 2px 7px; }
  .wtt-philo { font-size: 0.6rem; color: #3a1a4a; letter-spacing: 0.08em; margin-bottom: 10px; }
  .wtt-philo span { color: ${C.purple}; }

  .wtt-currency-block { background: rgba(192,38,211,0.04); border: 1px solid rgba(192,38,211,0.12); padding: 10px 12px; margin-bottom: 10px; }
  .wtt-currency-title { font-size: 0.6rem; color: #5a3a6a; letter-spacing: 0.14em; margin-bottom: 4px; }
  .wtt-currency-desc { font-size: 0.62rem; color: #3a1a4a; letter-spacing: 0.04em; line-height: 1.5; }

  .wtt-balance-card { background: rgba(0,20,0,0.4); border: 1px solid rgba(0,255,65,0.15); padding: 10px 12px; margin-bottom: 12px; }
  .wtt-balance-label { font-size: 0.58rem; color: #2a4a2a; letter-spacing: 0.14em; }
  .wtt-balance-val { font-family: 'VT323', monospace; font-size: 2rem; color: ${C.green}; text-shadow: 0 0 10px rgba(0,255,65,0.4); line-height: 1; }
  .wtt-balance-unit { font-family: 'VT323', monospace; font-size: 0.9rem; color: #2a5a2a; margin-left: 4px; }

  .tier-card { border: 1px solid rgba(192,38,211,0.18); padding: 14px 12px; margin-bottom: 8px; background: rgba(12,0,20,0.6); transition: border-color 0.2s; }
  .tier-card:last-child { margin-bottom: 0; }
  .tier-card.available { border-color: rgba(192,38,211,0.5); box-shadow: 0 0 12px rgba(192,38,211,0.08); }
  .tier-label { font-family: 'VT323', monospace; font-size: 0.65rem; color: #5a3a6a; letter-spacing: 0.2em; margin-bottom: 3px; }
  .tier-name { font-size: 0.75rem; color: #d0c0e0; letter-spacing: 0.1em; margin-bottom: 5px; }
  .tier-desc { font-size: 0.62rem; color: #5a4a6a; letter-spacing: 0.03em; line-height: 1.45; margin-bottom: 8px; }
  .tier-cost { font-family: 'VT323', monospace; font-size: 2.2rem; color: ${C.purple}; line-height: 1; }
  .tier-cost-unit { font-size: 0.9rem; color: #5a2a6a; margin-left: 3px; }
  .tier-status { font-family: 'VT323', monospace; font-size: 0.65rem; letter-spacing: 0.08em; margin-top: 6px; color: #3a1a4a; }
  .tier-status.available { color: #2a6a3a; }
  .tier-unlock-btn { width: 100%; padding: 10px 0; background: rgba(192,38,211,0.1); border: 1px solid rgba(192,38,211,0.45); color: ${C.purple}; font-family: 'VT323', monospace; font-size: 1rem; letter-spacing: 0.16em; cursor: pointer; min-height: 48px; margin-top: 8px; transition: all 0.15s; }
  .tier-unlock-btn:active { background: rgba(192,38,211,0.22); transform: scale(0.98); }

  .wtt-limit-note { font-family: 'VT323', monospace; font-size: 0.68rem; color: #3a1a4a; letter-spacing: 0.08em; margin-top: 12px; display: flex; gap: 6px; align-items: flex-start; }
  .wtt-limit-dot { color: ${C.purple}; flex-shrink: 0; }

  /* Sticky bar */
  .sticky-bar { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 12px 12px; background: rgba(0,0,0,0.92); border-top: 1px solid rgba(192,38,211,0.22); backdrop-filter: blur(12px); display: flex; gap: 8px; z-index: 50; }
  .sticky-claim-btn { flex: 1; padding: 11px 8px; font-family: 'VT323', monospace; font-size: 1rem; letter-spacing: 0.16em; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.45); color: ${C.green}; cursor: pointer; text-shadow: 0 0 8px rgba(0,255,65,0.55); transition: all 0.12s; min-height: 44px; }
  .sticky-claim-btn:active { background: rgba(0,255,65,0.2); transform: scale(0.98); }
  .sticky-claim-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Auth modal */
  .modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.88); backdrop-filter: blur(6px); display: flex; align-items: flex-start; justify-content: center; padding: 60px 16px 20px; z-index: 100; overflow-y: auto; }
  .modal-box { background: rgba(4,0,12,0.99); border: 1px solid rgba(192,38,211,0.5); padding: 24px 18px; width: 100%; max-width: 340px; box-shadow: 0 0 50px rgba(192,38,211,0.15); }
  .modal-title { font-size: 1.1rem; color: ${C.purple}; letter-spacing: 0.18em; margin-bottom: 4px; text-shadow: 0 0 10px rgba(192,38,211,0.4); }
  .modal-sub { font-size: 0.62rem; color: #4a2a5a; letter-spacing: 0.08em; margin-bottom: 18px; }
  .modal-input { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(192,38,211,0.3); color: #e0d0f0; font-family: 'Orbitron', monospace; font-size: 0.72rem; letter-spacing: 0.08em; margin-bottom: 10px; outline: none; }
  .modal-input:focus { border-color: rgba(192,38,211,0.6); box-shadow: 0 0 8px rgba(192,38,211,0.2); }
  .modal-submit { width: 100%; padding: 12px 0; background: rgba(192,38,211,0.12); border: 1px solid rgba(192,38,211,0.5); color: ${C.purple}; font-family: 'VT323', monospace; font-size: 1.1rem; letter-spacing: 0.2em; cursor: pointer; min-height: 48px; transition: all 0.15s; margin-top: 4px; }
  .modal-submit:active { background: rgba(192,38,211,0.24); }
  .modal-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .modal-err { font-size: 0.62rem; color: #cc4444; letter-spacing: 0.06em; margin-bottom: 8px; padding: 6px 10px; border: 1px solid rgba(204,68,68,0.25); background: rgba(204,68,68,0.06); }
  .modal-toggle { font-size: 0.65rem; color: #5a3a6a; letter-spacing: 0.06em; text-align: center; margin-top: 12px; cursor: pointer; }
  .modal-toggle span { color: ${C.purple}; text-decoration: underline; }
  .modal-close { position: absolute; top: 12px; right: 14px; font-family: 'VT323', monospace; font-size: 1.2rem; color: #3a1a4a; cursor: pointer; background: none; border: none; }

  /* Toast */
  .toast { position: absolute; top: 60px; left: 50%; transform: translateX(-50%); padding: 9px 22px; background: rgba(4,0,10,0.97); border: 1px solid rgba(192,38,211,0.8); color: ${C.purple}; font-family: 'VT323', monospace; font-size: 0.9rem; letter-spacing: 0.14em; z-index: 200; white-space: nowrap; text-shadow: 0 0 8px rgba(192,38,211,0.4); box-shadow: 0 0 22px rgba(192,38,211,0.35); animation: toastIn 0.3s ease-out; }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* Contact req */
  .req-sent { background: rgba(0,255,65,0.04); border: 1px solid rgba(0,255,65,0.2); padding: 10px 12px; margin-top: 10px; font-family: 'VT323', monospace; font-size: 0.85rem; color: #2a6a3a; letter-spacing: 0.1em; text-align: center; }
`;

/* ─── Mock auth ─── */
function mockLogin(username) {
  return { id: "u1", username };
}

/* ─── Main component ─── */
export default function Prototype() {
  const [user, setUser]       = useState(null);
  const [tb, setTb]           = useState(0);
  const [streak, setStreak]   = useState(0);
  const [canClaim, setCanClaim] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState(null);

  const [feed, setFeed]       = useState(SEED_FEED);
  const [tick, setTick]       = useState(0);

  const [showAuth, setShowAuth]   = useState(false);
  const [authMode, setAuthMode]   = useState("signup");
  const [authUser, setAuthUser]   = useState("");
  const [authPass, setAuthPass]   = useState("");
  const [authErr, setAuthErr]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [toast, setToast]     = useState(null);
  const [reqSent, setReqSent] = useState(false);

  const scrollRef = useRef(null);
  const wttRef    = useRef(null);

  /* tick for countdowns */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function fireToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addFeedItem(text, type) {
    setFeed(prev => [
      { id: `live-${Date.now()}`, text, t: Date.now(), type },
      ...prev.slice(0, 8),
    ]);
  }

  /* Claim */
  function claimDaily() {
    if (claimLoading || !canClaim) return;
    setClaimLoading(true);
    setTimeout(() => {
      const earned = 10 + Math.floor(Math.random() * 5);
      const newStreak = streak + 1;
      setTb(t => t + earned);
      setStreak(newStreak);
      setCanClaim(false);
      setClaimMsg(`+${earned} TB RECEIVED · STREAK ×${newStreak}`);
      setTimeout(() => setClaimMsg(null), 4000);
      addFeedItem(`${user.username} claimed daily TB`, "claim");
      fireToast(`⚡ +${earned} TB RECEIVED`);
      setClaimLoading(false);
    }, 900);
  }

  /* Auth */
  function handleAuth(e) {
    e.preventDefault();
    setAuthErr("");
    if (!authUser.trim() || !authPass.trim()) { setAuthErr("All fields required."); return; }
    if (authMode === "signup" && authPass.length < 4) { setAuthErr("Password too short."); return; }
    setAuthLoading(true);
    setTimeout(() => {
      const newUser = mockLogin(authUser.trim());
      setUser(newUser);
      setTb(10); setStreak(1); setCanClaim(true);
      setShowAuth(false);
      setAuthUser(""); setAuthPass(""); setAuthErr("");
      setAuthLoading(false);
      addFeedItem(`${newUser.username} joined the network`, "general");
      fireToast("⚡ SIGNAL ACTIVATED");
    }, 700);
  }

  function handleLogout() {
    setUser(null); setTb(0); setStreak(0); setCanClaim(true); setReqSent(false);
  }

  const lvl = getLevel(tb);
  const tbBalance = tb;

  function tierStatus(cost) {
    if (!user) return "locked";
    if (tbBalance >= cost) return "soon";
    return tbBalance === 0 ? "locked" : "building";
  }
  const statusLabel = { locked: "🔒 Requires TB + Activity", building: "Build more TB", soon: "✓ Unlock Available" };

  return (
    <>
      <style>{css}</style>
      <div className="proto-root">
        <div className="phone">
          {/* Notch */}
          <div className="phone-notch"><div className="phone-notch-pill" /></div>

          {/* Scrollable content */}
          <div className="phone-scroll" ref={scrollRef}>

            {/* Header */}
            <div className="header">
              <span className="header-logo">AJORDAN.XYZ</span>
              {user ? (
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span className="vt neon-green" style={{ fontSize:"0.8rem", letterSpacing:"0.1em" }}>⚡ {tb} TB</span>
                  <button className="btn-sm" onClick={handleLogout}>SIGN OUT</button>
                </div>
              ) : (
                <button className="btn-sm" onClick={() => { setAuthMode("login"); setShowAuth(true); }}>
                  JOIN / SIGN IN
                </button>
              )}
            </div>

            {/* Hero */}
            <div className="hero">
              <div className="hero-logo">AJORDAN</div>
              <div className="hero-sub">@AJORDANWEB3 &nbsp;•&nbsp; CREATIVE DIRECTOR &nbsp;•&nbsp; NYC</div>
              <div className="hero-copy">I build ideas that actually move people.</div>
              <button className="hero-cta" onClick={() => wttRef.current?.scrollIntoView({ behavior:"smooth" })}>
                ENTER THE NETWORK ↓
              </button>
              <div className="hero-flow">
                <span>Claim daily</span>
                <span style={{color:"#1a3a1a"}}>↓</span>
                <span>Build activity signal</span>
                <span style={{color:"#1a3a1a"}}>↓</span>
                <span>Unlock access with TB</span>
              </div>
            </div>

            {/* Signal Profile */}
            <div className="panel panel-purple">
              <div className="profile">
                <img
                  src="/catmain.png"
                  alt="AJORDAN"
                  className="cat-img"
                  onError={e => { e.target.style.display = "none"; }}
                />
                <div className="profile-name">AJORDAN ★</div>
                <div style={{ marginTop:4, display:"flex", flexDirection:"column", gap:2 }}>
                  {["› solana trencher","› creative director","› media manager"].map(r => (
                    <div key={r} className="role-tag">{r}</div>
                  ))}
                </div>

                <hr className="signal-divider" />
                <div className="signal-label">// ACTIVITY SIGNAL PROFILE //</div>

                {user && (
                  <div style={{ textAlign:"left" }}>
                    {/* Username + level */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:C.green, boxShadow:"0 0 6px rgba(0,255,65,0.9)", flexShrink:0 }} />
                      <span className="vt neon-green" style={{ fontSize:"1.1rem", letterSpacing:"0.12em" }}>{user.username}</span>
                    </div>
                    <div className="vt" style={{ fontSize:"0.85rem", color:lvl.color, letterSpacing:"0.12em", border:`1px solid ${lvl.color}33`, padding:"2px 8px", display:"inline-block", marginBottom:6 }}>
                      LVL {lvl.level} · {lvl.label}
                    </div>
                    {/* Progress */}
                    {lvl.nextThreshold > 0 && (
                      <div style={{ marginBottom:6 }}>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width:`${lvl.progress}%`, background:lvl.color }} />
                        </div>
                        <div style={{ fontSize:"0.58rem", color:"#3a2a4a", letterSpacing:"0.07em" }}>{lvl.score} / {lvl.nextThreshold} · NEXT LEVEL</div>
                      </div>
                    )}
                    {/* TB + streak */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <span>
                        <span className="pts">{tb}</span>
                        <span className="pts-unit">TB</span>
                      </span>
                      {streak > 1 && <span className="streak-badge">🔥 {streak}d</span>}
                    </div>
                    {/* Streak goals */}
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
                      <span className={streak >= 3  ? "streak-goal-done" : "streak-goal"}>Day 3 → +5 TB</span>
                      <span className={streak >= 7  ? "streak-goal-done" : "streak-goal"}>Day 7 → +15 TB</span>
                      <span className={streak >= 14 ? "streak-goal-done" : "streak-goal"}>Day 14 → +30 TB</span>
                    </div>
                    {/* Claim */}
                    {canClaim ? (
                      <div>
                        <div style={{ fontSize:"0.58rem", color:"#3a5a3a", letterSpacing:"0.1em", marginBottom:4 }}>TODAY: +10 TB</div>
                        <button className="claim-btn" onClick={claimDaily} disabled={claimLoading}>
                          {claimLoading ? "CLAIMING..." : "CLAIM DAILY REWARD"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize:"0.7rem", color:"#5a7a5a", letterSpacing:"0.1em" }}>
                        NEXT CLAIM IN <span className="vt" style={{ color:"#8aaa8a" }}>23:59:00</span>
                      </div>
                    )}
                    {claimMsg && (
                      <div style={{ fontSize:"0.62rem", color:"#3a7a4a", letterSpacing:"0.06em", marginTop:6, padding:"4px 0", lineHeight:1.5 }}>{claimMsg}</div>
                    )}
                  </div>
                )}

                {!user && (
                  <div style={{ textAlign:"left" }}>
                    <div style={{ background:"rgba(0,255,65,0.04)", border:"1px solid rgba(0,255,65,0.14)", padding:"10px 12px", marginBottom:10 }}>
                      <div className="vt neon-green" style={{ fontSize:"1rem", letterSpacing:"0.1em" }}>+10 TB CLAIMED</div>
                      <div style={{ fontSize:"0.58rem", color:"#2a4a2a", letterSpacing:"0.1em" }}>ACTIVITY STARTED</div>
                      <div style={{ fontSize:"0.62rem", color:"#1a3a1a", letterSpacing:"0.04em", marginTop:4 }}>You are early. Stay consistent to unlock access.</div>
                    </div>
                    <button className="join-btn" onClick={() => { setAuthMode("signup"); setShowAuth(true); }}>
                      JOIN NETWORK →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="feed-section">
              <div className="feed-header">
                <span className="live-dot" />
                <span className="feed-title">// LIVE SIGNAL FEED //</span>
                <span className="live-badge">LIVE</span>
              </div>
              <div>
                {feed.slice(0, 7).map(item => {
                  const [u, ...rest] = item.text.split(" ");
                  return (
                    <div key={item.id} className="feed-item">
                      <span className="feed-user">{u}</span>
                      <span className="feed-action">{rest.join(" ")}</span>
                      <span className="feed-time">{fmtAge(item.t)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WTT Panel */}
            <div className="wtt-panel" ref={wttRef}>
              <div className="wtt-header-row">
                <span className="wtt-title">// WORK WITH TODD //</span>
                <span className="wtt-badge">EARNED ACCESS</span>
              </div>
              <div className="wtt-philo">
                Activity builds trust.&nbsp;<span>TB unlocks access.</span>
              </div>

              <div className="wtt-currency-block">
                <div className="wtt-currency-title">TODD BUCKS // NETWORK CURRENCY</div>
                <div className="wtt-currency-desc">
                  Todd Bucks (TB) are the only currency on the site. You earn TB by showing up and staying active.
                </div>
              </div>

              {user && (
                <div className="wtt-balance-card">
                  <div className="wtt-balance-label">TODD BUCKS BALANCE</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                    <span className="wtt-balance-val">{tbBalance}</span>
                    <span className="wtt-balance-unit">TB</span>
                  </div>
                  <div style={{ fontSize:"0.58rem", color:"#2a4a2a", letterSpacing:"0.08em", marginTop:3 }}>
                    {tbBalance === 0 ? "Earned through daily activity and consistency." : "Keep building — more TB unlocks higher tiers."}
                  </div>
                </div>
              )}

              {!user && (
                <div style={{ background:"rgba(192,38,211,0.04)", border:"1px solid rgba(192,38,211,0.14)", padding:"10px 12px", marginBottom:12 }}>
                  <div style={{ fontSize:"0.62rem", color:"#5a3a6a", letterSpacing:"0.06em" }}>Sign in to track Todd Bucks and unlock earned access.</div>
                </div>
              )}

              {WTT_TIERS.map(tier => {
                const st = tierStatus(tier.cost);
                return (
                  <div key={tier.id} className={`tier-card${st === "soon" ? " available" : ""}`}>
                    <div className="tier-label">{tier.label}</div>
                    <div className="tier-name">{tier.name}</div>
                    <div className="tier-desc">{tier.desc}</div>
                    <div>
                      <span className="tier-cost">{tier.cost}</span>
                      <span className="tier-cost-unit">TB</span>
                    </div>
                    <div className={`tier-status vt${st === "soon" ? " available" : ""}`}>{statusLabel[st]}</div>
                    {st === "soon" && !reqSent && (
                      <button className="tier-unlock-btn" onClick={() => {
                        setReqSent(true);
                        addFeedItem(`${user?.username ?? "user"} reserved a priority slot`, "general");
                        fireToast("REQUEST SENT ✓");
                      }}>
                        REQUEST ACCESS →
                      </button>
                    )}
                  </div>
                );
              })}

              {reqSent && (
                <div className="req-sent">✓ REQUEST RECEIVED — TODD WILL BE IN TOUCH</div>
              )}

              <div className="wtt-limit-note">
                <span className="wtt-limit-dot">◉</span>
                Limited slots each week. Access opens in controlled windows.
              </div>
            </div>

            <div style={{ height: 24 }} />
          </div>

          {/* Sticky bar */}
          {user && canClaim && (
            <div className="sticky-bar">
              <button className="sticky-claim-btn" onClick={claimDaily} disabled={claimLoading}>
                {claimLoading ? "CLAIMING..." : "⚡ CLAIM DAILY REWARD"}
              </button>
            </div>
          )}

          {/* Auth modal */}
          {showAuth && (
            <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAuth(false); }}>
              <div className="modal-box" style={{ position:"relative" }}>
                <button className="modal-close" onClick={() => setShowAuth(false)}>✕</button>
                <div className="modal-title">{authMode === "signup" ? "JOIN NETWORK" : "SIGN IN"}</div>
                <div className="modal-sub">
                  {authMode === "signup"
                    ? "Start building your activity signal."
                    : "Welcome back to the network."}
                </div>
                <form onSubmit={handleAuth}>
                  {authErr && <div className="modal-err">{authErr}</div>}
                  <input
                    className="modal-input"
                    placeholder="USERNAME"
                    value={authUser}
                    onChange={e => setAuthUser(e.target.value)}
                    autoComplete="off"
                  />
                  <input
                    className="modal-input"
                    type="password"
                    placeholder="PASSWORD"
                    value={authPass}
                    onChange={e => setAuthPass(e.target.value)}
                  />
                  <button className="modal-submit" type="submit" disabled={authLoading}>
                    {authLoading ? "..." : authMode === "signup" ? "CREATE ACCOUNT →" : "SIGN IN →"}
                  </button>
                </form>
                <div className="modal-toggle">
                  {authMode === "signup" ? (
                    <>Already have an account? <span onClick={() => setAuthMode("login")}>SIGN IN</span></>
                  ) : (
                    <>New here? <span onClick={() => setAuthMode("signup")}>JOIN NETWORK</span></>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Toast */}
          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>
    </>
  );
}
