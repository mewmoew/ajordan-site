export function MaintenanceScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        boxSizing: "border-box",
        background:
          "radial-gradient(ellipse 120% 80% at 50% 20%, rgba(124,58,237,0.22), transparent 55%), radial-gradient(ellipse 90% 60% at 80% 100%, rgba(192,38,211,0.18), transparent 50%), #030008",
        backgroundAttachment: "fixed",
        overflow: "hidden",
      }}
    >
      {/* subtle scan grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            "linear-gradient(rgba(0,255,65,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(192,38,211,0.2) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.13) 2px, rgba(0,0,0,0.13) 4px)",
          pointerEvents: "none",
          mixBlendMode: "multiply",
        }}
      />

      <h1
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-orbitron), var(--font-vt323), system-ui, sans-serif",
          fontSize: "clamp(1.35rem, 5vw, 2.35rem)",
          fontWeight: 700,
          letterSpacing: "0.28em",
          color: "#f0e8ff",
          textTransform: "uppercase",
          textShadow:
            "0 0 20px rgba(192,38,211,0.9), 0 0 48px rgba(124,58,237,0.55), 0 0 80px rgba(0,255,65,0.25)",
          marginBottom: "clamp(20px, 4vh, 36px)",
        }}
      >
        AJORDAN is updating
      </h1>
      <p
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-vt323), ui-monospace, monospace",
          fontSize: "clamp(1.15rem, 4.2vw, 1.85rem)",
          letterSpacing: "0.32em",
          color: "#00ff41",
          textShadow: "0 0 14px rgba(0,255,65,0.85), 0 0 36px rgba(0,255,65,0.35)",
        }}
      >
        Back soon.
      </p>
    </div>
  );
}
