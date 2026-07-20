import React from "react";

/* Shared Spectrum tokens */
export const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealBright: "#37B4BE", tealSoft: "#E4F1F2",
  hairline: "#DCE7E9", alert: "#C4452A", alertSoft: "#FBEEEB", amber: "#B07C1F",
  navy: "#0A1E3C", navy2: "#0C2A48", navyGlow: "#123A5C",
};

export const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .ed-ui { font-family: 'Archivo', system-ui, sans-serif; }
  .ed-display { font-family: 'Archivo', system-ui, sans-serif; }
  .ed-num { font-family: 'IBM Plex Mono', monospace; }
  .ed-card { background: ${T.panel}; border: 1px solid ${T.hairline}; border-radius: 10px; }
  .ed-row { cursor: pointer; transition: background 120ms ease; }
  .ed-row:hover { background: ${T.tealSoft}; }
  .ed-in {
    width: 100%; box-sizing: border-box; padding: 11px 13px; font-size: 14px;
    border: 1px solid ${T.hairline}; border-radius: 8px; outline: none; color: ${T.ink};
    background: #FBFDFD; font-family: 'Archivo', system-ui, sans-serif;
  }
  .ed-in:focus { border-color: ${T.teal}; box-shadow: 0 0 0 3px ${T.tealSoft}; background: #fff; }
  .ed-btn {
    padding: 11px 18px; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;
    border-radius: 8px; cursor: pointer; border: 1px solid transparent;
    font-family: 'Archivo', system-ui, sans-serif;
  }
  .ed-btn-primary { background: ${T.teal}; color: #fff; }
  .ed-btn-primary:hover:not(:disabled) { background: #0B656E; }
  .ed-btn-primary:disabled { opacity: .55; cursor: not-allowed; }
  .ed-btn-ghost { background: transparent; color: ${T.inkSoft}; border-color: ${T.hairline}; }
  @media (prefers-reduced-motion: reduce) { .ed-pulse { animation: none !important; } }
`;

export const PulseLine = ({ color = T.teal, width = 46 }) => (
  <svg className="ed-pulse" width={width} height="14" viewBox={`0 0 ${width} 14`} aria-hidden="true">
    <path d={`M0 7 H${width * 0.3} L${width * 0.38} 2 L${width * 0.48} 12 L${width * 0.56} 7 H${width}`}
      fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const Loading = ({ label = "Loading…" }) => (
  <div className="ed-ui" style={{
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: T.mist, color: T.inkSoft, fontSize: 13,
  }}>{label}</div>
);

export const Label = ({ children }) => (
  <label style={{
    fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
    color: T.inkSoft, fontWeight: 600, display: "block", marginBottom: 6,
  }}>{children}</label>
);

export const Banner = ({ children, tone = "error", onClose }) => {
  const styles = tone === "error"
    ? { bg: T.alertSoft, border: "#EBC6BE", fg: T.alert }
    : { bg: T.tealSoft, border: "#C6E0E2", fg: "#0B656E" };
  return (
    <div style={{
      background: styles.bg, border: `1px solid ${styles.border}`, color: styles.fg,
      fontSize: 12.5, padding: "9px 12px", borderRadius: 8, marginBottom: 16,
      display: "flex", justifyContent: "space-between", gap: 8,
    }}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: styles.fg, cursor: "pointer" }}>×</button>}
    </div>
  );
};
