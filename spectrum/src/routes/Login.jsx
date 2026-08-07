import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

const T = {
  navy: "#0A1E3C", navy2: "#0C2A48", navyGlow: "#123A5C",
  panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealBright: "#37B4BE", tealSoft: "#E4F1F2",
  hairline: "#DCE7E9", alert: "#C4452A", alertSoft: "#FBEEEB",
};

const SPECTRUM_LOGO = "data:image/webp;base64,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";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .lg-ui { font-family: 'Archivo', system-ui, sans-serif; }
  .lg-num { font-family: 'IBM Plex Mono', monospace; }
  .lg-in {
    width: 100%; box-sizing: border-box; padding: 11px 13px; font-size: 14px;
    border: 1px solid ${T.hairline}; border-radius: 8px; outline: none; color: ${T.ink};
    background: #FBFDFD; transition: border-color 120ms, box-shadow 120ms;
    font-family: 'Archivo', system-ui, sans-serif;
  }
  .lg-in:focus { border-color: ${T.teal}; box-shadow: 0 0 0 3px ${T.tealSoft}; background: #fff; }
  .lg-btn {
    width: 100%; padding: 12px; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;
    color: #fff; background: ${T.teal}; border: none; border-radius: 8px; cursor: pointer;
    transition: background 120ms, transform 60ms; font-family: 'Archivo', system-ui, sans-serif;
  }
  .lg-btn:hover:not(:disabled) { background: #0B656E; }
  .lg-btn:active:not(:disabled) { transform: translateY(1px); }
  .lg-btn:disabled { opacity: .55; cursor: not-allowed; }
  .lg-link { color: ${T.teal}; font-weight: 600; text-decoration: none; }
  .lg-link:hover { text-decoration: underline; }
  .lg-ecg-lit { stroke-dasharray: 130 1600; animation: lg-sweep 3.6s linear infinite; }
  @keyframes lg-sweep { from { stroke-dashoffset: 260; } to { stroke-dashoffset: -1470; } }
  .lg-dot { animation: lg-beat 1.15s ease-in-out infinite; }
  @keyframes lg-beat { 0%,100%{opacity:.35;transform:scale(1);} 45%{opacity:1;transform:scale(1.55);} }
  @media (prefers-reduced-motion: reduce) {
    .lg-ecg-lit, .lg-dot { animation: none; }
    .lg-ecg-lit { stroke-dashoffset: 0; }
  }
`;

function ecgPath(width, y = 60) {
  const seg = 300; let d = `M0 ${y}`; let x = 0;
  while (x < width) {
    d += ` H${x + 92}`;
    d += ` L${x + 112} ${y} L${x + 120} ${y - 15} L${x + 128} ${y}`;
    d += ` H${x + 150}`;
    d += ` L${x + 156} ${y + 11} L${x + 164} ${y - 44} L${x + 172} ${y + 34} L${x + 180} ${y}`;
    d += ` H${x + 210}`;
    d += ` L${x + 232} ${y - 13} L${x + 252} ${y}`;
    d += ` H${x + seg}`;
    x += seg;
  }
  return d;
}

const Pulse = () => {
  const W = 1440, path = ecgPath(W);
  return (
    <svg viewBox={`0 0 ${W} 120`} preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
      <path d={path} fill="none" stroke={T.tealBright} strokeWidth="1.4" strokeLinejoin="round" opacity="0.16" />
      <path d={path} fill="none" stroke={T.tealBright} strokeWidth="2.4" strokeLinejoin="round"
        strokeLinecap="round" className="lg-ecg-lit" style={{ filter: `drop-shadow(0 0 6px ${T.tealBright})` }} />
    </svg>
  );
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const { reload } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    if (!email || !pw) return;
    setBusy(true); setErr(null);
    try {
      await signIn(email, pw);
      await reload();
      nav("/");
    } catch (e2) {
      setErr(e2?.message || "Sign in failed. Check your email and password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg-ui" style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
      background: `radial-gradient(1200px 600px at 50% -10%, ${T.navyGlow} 0%, ${T.navy2} 40%, ${T.navy} 100%)`,
    }}>
      <style>{styles}</style>

      <div style={{ position: "absolute", top: "20%", left: 0, right: 0, height: 120, opacity: 0.9, pointerEvents: "none" }}>
        <Pulse />
      </div>
      <div style={{ position: "absolute", bottom: "12%", left: 0, right: 0, height: 90, opacity: 0.35, pointerEvents: "none", transform: "scaleX(-1)" }}>
        <Pulse />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 396 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className="lg-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: T.tealBright, display: "inline-block" }} />
          <span className="lg-num" style={{ fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8FB8CE" }}>
            Secure Portal
          </span>
        </div>

        <form onSubmit={submit} style={{
          background: T.panel, borderRadius: 14, padding: "30px 30px 26px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.42)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <img src={SPECTRUM_LOGO} alt="Spectrum Healthcare Solutions"
            style={{ display: "block", width: 210, height: "auto", margin: "0 auto 18px" }} />
          <div style={{ height: 2, width: 44, background: T.teal, borderRadius: 2, margin: "0 auto 22px" }} />

          <h1 style={{ fontSize: 21, fontWeight: 800, textAlign: "center", color: T.ink, margin: "0 0 4px" }}>Sign in</h1>
          <p style={{ fontSize: 12.5, textAlign: "center", color: T.inkSoft, margin: "0 0 22px" }}>
            Executive &amp; partner dashboard access
          </p>

          {err && (
            <div style={{ background: T.alertSoft, border: `1px solid #EBC6BE`, color: T.alert,
              fontSize: 12.5, padding: "9px 12px", borderRadius: 8, marginBottom: 16 }}>
              {err}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="lg-email" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input id="lg-email" className="lg-in" type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@spectrumhealthok.com" />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label htmlFor="lg-pw" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <input id="lg-pw" className="lg-in" type="password" autoComplete="current-password" value={pw}
              onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
          </div>

          <button className="lg-btn" type="submit" disabled={busy || !email || !pw}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

        <p style={{ fontSize: 12.5, color: T.inkSoft, textAlign: "center", marginTop: 18, marginBottom: 0 }}>
          <Link className="lg-link" to="/reset-password">Forgot password?</Link>
          <span style={{ margin: "0 8px", color: T.hairline }}>·</span>
          <Link className="lg-link" to="/request-access">Request access</Link>
        </p>
        </form>

        <p className="lg-num" style={{ fontSize: 10.5, textAlign: "center", color: "#6E93AB", marginTop: 18, letterSpacing: "0.04em" }}>
          Spectrum Healthcare Solutions · Aggregate data · RLS-enforced
        </p>
      </div>
    </div>
  );
}
