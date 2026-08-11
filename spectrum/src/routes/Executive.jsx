import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, AreaChart, Area,
} from "recharts";
import { signOut } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { supabase } from "../lib/supabase.js";
import { QapiTab, QapiFacilityPanel } from "./Qapi.jsx";
import { HeatmapTab } from "./Heatmap.jsx";
import { AnalysisTab } from "./Analysis.jsx";
import QapiScorecard from "./QapiScorecard.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { ScopeProvider, ScopeSelector, ScopeBanner, useScope, applyScope } from "../lib/scope.jsx";

/* ————————————————————— Spectrum design tokens ————————————————————— */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};

const SPECTRUM_LOGO = "data:image/webp;base64,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";

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .ed-ui { font-family: 'Archivo', system-ui, sans-serif; }
  .ed-display { font-family: 'Archivo', system-ui, sans-serif; }
  .ed-num { font-family: 'IBM Plex Mono', monospace; }
  .ed-card { background: ${T.panel}; border: 1px solid ${T.hairline}; border-radius: 10px; }
  .ed-row { cursor: pointer; transition: background 120ms ease; }
  .ed-row:hover { background: ${T.tealSoft}; }
  @media (prefers-reduced-motion: reduce) { .ed-pulse { animation: none !important; } }

  /* — Tailwind utility shim (no Tailwind in this build) — */
  .min-h-screen { min-height: 100vh; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .w-full { width: 100%; }
  .text-left { text-align: left; }
  .flex { display: flex; }
  .flex-wrap { flex-wrap: wrap; }
  .grid { display: grid; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .items-end { align-items: flex-end; }
  .items-baseline { align-items: baseline; }
  .justify-between { justify-content: space-between; }
  .gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .gap-4 { gap: 16px; }
  .gap-6 { gap: 24px; } .gap-8 { gap: 32px; }
  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0,1fr)); }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .p-4 { padding: 16px; } .p-5 { padding: 20px; } .p-6 { padding: 24px; }
  .px-6 { padding-left: 24px; padding-right: 24px; }
  .py-3 { padding-top: 12px; padding-bottom: 12px; }
  .py-5 { padding-top: 20px; padding-bottom: 20px; }
  .pt-8 { padding-top: 32px; }
  .pb-14 { padding-bottom: 56px; }
  .pr-4 { padding-right: 16px; }
  @media (min-width: 768px) {
    [class~="md:grid-cols-2"] { grid-template-columns: repeat(2, minmax(0,1fr)); }
    [class~="md:grid-cols-3"] { grid-template-columns: repeat(3, minmax(0,1fr)); }
    [class~="md:grid-cols-4"] { grid-template-columns: repeat(4, minmax(0,1fr)); }
    [class~="md:grid-cols-5"] { grid-template-columns: repeat(5, minmax(0,1fr)); }
  }
  @media (min-width: 1024px) {
    [class~="lg:grid-cols-2"] { grid-template-columns: repeat(2, minmax(0,1fr)); }
    [class~="lg:grid-cols-3"] { grid-template-columns: repeat(3, minmax(0,1fr)); }
    [class~="lg:col-span-2"] { grid-column: span 2 / span 2; }
  }
`;

const PulseLine = ({ color = T.teal, width = 46 }) => (
  <svg className="ed-pulse" width={width} height="14" viewBox={`0 0 ${width} 14`} aria-hidden="true">
    <path d={`M0 7 H${width * 0.3} L${width * 0.38} 2 L${width * 0.48} 12 L${width * 0.56} 7 H${width}`}
      fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
// Tiny inline monthly trend line for table rows.
const Sparkline = ({ values = [], width = 84, height = 22, stroke = T.teal }) => {
  const pts = values.filter((v) => v != null).map(Number);
  if (pts.length < 2) return <span style={{ fontSize: 11, color: T.inkSoft }}>—</span>;
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const step = width / (pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(height - ((v - min) / span) * height).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: "block" }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={height - ((last - min) / span) * height} r="2" fill={stroke} />
    </svg>
  );
};
// Month-over-month delta chip: arrow + magnitude, coloured by direction.
const MoMDelta = ({ delta, unit = "", higherBetter = true }) => {
  if (delta == null) return null;
  const flat = Math.abs(delta) < 0.05;
  const up = delta > 0;
  const good = flat ? true : higherBetter ? up : !up;
  const color = flat ? T.inkSoft : good ? T.teal : T.alert;
  const arrow = flat ? "→" : up ? "▲" : "▼";
  return (
    <span className="ed-num" style={{ color, fontSize: 11 }}>
      {arrow} {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit} MoM
    </span>
  );
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthLabel = (iso) => { const [y,m] = iso.split("-"); return `${MONTHS[+m-1]} ${y}`; };
const ymKey = (iso) => iso.slice(0, 7);  // 2026-06-01 -> 2026-06
const shortDay = (iso) => { const [ , m, d] = iso.split("-"); return `${MONTHS[+m-1].slice(0,3)} ${+d}`; };
const n1 = (v) => (v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }));
const n0 = (v) => (v == null ? "—" : Math.round(Number(v)).toLocaleString());

const ChartTip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ed-ui" style={{ background: T.ink, color: "#fff", padding: "8px 12px", fontSize: 12, borderRadius: 6 }}>
      <div style={{ opacity: 0.7, marginBottom: 2 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="ed-num">{p.name}: {fmt ? fmt(p.value) : p.value}</div>
      ))}
    </div>
  );
};

const SectionLabel = ({ children, right }) => (
  <div className="flex items-baseline justify-between" style={{ borderBottom: `2px solid ${T.teal}`, paddingBottom: 8, marginBottom: 14 }}>
    <span className="ed-ui" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.ink, fontWeight: 800 }}>{children}</span>
    {right && <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{right}</span>}
  </div>
);

const KPI_TONE = {
  alert: { bar: T.alert, tint: "rgba(196,69,42,0.06)", glyph: "▲" },
  watch: { bar: T.amber, tint: "rgba(176,124,31,0.06)", glyph: "◆" },
  ok:    { bar: T.teal, tint: "transparent", glyph: "" },
  muted: { bar: T.hairline, tint: "transparent", glyph: "" },
};
const Kpi = ({ label, value, sub, good = true, tone }) => {
  // Legacy path: no `tone` prop -> identical to the original component.
  if (!tone) {
    return (
      <div className="ed-card p-5" style={{ borderTop: `3px solid ${good ? T.teal : T.amber}` }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 10, fontWeight: 500 }}>{label}</div>
        <div className="ed-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div className="ed-num" style={{ fontSize: 11.5, marginTop: 8, color: good ? T.teal : T.amber }}>{sub}</div>
      </div>
    );
  }
  // Toned path: emphasises what's off, recedes what's fine / informational.
  const t = KPI_TONE[tone] || KPI_TONE.muted;
  const flagged = tone === "alert" || tone === "watch";
  return (
    <div className="ed-card p-5" style={{ borderTop: `3px solid ${t.bar}`, background: t.tint }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 500 }}>{label}</span>
        {t.glyph && <span aria-hidden style={{ color: t.bar, fontSize: 12, lineHeight: 1 }}>{t.glyph}</span>}
      </div>
      <div className="ed-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: tone === "muted" ? T.inkSoft : T.ink }}>{value}</div>
      <div className="ed-num" style={{ fontSize: 11.5, marginTop: 8, color: flagged ? t.bar : T.inkSoft }}>{sub}</div>
    </div>
  );
};

const Empty = ({ children }) => (
  <div className="ed-card p-6" style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.6, borderLeft: `4px solid ${T.amber}` }}>
    {children}
  </div>
);

const starColor = (n) => (n == null ? T.hairline : n >= 4 ? T.teal : n >= 3 ? T.amber : T.alert);
const Stars = ({ n, size = 16 }) => {
  if (n == null) return <span style={{ color: T.inkSoft, fontSize: 12 }}>Not rated</span>;
  return (
    <span aria-label={`${n} of 5 stars`} style={{ color: starColor(n), fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(n)}<span style={{ color: T.hairline }}>{"★".repeat(5 - n)}</span>
    </span>
  );
};
const RatingRow = ({ label, n }) => (
  <div className="flex items-center justify-between" style={{ padding: "7px 0", borderBottom: `1px solid ${T.hairline}` }}>
    <span style={{ fontSize: 13, color: T.ink }}>{label}</span>
    <Stars n={n} />
  </div>
);
const Stat = ({ label, value, tone }) => (
  <div>
    <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 4 }}>{label}</div>
    <div className="ed-num" style={{ fontSize: 16, fontWeight: 600, color: tone || T.ink }}>{value}</div>
  </div>
);
const fmtDate = (iso) => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };
// Colour a value against a metric_thresholds row. No row, or no amber -> neutral.
const toneFrom = (v, th) => {
  if (v == null || !th || th.amber == null) return T.ink;
  const val = Number(v);
  if (th.direction === "higher_better") return val <= Number(th.red) ? T.alert : val <= Number(th.amber) ? T.amber : T.teal;
  return val >= Number(th.red) ? T.alert : val >= Number(th.amber) ? T.amber : T.teal;
};
const thNum = (v) => (v == null ? null : Number(v));
// Map a value against a threshold row to a KPI tone name. No scoring -> "muted".
const toneName = (v, th) => {
  if (v == null || !th || th.amber == null) return "muted";
  const c = toneFrom(v, th);
  return c === T.alert ? "alert" : c === T.amber ? "watch" : "ok";
};
// —— Data-freshness strip: disambiguates a blank cell (missing) from a real zero ——
const covTone = (n, d) => (d === 0 ? T.hairline : n >= d ? T.teal : n > 0 ? T.amber : T.alert);
const covGlyph = (n, d) => (d === 0 ? "·" : n >= d ? "●" : n > 0 ? "◆" : "▲");
const FreshnessStrip = ({ coverage }) => {
  if (!coverage) return null;
  const items = [
    { label: "Census", n: coverage.census, d: coverage.facilities },
    { label: "Growth", n: coverage.growth, d: coverage.facilities },
    { label: "RTA", n: coverage.rta, d: coverage.facilities },
    { label: "Daily census", n: coverage.daily, d: coverage.facilities },
    { label: "CMS", n: coverage.cms.loaded, d: coverage.cms.denom },
  ];
  return (
    <div className="ed-card flex flex-wrap items-center gap-4" style={{ padding: "10px 16px", marginBottom: 20 }}>
      <span style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 700 }}>Data loaded</span>
      {items.map((it) => {
        const tone = covTone(it.n, it.d);
        return (
          <span key={it.label} className="ed-num" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span aria-hidden style={{ color: tone, lineHeight: 1 }}>{covGlyph(it.n, it.d)}</span>
            <span style={{ color: T.inkSoft }}>{it.label}</span>
            <span style={{ color: tone === T.hairline ? T.inkSoft : tone, fontWeight: 600 }}>{it.n}/{it.d}</span>
          </span>
        );
      })}
      {coverage.cms.latest && (
        <span className="ed-num" style={{ marginLeft: "auto", fontSize: 11, color: T.inkSoft }}>CMS updated {fmtDate(coverage.cms.latest)}</span>
      )}
    </div>
  );
};

/* ————————————————————— Tab: Overview ————————————————————— */
/* ——— Vitals-monitor styles (scoped with a vm- prefix) ——— */
const vitalsCSS = `
  .vm-hero{position:relative;overflow:hidden;border-radius:18px;color:#EAF2F4;border:1px solid #113255;
     background:radial-gradient(680px 340px at 10% -20%,#123A5C 0%,rgba(18,58,92,0) 62%),linear-gradient(160deg,#0A1E3C 0%,#0C2A48 100%);}
  .vm-gridbg{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;transition:opacity 1.1s ease;}
  .vm-boot{position:absolute;inset:0;background:#0A1E3C;z-index:9;display:flex;align-items:center;justify-content:center;border-radius:18px;transition:opacity .5s ease;}
  .vm-scanline{position:absolute;left:0;right:0;height:2px;top:0;background:linear-gradient(90deg,transparent,#37B4BE,transparent);box-shadow:0 0 14px 2px rgba(55,180,190,.7);}
  .vm-btxt{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.35em;color:#7FE0E8;text-transform:uppercase;}
  .vm-monbar{display:flex;align-items:center;justify-content:space-between;padding:13px 22px 9px;position:relative;z-index:2;}
  .vm-lead-in{display:flex;align-items:center;gap:16px;}
  .vm-live{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9FE0E6;font-weight:600;}
  .vm-dot{width:8px;height:8px;border-radius:50%;background:#37B4BE;animation:vm-pulse 1.05s infinite;}
  @keyframes vm-pulse{0%{box-shadow:0 0 0 0 rgba(55,180,190,.6);}70%{box-shadow:0 0 0 8px rgba(55,180,190,0);}100%{box-shadow:0 0 0 0 rgba(55,180,190,0);}}
  .vm-lead-tag{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.12em;color:#5F8B93;text-transform:uppercase;}
  .vm-bpm{display:flex;align-items:baseline;gap:6px;font-family:'IBM Plex Mono',monospace;color:#7FE0E8;}
  .vm-heart{color:#F0A594;font-size:14px;animation:vm-thump 0.83s infinite;align-self:center;}
  @keyframes vm-thump{0%,100%{transform:scale(1);}12%{transform:scale(1.32);}24%{transform:scale(1);}}
  .vm-bpm b{font-size:20px;font-weight:600;}.vm-bpm small{font-size:10.5px;color:#5F8B93;letter-spacing:.06em;}
  .vm-date{font-size:11.5px;color:#5F8B93;font-family:'IBM Plex Mono',monospace;}
  .vm-ecgstrip{position:relative;height:96px;margin:0 8px;z-index:2;background:repeating-linear-gradient(90deg,rgba(55,180,190,.05) 0 1px,transparent 1px 22px),repeating-linear-gradient(0deg,rgba(55,180,190,.05) 0 1px,transparent 1px 22px);}
  .vm-ecglabel{position:absolute;left:14px;top:8px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#5F8B93;z-index:3;}
  .vm-kgrid{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr 1fr;position:relative;z-index:2;border-top:1px solid rgba(255,255,255,.07);}
  .vm-kcell{padding:15px 18px 16px;position:relative;}
  .vm-kcell + .vm-kcell{border-left:1px solid rgba(255,255,255,.07);}
  .vm-ktick{position:absolute;left:18px;top:15px;width:16px;height:2px;border-radius:2px;background:var(--ch,#37B4BE);}
  .vm-kcell.vm-alarm .vm-ktick{width:9px;height:9px;top:12px;border-radius:50%;animation:vm-alarmblink 1s steps(1,end) infinite;}
  @keyframes vm-alarmblink{0%,49%{opacity:1;box-shadow:0 0 9px 1px var(--ch);}50%,100%{opacity:.28;box-shadow:none;}}
  .vm-alarmtag{position:absolute;right:16px;top:13px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ch);animation:vm-alarmblink 1s steps(1,end) infinite;}
  .vm-klabel{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ch,#8FB4BA);font-weight:600;margin:12px 0 8px;}
  .vm-kval{font-size:36px;font-weight:600;line-height:1;letter-spacing:-.02em;color:#fff;font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;}
  .vm-lead .vm-kval{font-size:44px;}
  .vm-ksub{font-size:11px;color:#8FB4BA;margin-top:9px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
  .vm-delta{display:inline-flex;align-items:center;gap:3px;font-weight:600;padding:1px 6px;border-radius:20px;font-size:10.5px;}
  .vm-delta.up{background:rgba(55,180,190,.16);color:#7FE0E8;}
  .vm-delta.down{background:rgba(196,69,42,.20);color:#F0A594;}
  .vm-gaugewrap{display:flex;align-items:center;gap:11px;}
  .vm-stars{font-size:15px;letter-spacing:1px;color:#F0CE8B;}
  .vm-chwave{margin-top:9px;height:24px;width:100%;display:block;}
  .vm-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0 8px;}
  .vm-chip{background:#fff;border:1px solid ${T.hairline};border-radius:12px;padding:12px 14px;display:flex;gap:11px;align-items:flex-start;}
  .vm-chip-ic{width:28px;height:28px;border-radius:8px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;}
  .vm-chip h4{margin:0 0 2px;font-size:12px;font-weight:600;color:${T.ink};}
  .vm-chip p{margin:0;font-size:11px;color:${T.inkSoft};line-height:1.35;}
  .vm-tile{background:${T.mist};border-radius:10px;padding:11px 13px;}
  .vm-fgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
  .vm-fcard{background:#fff;border:1px solid ${T.hairline};border-radius:14px;padding:15px 16px;cursor:pointer;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;position:relative;overflow:hidden;}
  .vm-fcard:hover{transform:translateY(-3px);box-shadow:0 10px 26px -12px rgba(19,42,46,.34);border-color:#C6E0E2;}
  .vm-fname{font-size:13.5px;font-weight:600;margin:0 0 2px;color:${T.ink};}
  .vm-floc{font-size:11px;color:${T.inkSoft};margin:0 0 11px;}
  .vm-fbig{display:flex;align-items:baseline;gap:6px;}
  .vm-fn{font-size:25px;font-weight:600;color:${T.ink};}.vm-fl{font-size:10.5px;color:${T.inkSoft};}
  .vm-fministars{font-size:11px;color:${T.amber};margin-top:9px;letter-spacing:1px;}
  .vm-fcap{display:flex;justify-content:space-between;margin-top:7px;font-size:10px;color:${T.inkSoft};}
  .vm-pill{position:absolute;top:13px;right:13px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;}
  .vm-fdetail{overflow:hidden;transition:max-height .32s ease;}
  .vm-fdetail-inner{border-top:1px dashed ${T.hairline};margin-top:12px;padding-top:11px;display:grid;grid-template-columns:1fr 1fr;gap:9px 14px;}
  .vm-mini{font-size:10.5px;color:${T.inkSoft};}.vm-mini b{display:block;font-size:14px;color:${T.ink};font-weight:600;margin-top:1px;}
  .vm-openbtn{margin-top:12px;width:100%;background:${T.tealSoft};color:${T.teal};border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}
  .vm-openbtn:hover{background:#D3EAEC;}
  .vm-skel{background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.15) 37%,rgba(255,255,255,.06) 63%);background-size:400% 100%;border-radius:6px;animation:vm-shimmer 1.4s ease infinite;}
  .vm-skel-l{background:linear-gradient(90deg,#EEF3F4 25%,#E1EAEC 37%,#EEF3F4 63%);background-size:400% 100%;border-radius:6px;animation:vm-shimmer 1.4s ease infinite;}
  @keyframes vm-shimmer{0%{background-position:100% 0;}100%{background-position:0 0;}}
  .vm-bootsweep{position:absolute;left:0;top:0;bottom:0;width:130px;background:linear-gradient(90deg,transparent,rgba(55,180,190,.4),transparent);animation:vm-bootsweep 1.3s linear infinite;}
  @keyframes vm-bootsweep{0%{transform:translateX(-150px);}100%{transform:translateX(900px);}}
  .vm-secbar{display:flex;align-items:center;gap:10px;margin:26px 0 14px;border-bottom:2px solid ${T.teal};padding-bottom:8px;}
  .vm-secbar .vm-tick2{width:10px;height:10px;border-radius:50%;background:${T.teal};box-shadow:0 0 0 3px ${T.tealSoft};flex:0 0 auto;}
  .vm-secbar h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${T.ink};font-weight:800;margin:0;}
  .vm-secbar .vm-secright{margin-left:auto;font-size:11px;color:${T.inkSoft};font-family:'IBM Plex Mono',monospace;}
  .vm-trow{cursor:pointer;transition:background 120ms ease;}
  .vm-trow:hover{background:${T.tealSoft};}
  @media (max-width:900px){.vm-kgrid{grid-template-columns:1fr 1fr;}.vm-fgrid{grid-template-columns:1fr 1fr;}.vm-strip{grid-template-columns:1fr 1fr;}.vm-kcell + .vm-kcell{border-left:none;}}
  @media (max-width:560px){.vm-kgrid{grid-template-columns:1fr;}.vm-fgrid{grid-template-columns:1fr;}.vm-strip{grid-template-columns:1fr;}.vm-lead .vm-kval{font-size:38px;}}
  @media (prefers-reduced-motion: reduce){.vm-heart,.vm-dot,.vm-ktick,.vm-alarmtag,.vm-skel,.vm-skel-l,.vm-bootsweep{animation:none !important;}}
`;

/* ——— Vitals-monitor building blocks (canvas waveforms, decode counters, rings) ——— */
const waveFns = {
  ecg(ph){let v=0;v+=0.10*Math.exp(-Math.pow((ph-0.16)/0.026,2));v-=0.07*Math.exp(-Math.pow((ph-0.29)/0.010,2));v+=1.00*Math.exp(-Math.pow((ph-0.33)/0.0090,2));v-=0.22*Math.exp(-Math.pow((ph-0.37)/0.013,2));v+=0.24*Math.exp(-Math.pow((ph-0.60)/0.050,2));return v;},
  ecgfast(ph){return waveFns.ecg(ph);},
  pleth(ph){return 0.9*Math.exp(-Math.pow((ph-0.28)/0.13,2))+0.34*Math.exp(-Math.pow((ph-0.62)/0.15,2))-0.2;},
  resp(ph){return 0.72*Math.sin(2*Math.PI*ph-Math.PI/2);},
  steady(ph){return 0.42*Math.sin(2*Math.PI*ph)+0.16*Math.sin(4*Math.PI*ph+0.6);},
};
const CHW = {
  ecg:{pxPerSec:52,beatPx:44,gap:9,mid:0.55,amp:0.34},
  ecgfast:{pxPerSec:74,beatPx:40,gap:9,mid:0.55,amp:0.34},
  pleth:{pxPerSec:50,beatPx:58,gap:9,mid:0.56,amp:0.30},
  resp:{pxPerSec:40,beatPx:120,gap:8,mid:0.5,amp:0.34},
  steady:{pxPerSec:44,beatPx:80,gap:8,mid:0.5,amp:0.30},
};

// A single live-scrolling waveform channel drawn on a canvas (ICU-monitor style:
// persistent trace with a moving erase gap). Cleans up its rAF loop on unmount.
function WaveCanvas({ type, color, lineW = 1.4, glow = null, glowBlur = 5, pxPerSec, beatPx, gap, mid, amp, style, className, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const fn = waveFns[type] || waveFns.steady;
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, d = 0, prevX = 0, prevY = 0, raf = 0, last = performance.now(), hidden = false;
    const strokeStatic = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = color; ctx.lineWidth = lineW; ctx.lineJoin = "round"; ctx.lineCap = "round";
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = glowBlur; } else { ctx.shadowBlur = 0; }
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) { const phase = (x / beatPx) % 1, y = H * mid - fn(phase) * (H * amp); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      prevX = 0; prevY = H * mid; d = 0;
      if (reduce && W && H) strokeStatic();
    };
    const loop = (now) => {
      if (hidden) { raf = requestAnimationFrame(loop); return; }   // idle while tab hidden
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (W && H) {
        d += pxPerSec * dt;
        const x = d % W, phase = (d / beatPx) % 1, y = H * mid - fn(phase) * (H * amp);
        ctx.clearRect(x, 0, gap, H);
        if (x >= prevX) {
          ctx.strokeStyle = color; ctx.lineWidth = lineW; ctx.lineJoin = "round"; ctx.lineCap = "round";
          if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = glowBlur; } else { ctx.shadowBlur = 0; }
          ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke(); ctx.shadowBlur = 0;
        }
        prevX = x; prevY = y;
      }
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => { hidden = document.hidden; if (!hidden) last = performance.now(); };
    resize(); window.addEventListener("resize", resize);
    if (reduce) { strokeStatic(); }
    else { document.addEventListener("visibilitychange", onVis); raf = requestAnimationFrame(loop); }
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); };
  }, [type, color, lineW, glow, glowBlur, pxPerSec, beatPx, gap, mid, amp]);
  return <canvas ref={ref} className={className} style={style} aria-hidden="true" />;
}

// Number that "decodes" into place — digits scramble, then lock. Null -> em dash.
function Decode({ value, dec = 0, suffix = "", dur = 1200, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (value == null || Number.isNaN(Number(value))) { el.textContent = "—"; return; }
    const glyphs = "0123456789"; const t0 = performance.now(); let raf = 0;
    const fmt = (v) => (dec ? Number(v).toFixed(dec) : Math.round(v).toLocaleString()) + suffix;
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      if (p < 0.82) {
        const base = (value * (0.4 + 0.6 * p)).toFixed(dec);
        el.textContent = base.split("").map((ch) => (/\d/.test(ch) && Math.random() < (0.7 - p * 0.7) ? glyphs[Math.floor(Math.random() * 10)] : ch)).join("") + suffix;
      } else {
        const e = 1 - Math.pow(1 - (p - 0.82) / 0.18, 3);
        el.textContent = fmt(value * (0.9 + 0.1 * e));
      }
      if (p < 1) raf = requestAnimationFrame(frame); else el.textContent = fmt(value);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value, dec, suffix, dur]);
  return <span ref={ref} className="ed-num" style={style}>{value == null ? "—" : "0"}</span>;
}

// SVG ring gauge that draws its arc on mount.
function Ring({ size, r, width, frac, color, track = T.mist, delay = 60, children }) {
  const ref = useRef(null);
  const C = 2 * Math.PI * r;
  const target = C * (1 - Math.max(0, Math.min(1, frac || 0)));
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.transition = "none"; el.style.strokeDashoffset = String(C);
    const id = setTimeout(() => { el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"; el.style.strokeDashoffset = String(target); }, delay);
    return () => clearTimeout(id);
  }, [target, C, delay]);
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={width} />
      <circle ref={ref} cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} strokeDasharray={C} strokeDashoffset={C} />
      {children}
    </svg>
  );
}

// Bar that grows from 0 to pct% on mount.
function GrowBar({ pct, color, height = 9, bg = T.mist, radius = 5, delay = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const id = setTimeout(() => { el.style.width = Math.max(0, Math.min(100, pct || 0)) + "%"; }, delay);
    return () => clearTimeout(id);
  }, [pct, delay]);
  return <div style={{ height, background: bg, borderRadius: radius, overflow: "hidden" }}><div ref={ref} style={{ height: "100%", width: 0, background: color, borderRadius: radius, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} /></div>;
}

function Donut({ snf, ltc }) {
  const tot = (snf || 0) + (ltc || 0) || 1;
  const frac = (snf || 0) / tot;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center", height: "100%" }}>
      <Ring size={146} r={38} width={20} frac={frac} color={T.teal} track={T.tealSoft} delay={200}>
        <text x="73" y="69" textAnchor="middle" fontSize="23" fontWeight="600" fill={T.ink} fontFamily="IBM Plex Mono">{Math.round(frac * 100)}%</text>
        <text x="73" y="86" textAnchor="middle" fontSize="11" fill={T.inkSoft}>SNF</text>
      </Ring>
      <div style={{ fontSize: 12.5, lineHeight: 2.1 }}>
        <div><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: T.teal }} /> SNF · <b className="ed-num">{n0(snf)}</b></div>
        <div><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#B9D4D8" }} /> LTC · <b className="ed-num">{n0(ltc)}</b></div>
      </div>
    </div>
  );
}

const vmColor = { alarm: "#F0A594", watch: "#F0CE8B", ok: "#37B4BE" };
const rtaLineColor = (r) => (r == null ? T.inkSoft : r <= 12 ? T.teal : r <= 21.3 ? T.amber : T.alert);

// The dark vitals-monitor hero: boot sweep, live ECG, and per-channel traces.
function VitalsHero({ channels, bpm, admitsPerDay, beatPxMain, monthText }) {
  const [booting, setBooting] = useState(true);
  const [step, setStep] = useState(0);
  const scanRef = useRef(null);
  const steps = ["initializing portfolio", "loading census · rta · qapi", "syncing cms five-star", "portfolio online"];
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i += 1; setStep(Math.min(i, steps.length - 1)); }, 240);
    if (scanRef.current && scanRef.current.animate) scanRef.current.animate([{ top: "0%" }, { top: "100%" }], { duration: 900, easing: "ease-in-out" });
    const done = setTimeout(() => { clearInterval(t); setBooting(false); }, 980);
    return () => { clearInterval(t); clearTimeout(done); };
  }, []);
  return (
    <div className="vm-hero">
      <div className="vm-gridbg" style={{ opacity: booting ? 0 : 1 }} />
      <div className="vm-boot" style={{ opacity: booting ? 1 : 0, pointerEvents: booting ? "auto" : "none" }}>
        <div className="vm-scanline" ref={scanRef} />
        <div className="vm-btxt">{steps[step]}</div>
      </div>
      <div className="vm-monbar">
        <div className="vm-lead-in">
          <span className="vm-live"><span className="vm-dot" /> live monitoring</span>
          <span className="vm-lead-tag">portfolio · lead II · {channels.facilities} facilities</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div className="vm-bpm"><span className="vm-heart" style={{ animationDuration: (60 / bpm).toFixed(2) + "s" }}>♥</span><b>{bpm}</b><small>bpm · {admitsPerDay == null ? "—" : Math.round(admitsPerDay)} admits/day</small></div>
          <span className="vm-date">{monthText} · live</span>
        </div>
      </div>
      <div className="vm-ecgstrip">
        <div className="vm-ecglabel">portfolio rhythm · pulse tracks admissions cadence</div>
        <WaveCanvas type="ecg" color="#37B4BE" lineW={2} glow="rgba(55,180,190,.85)" glowBlur={8} pxPerSec={210} beatPx={beatPxMain} gap={26} mid={0.52} amp={0.40} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
      <div className="vm-kgrid">
        {channels.items.map((c) => {
          const w = CHW[c.wave] || CHW.steady;
          return (
            <div key={c.key} className={`vm-kcell${c.lead ? " vm-lead" : ""}${c.alarm ? " vm-alarm" : ""}`} style={{ "--ch": c.ch }}>
              <div className="vm-ktick" />
              {c.alarm && <span className="vm-alarmtag">{c.alarmTag}</span>}
              <div className="vm-klabel">{c.label}</div>
              <div className="vm-gaugewrap">{c.value}</div>
              <div className="vm-ksub">{c.sub}</div>
              <WaveCanvas type={c.wave} color={c.waveColor} lineW={1.4} glow={c.waveColor} glowBlur={5} pxPerSec={w.pxPerSec} beatPx={w.beatPx} gap={w.gap} mid={w.mid} amp={w.amp} className="vm-chwave" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FacilityCard({ f, qapiStatus, onOpen }) {
  const [open, setOpen] = useState(false);
  const cap = f.building ? Math.round((f.census / f.building) * 100) : null;
  const star = f.cms?.overall_rating ?? null;
  const snfRta = f.rta?.snfRate ?? null;
  const hprd = f.cms?.total_nurse_hprd ?? null;
  const capBar = cap == null ? 0 : cap;
  const capBarColor = cap == null ? T.hairline : cap < 50 ? T.alert : cap < 65 ? T.amber : T.teal;
  const up = (f.delta ?? 0) >= 0;
  const qColor = qapiStatus === "green" ? T.teal : qapiStatus === "amber" ? T.amber : qapiStatus === "red" ? T.alert : T.inkSoft;
  return (
    <div className="vm-fcard" role="button" tabIndex={0} aria-expanded={open} aria-label={`${f.name}, ${n0(f.census)} census — toggle detail`} onClick={() => setOpen((o) => !o)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}>
      {f.delta != null && <span className="vm-pill" style={{ background: up ? T.tealSoft : "#FBEEEB", color: up ? T.teal : T.alert }}>{up ? "▲" : "▼"} {Math.abs(Math.round(f.delta))}</span>}
      <p className="vm-fname">{f.name}</p>
      <p className="vm-floc">{cap == null ? "census only" : `${cap}% capture`}</p>
      <div className="vm-fbig"><span className="ed-num vm-fn">{n0(f.census)}</span><span className="vm-fl">avg census</span></div>
      <div className="vm-fministars">{star == null ? <span style={{ color: T.inkSoft }}>CMS not rated</span> : <>{"★".repeat(star)}<span style={{ color: T.hairline }}>{"★".repeat(5 - star)}</span> <span style={{ color: T.inkSoft }}>{star}.0 CMS</span></>}</div>
      <GrowBar pct={capBar} color={capBarColor} height={7} bg={T.tealSoft} delay={300} />
      <div className="vm-fcap"><span>{n0(f.census)} on service</span><span>{f.nonSpec == null ? "—" : Math.round(f.nonSpec)} open</span></div>
      <div className="vm-fdetail" style={{ maxHeight: open ? 220 : 0 }}>
        <div className="vm-fdetail-inner">
          <div className="vm-mini">SNF RTA<b className="ed-num" style={{ color: rtaLineColor(snfRta) }}>{snfRta == null ? "—" : snfRta.toFixed(1) + "%"}</b></div>
          <div className="vm-mini">QAPI<b style={{ color: qColor, textTransform: "capitalize" }}>{qapiStatus || "—"}</b></div>
          <div className="vm-mini">Nurse HPRD<b className="ed-num">{hprd == null ? "—" : Number(hprd).toFixed(2)}</b></div>
          <div className="vm-mini">SNF / LTC<b className="ed-num">{n0(f.snf)} / {n0(f.ltc)}</b></div>
        </div>
        <button className="vm-openbtn" onClick={(e) => { e.stopPropagation(); onOpen(f.name); }}>Open facility →</button>
      </div>
    </div>
  );
}

// Themed loading state — a monitor "warming up" instead of a bare "Loading…".
function BootLoader({ month }) {
  const skel = (w, h, mt) => <div className="vm-skel" style={{ width: w, height: h, marginTop: mt, borderRadius: 6 }} />;
  return (
    <div style={{ padding: "4px 0" }}>
      <div className="vm-hero">
        <div className="vm-gridbg" style={{ opacity: 1 }} />
        <div className="vm-monbar">
          <span className="vm-live"><span className="vm-dot" /> syncing portfolio{month ? ` · ${month}` : ""}</span>
          <span className="vm-date">establishing feed…</span>
        </div>
        <div className="vm-ecgstrip"><div className="vm-ecglabel">acquiring signal</div><div className="vm-bootsweep" /></div>
        <div className="vm-kgrid">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="vm-kcell">{skel("55%", 10, 14)}{skel("80%", 26, 14)}{skel("100%", 22, 16)}</div>
          ))}
        </div>
      </div>
      <div className="vm-strip" style={{ marginTop: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="vm-chip">
            <div className="vm-skel-l" style={{ width: 28, height: 28, borderRadius: 8, flex: "0 0 auto" }} />
            <div style={{ flex: 1 }}><div className="vm-skel-l" style={{ width: "70%", height: 10, borderRadius: 6 }} /><div className="vm-skel-l" style={{ width: "90%", height: 8, borderRadius: 6, marginTop: 8 }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ data, month, goToFacility }) {
  const { facilities, portfolioTrend, kpis, mixData, hasGrowth, qapi } = data;
  const { scoped } = useScope();
  const mean = (arr) => { const v = arr.filter((x) => x != null && !Number.isNaN(Number(x))).map(Number); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const sum = (arr) => arr.filter((x) => x != null).reduce((a, b) => a + Number(b), 0);

  // Days in the loaded month, for admissions-per-day (drives the monitor's beat rate).
  const [yy, mm] = (month || "2026-01").split("-").map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate() || 30;

  // Pooled RTA across the (scoped) facility set.
  const rtaRows = data.rta || [];
  const rtaAgg = rtaRows.reduce((a, r) => ({
    admits: a.admits + (r.admits || 0), rtas: a.rtas + (r.rtas || 0),
    ltc_admits: a.ltc_admits + (r.ltc_admits || 0), ltc_rtas: a.ltc_rtas + (r.ltc_rtas || 0), er: a.er + (r.er || 0),
  }), { admits: 0, rtas: 0, ltc_admits: 0, ltc_rtas: 0, er: 0 });
  const snfRate = rtaAgg.admits ? (rtaAgg.rtas / rtaAgg.admits) * 100 : null;
  const ltcRate = rtaAgg.ltc_admits ? (rtaAgg.ltc_rtas / rtaAgg.ltc_admits) * 100 : null;
  const totalAdmits = rtaAgg.admits + rtaAgg.ltc_admits;
  const admitsPerDay = totalAdmits ? totalAdmits / daysInMonth : null;
  const rtaTh = data.thresholds?.["rta.snf"];
  const snfTone = toneName(snfRate, rtaTh);

  // CMS aggregates from facility five-star rows.
  const cmsRows = facilities.map((f) => f.cms).filter(Boolean);
  const rated = cmsRows.filter((c) => c.overall_rating != null);
  const cmsOverall = mean(rated.map((c) => c.overall_rating));
  const cmsHi = mean(cmsRows.map((c) => c.health_inspection_rating));
  const cmsStaff = mean(cmsRows.map((c) => c.staffing_rating));
  const cmsQm = mean(cmsRows.map((c) => c.qm_rating));
  const nurseHprd = mean(cmsRows.map((c) => c.total_nurse_hprd));
  const rnHprd = mean(cmsRows.map((c) => c.rn_hprd));
  const rnTurn = mean(cmsRows.map((c) => c.rn_turnover));
  const fines = sum(cmsRows.map((c) => c.total_fine_dollars));

  // QAPI weekly rollup, filtered to the scoped facility set.
  const facIds = new Set(facilities.map((f) => f.facility_id));
  const facNames = new Set(facilities.map((f) => f.name));
  const qSubs = (qapi?.submissions || []).filter((s) => facIds.has(s.facility_id));
  const qFlags = (qapi?.flags || []).filter((fl) => !fl.facility_name || facNames.has(fl.facility_name));
  const qRequired = qSubs.length;
  const qSubmitted = qSubs.filter((s) => s.submitted).length;
  const qMdDenom = qSubmitted;
  const qMd = qSubs.filter((s) => s.submitted && s.md_attended).length;
  const qRed = qSubs.filter((s) => (s.status === "red") || ((s.flag_count || 0) > 0)).length;
  const openFlags = [...qFlags].sort((a, b) => (b.days_open || 0) - (a.days_open || 0));
  const overdueFlags = openFlags.filter((fl) => (fl.days_open || 0) >= 14);
  const hasQapi = !!qapi && qRequired > 0;
  const qStatusByFac = {};
  qSubs.forEach((s) => { qStatusByFac[s.facility_id] = (s.flag_count || 0) > 0 || s.status === "red" ? "red" : s.submitted ? "green" : "amber"; });

  // Beat rate tied to a real metric (admissions cadence).
  const bpm = admitsPerDay == null ? 66 : Math.max(54, Math.min(104, Math.round(40 + admitsPerDay * 0.85)));
  const beatPxMain = 210 / (bpm / 60);

  const captureFrac = kpis.captureRate == null ? 0 : kpis.captureRate / 100;
  const censusDelta = data.mom?.census?.delta;
  const censusPct = data.mom?.census && data.mom.census.prev ? (data.mom.census.delta / data.mom.census.prev) * 100 : null;

  // Hero channels.
  const snfChColor = snfTone === "alert" ? vmColor.alarm : snfTone === "watch" ? vmColor.watch : vmColor.ok;
  const qapiAlarm = hasQapi && overdueFlags.length > 0;
  const channelItems = [
    {
      key: "census", lead: true, ch: "#37B4BE", wave: "ecg", waveColor: "#37B4BE",
      label: "Avg daily census",
      value: <span className="vm-kval" style={{ fontSize: 44 }}><Decode value={kpis.totalCensus} /></span>,
      sub: censusDelta == null ? <span>{facilities.length} facilities</span> : <><span className={`vm-delta ${censusDelta >= 0 ? "up" : "down"}`}>{censusDelta >= 0 ? "▲" : "▼"} {censusPct == null ? n0(Math.abs(censusDelta)) : Math.abs(censusPct).toFixed(1) + "%"}</span> vs prior month</>,
    },
    {
      key: "capture", ch: "#7FD9C6", wave: "pleth", waveColor: "#7FD9C6",
      label: "Capture rate",
      value: <span className="vm-gaugewrap"><Ring size={46} r={18} width={5.5} frac={captureFrac} color="#37B4BE" track="rgba(255,255,255,.12)" /><span className="vm-kval" style={{ fontSize: 27 }}><Decode value={kpis.captureRate} suffix="%" /></span></span>,
      sub: hasGrowth ? <span>Spectrum share of buildings</span> : <span>Needs building data</span>,
    },
    {
      key: "rta", ch: snfChColor, wave: "ecgfast", waveColor: snfChColor, alarm: snfTone === "watch" || snfTone === "alert", alarmTag: snfTone === "alert" ? "▲ high" : "▲ watch",
      label: "SNF return-to-acute",
      value: <span className="vm-kval"><Decode value={snfRate} dec={1} suffix="%" /></span>,
      sub: <span>goal {thNum(rtaTh?.target) ?? "—"}% · nat'l {thNum(rtaTh?.benchmark_national) ?? "—"}%</span>,
    },
    {
      key: "qapi", ch: qapiAlarm ? "#F0A594" : "#7FD9C6", wave: "resp", waveColor: qapiAlarm ? "#F0A594" : "#7FD9C6", alarm: qapiAlarm, alarmTag: "◷ overdue",
      label: "QAPI open items",
      value: <span className="vm-kval"><Decode value={hasQapi ? openFlags.length : null} /></span>,
      sub: hasQapi ? <><span className="vm-delta up">{qRequired ? Math.round((qSubmitted / qRequired) * 100) : 0}% in</span> {overdueFlags.length ? `oldest ${overdueFlags[0].days_open}d` : "none overdue"}</> : <span>QAPI not loaded</span>,
    },
    {
      key: "cms", ch: "#F0CE8B", wave: "steady", waveColor: "#F0CE8B",
      label: "CMS overall",
      value: <span className="vm-gaugewrap"><span className="vm-kval" style={{ fontSize: 30 }}><Decode value={cmsOverall} dec={1} /></span><span className="vm-stars">{cmsOverall == null ? "" : "★".repeat(Math.round(cmsOverall)) + "☆".repeat(5 - Math.round(cmsOverall))}</span></span>,
      sub: <span>{rated.length} of {facilities.length} rated</span>,
    },
  ];
  const channels = { facilities: facilities.length, items: channelItems };

  // "What changed" highlights, derived from live data with graceful fallbacks.
  const highlights = [];
  let bestGain = null;
  facilities.forEach((f) => { const s = (f.mSeries || []).filter((v) => v != null).map(Number); if (s.length >= 2) { const g = s[s.length - 1] - s[s.length - 2]; if (bestGain == null || g > bestGain.g) bestGain = { name: f.name, g }; } });
  if (bestGain && bestGain.g > 0.5) highlights.push({ tint: T.tealSoft, fg: T.teal, glyph: "▲", title: `${bestGain.name} +${Math.round(bestGain.g)} census`, body: "Biggest month-over-month gain." });
  if (rtaTh?.benchmark_national != null) { let worst = null; facilities.forEach((f) => { const r = f.rta?.snfRate; if (r != null && r > Number(rtaTh.benchmark_national)) { if (worst == null || r > worst.r) worst = { name: f.name, r }; } }); if (worst) highlights.push({ tint: "#FBEEEB", fg: T.alert, glyph: "!", title: `${worst.name} RTA ${worst.r.toFixed(1)}%`, body: "Above national — needs review." }); }
  if (qapiAlarm) highlights.push({ tint: "#F6EEDD", fg: T.amber, glyph: "◷", title: `${overdueFlags.length} QAPI item${overdueFlags.length > 1 ? "s" : ""} overdue`, body: `Oldest ${overdueFlags[0].days_open}d${overdueFlags[0].facility_name ? " · " + overdueFlags[0].facility_name : ""}.` });
  { let top = null; facilities.forEach((f) => { const s = f.cms?.overall_rating; if (s != null && (top == null || s > top.s)) top = { name: f.name, s }; }); if (top) highlights.push({ tint: T.tealSoft, fg: T.teal, glyph: "★", title: `${top.name} ${top.s}★`, body: "Top CMS rating in the portfolio." }); }

  const topOpp = facilities.filter((f) => f.nonSpec != null && f.nonSpec > 5).sort((a, b) => b.nonSpec - a.nonSpec).slice(0, 6);

  return (
    <>
      <VitalsHero channels={channels} bpm={bpm} admitsPerDay={admitsPerDay} beatPxMain={beatPxMain} monthText={monthLabel(month)} />

      {!scoped && <div style={{ marginTop: 16 }}><FreshnessStrip coverage={data.coverage} /></div>}

      {highlights.length > 0 && (
        <div className="vm-strip">
          {highlights.slice(0, 4).map((h, i) => (
            <div key={i} className="vm-chip">
              <div className="vm-chip-ic" style={{ background: h.tint, color: h.fg }}>{h.glyph}</div>
              <div><h4>{h.title}</h4><p>{h.body}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ margin: "22px 0 8px" }}>
        <div>
          <SectionLabel right={`${portfolioTrend.length} days`}>Portfolio daily census</SectionLabel>
          <div className="ed-card p-4" style={{ height: 240 }}>
            {portfolioTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioTrend} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
                  <defs><linearGradient id="vmArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.teal} stopOpacity={0.22} /><stop offset="100%" stopColor={T.teal} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={T.hairline} vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} interval={Math.max(0, Math.floor(portfolioTrend.length / 8))} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="census" name="Spectrum census" stroke={T.teal} strokeWidth={2.5} fill="url(#vmArea)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ color: T.inkSoft, fontSize: 13, padding: 20 }}>No daily census for this month.</div>}
          </div>
        </div>
        <div>
          <SectionLabel right="Avg daily patients">Portfolio SNF vs LTC</SectionLabel>
          <div className="ed-card p-4" style={{ height: 240 }}>
            <Donut snf={mixData?.[0]?.count} ltc={mixData?.[1]?.count} />
          </div>
        </div>
      </div>

      <SectionLabel right="Portfolio pooled · vs CMS benchmark">Return-to-acute &amp; QAPI</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginBottom: 8 }}>
        <div className="ed-card p-5">
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600 }}>Return-to-acute</span>
            <span className="ed-num" style={{ fontSize: 11.5, color: T.inkSoft }}>{n0(totalAdmits)} admits</span>
          </div>
          {rtaRows.length ? (
            <>
              <div style={{ display: "flex", gap: 18 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <Ring size={96} r={38} width={9} frac={snfRate == null ? 0 : Math.min(1, snfRate / 25)} color={rtaLineColor(snfRate)} track={T.mist}>
                    <text x="48" y="45" textAnchor="middle" fontSize="18" fontWeight="600" fill={T.ink} fontFamily="IBM Plex Mono">{snfRate == null ? "—" : snfRate.toFixed(1) + "%"}</text>
                    <text x="48" y="61" textAnchor="middle" fontSize="10" fill={T.inkSoft}>SNF rate</text>
                  </Ring>
                  <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 3 }}>{n0(rtaAgg.admits)} admits · {n0(rtaAgg.rtas)} RTA</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <Ring size={96} r={38} width={9} frac={ltcRate == null ? 0 : Math.min(1, ltcRate / 25)} color={T.teal} track={T.mist} delay={180}>
                    <text x="48" y="45" textAnchor="middle" fontSize="18" fontWeight="600" fill={T.ink} fontFamily="IBM Plex Mono">{ltcRate == null ? "—" : ltcRate.toFixed(1) + "%"}</text>
                    <text x="48" y="61" textAnchor="middle" fontSize="10" fill={T.inkSoft}>LTC rate</text>
                  </Ring>
                  <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 3 }}>{n0(rtaAgg.ltc_admits)} admits · {n0(rtaAgg.ltc_rtas)} RTA</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 10.5, color: T.inkSoft, display: "flex", justifyContent: "space-between" }}>
                <span>Spectrum goal {thNum(rtaTh?.target) ?? "—"}%</span>
                <span>National {thNum(rtaTh?.benchmark_national) ?? "—"}%{rtaTh?.benchmark_state_code ? ` · ${rtaTh.benchmark_state_code} ${thNum(rtaTh?.benchmark_state) ?? "—"}%` : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{n0(totalAdmits)}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>Total admissions</div></div>
                <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{n0(rtaAgg.er)}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>ER visits</div></div>
              </div>
            </>
          ) : <Empty>No return-to-acute data for {monthLabel(month)} yet.</Empty>}
        </div>

        <div className="ed-card p-5">
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600 }}>Weekly QAPI review</span>
            {hasQapi && qapi.week && <span className="ed-num" style={{ fontSize: 11.5, color: T.inkSoft }}>week of {fmtDate(qapi.week)}</span>}
          </div>
          {hasQapi ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Ring size={88} r={34} width={9} frac={qRequired ? qSubmitted / qRequired : 0} color={T.teal} track={T.mist}>
                  <text x="44" y="41" textAnchor="middle" fontSize="17" fontWeight="600" fill={T.ink} fontFamily="IBM Plex Mono">{qSubmitted}/{qRequired}</text>
                  <text x="44" y="57" textAnchor="middle" fontSize="10" fill={T.inkSoft}>submitted</text>
                </Ring>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
                  <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{qMdDenom ? `${qMd}/${qMdDenom}` : "—"}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>MD present</div></div>
                  <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600, color: qRed ? T.alert : T.ink }}>{qRed}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>Facilities in red</div></div>
                </div>
              </div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {openFlags.slice(0, 3).map((fl, i) => (
                  <div key={fl.id ?? i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", background: T.mist, borderLeft: `3px solid ${(fl.days_open || 0) >= 14 ? T.alert : T.amber}`, borderRadius: "0 8px 8px 0", padding: "9px 12px" }}>
                    <div><div style={{ fontSize: 12, fontWeight: 600 }}>{fl.facility_name || "—"}</div><div style={{ fontSize: 10.5, color: T.inkSoft }}>{fl.question || fl.section || "Open item"}</div></div>
                    <div style={{ fontSize: 11, color: T.inkSoft, whiteSpace: "nowrap" }}>open {fl.days_open ?? "—"}d</div>
                  </div>
                ))}
                {openFlags.length === 0 && <div style={{ fontSize: 12, color: T.inkSoft }}>No open items this week.</div>}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                {qSubs.map((s, i) => (
                  <div key={s.facility_id ?? i} title={s.facility_name} style={{ width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700, background: s.submitted ? T.teal : T.alert }}>{s.submitted ? "✓" : "✕"}</div>
                ))}
                <span style={{ fontSize: 10.5, color: T.inkSoft, marginLeft: 6 }}>this week by facility</span>
              </div>
            </>
          ) : <Empty>QAPI weekly data isn't loaded for this view. The RTA panel and everything else above are live.</Empty>}
        </div>
      </div>

      <SectionLabel right="Portfolio average by domain">CMS five-star</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginBottom: 8 }}>
        <div className="ed-card p-5">
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, marginBottom: 14 }}>Star rating by domain</div>
          {rated.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Overall", cmsOverall], ["Health inspection", cmsHi], ["Staffing", cmsStaff], ["Quality measures", cmsQm]].map(([label, v]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "150px 1fr 40px", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: T.ink, fontWeight: 500 }}>{label}</span>
                  <GrowBar pct={v == null ? 0 : (v / 5) * 100} color={v == null ? T.hairline : v >= 4 ? T.teal : v >= 3 ? T.amber : T.alert} />
                  <span className="ed-num" style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{v == null ? "—" : v.toFixed(1)}</span>
                </div>
              ))}
            </div>
          ) : <Empty>No CMS five-star data loaded for these facilities.</Empty>}
        </div>
        <div className="ed-card p-5">
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, marginBottom: 14 }}>Staffing &amp; compliance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{nurseHprd == null ? "—" : nurseHprd.toFixed(2)}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>Total nurse HPRD</div></div>
            <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{rnHprd == null ? "—" : rnHprd.toFixed(2)}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>RN HPRD</div></div>
            <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{rnTurn == null ? "—" : (rnTurn <= 1 ? Math.round(rnTurn * 100) : Math.round(rnTurn)) + "%"}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>RN turnover</div></div>
            <div className="vm-tile"><div className="ed-num" style={{ fontSize: 20, fontWeight: 600 }}>{fines ? (fines >= 1000 ? "$" + (fines / 1000).toFixed(1) + "k" : "$" + n0(fines)) : "$0"}</div><div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>Fines (12 mo)</div></div>
          </div>
        </div>
      </div>

      <SectionLabel right="Click any facility to expand · sorted by census">Facilities at a glance</SectionLabel>
      <div className="vm-fgrid">
        {facilities.slice(0, 8).map((f) => (
          <FacilityCard key={f.facility_id ?? f.name} f={f} qapiStatus={qStatusByFac[f.facility_id]} onOpen={goToFacility} />
        ))}
      </div>

      {hasGrowth && topOpp.length > 0 && (
        <>
          <div style={{ marginTop: 28 }}>
            <SectionLabel right="Ranked by non-Spectrum patients">Largest growth opportunities</SectionLabel>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topOpp.map((f) => (
              <button key={f.name} onClick={() => goToFacility(f.name)} className="ed-card p-5 text-left" style={{ cursor: "pointer", borderLeft: `4px solid ${toneFrom(f.opp, data.thresholds?.["growth.opportunity_pct"])}` }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</span>
                  <span className="ed-num" style={{ fontSize: 12, color: toneFrom(f.opp, data.thresholds?.["growth.opportunity_pct"]), fontWeight: 600 }}>{f.opp}%</span>
                </div>
                <div className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>{Math.round(f.nonSpec)} of {Math.round(f.building)} not on service</div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ————————————————————— Tab: Facilities ————————————————————— */
function FacilitiesTab({ data, selectedName, setSelectedName, month }) {
  const [filter, setFilter] = useState("All");
  const facilities = data.facilities;
  const visible = filter === "All" ? facilities : facilities.filter((f) => f.nonSpec != null && f.nonSpec > 0);
  const sel = facilities.find((f) => f.name === selectedName) || facilities[0];
  if (!sel) return <Empty>No facility data for {monthLabel(month)}.</Empty>;
  const selTrend = (sel.trendDates || []).map((d, i) => ({ d: shortDay(d), census: sel.trend[i] }));
  const mix = [{ type: "SNF", count: sel.snf ?? 0 }, { type: "LTC", count: sel.ltc ?? 0 }];
  const th = {
    nonSpec: data.thresholds?.["growth.non_spectrum"],
    capture: data.thresholds?.["growth.capture"],
    opp:     data.thresholds?.["growth.opportunity_pct"],
    nurseTo: data.thresholds?.["cms.nursing_turnover"],
    rnTo:    data.thresholds?.["cms.rn_turnover"],
  };

  return (
    <>
      <div className="vm-secbar"><span className="vm-tick2" /><h2>Facilities · roster &amp; detail</h2><span className="vm-secright">{facilities.length} facilities · {monthLabel(month)}</span></div>
      <div className="flex items-center gap-2" style={{ marginBottom: 20 }}>
        {["All", "With opportunity"].map((mk) => (
          <button key={mk} onClick={() => setFilter(mk)} className="ed-ui" style={{
            fontSize: 12, padding: "7px 16px", cursor: "pointer", borderRadius: 99,
            border: `1px solid ${filter === mk ? T.teal : T.hairline}`,
            background: filter === mk ? T.teal : "transparent",
            color: filter === mk ? "#FFF" : T.inkSoft, fontWeight: 600,
          }}>{mk}</button>
        ))}
      </div>

      <SectionLabel right={`${visible.length} facilities · click a row for detail`}>Facility roster</SectionLabel>
      <div className="ed-card" style={{ overflowX: "auto", marginBottom: 36 }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              {["Facility", "Spectrum census", "Building census", "Non-Spectrum", "Capture", "SNF", "LTC", "6-mo trend"].map((h) => (
                <th key={h} className="text-left py-3" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, paddingRight: 16, paddingLeft: h === "Facility" ? 20 : 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => {
              const cap = f.building ? Math.round((f.census / f.building) * 100) : null;
              return (
                <tr key={f.name} className="ed-row" onClick={() => setSelectedName(f.name)} style={{ borderBottom: `1px solid ${T.hairline}`, background: f.name === sel.name ? T.tealSoft : "transparent" }}>
                  <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{f.name}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{n1(f.census)}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{n1(f.building)}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: f.nonSpec == null ? T.ink : toneFrom(f.nonSpec, th.nonSpec) }}>{f.nonSpec ? Math.round(f.nonSpec) : "—"}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: cap == null ? T.inkSoft : toneFrom(cap, th.capture), fontWeight: 600 }}>{cap == null ? "—" : cap + "%"}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n1(f.snf)}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n1(f.ltc)}</td>
                  <td className="py-3 pr-4"><Sparkline values={f.mSeries} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
        <h2 className="ed-display" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{sel.name}</h2>
        <PulseLine color={sel.opp == null ? T.teal : toneFrom(sel.opp, th.opp)} />
        <span className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>avg census {n1(sel.census)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginBottom: 32 }}>
        <div>
          <SectionLabel right={monthLabel(month)}>Daily Spectrum census</SectionLabel>
          <div className="ed-card p-4" style={{ height: 230 }}>
            {selTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selTrend} margin={{ top: 10, right: 10, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={T.hairline} vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} interval={Math.max(0, Math.floor(selTrend.length / 8))} />
                  <YAxis tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="census" name="Census" stroke={T.teal} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ color: T.inkSoft, fontSize: 13, padding: 20 }}>No daily data.</div>}
          </div>
        </div>
        <div>
          <SectionLabel right="Avg daily patients">Census &amp; capture</SectionLabel>
          <div className="ed-card p-5">
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 18 }}>
              {mix.map((m) => (
                <div key={m.type}>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 6 }}>{m.type} census</div>
                  <div className="ed-display" style={{ fontSize: 26, fontWeight: 800 }}>{n1(m.count)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 6 }}>Building capture</div>
            <div style={{ height: 8, background: T.hairline, borderRadius: 4, marginBottom: 6 }}>
              <div style={{ height: 8, width: `${sel.building ? (sel.census / sel.building) * 100 : 100}%`, background: sel.opp == null ? T.teal : toneFrom(sel.opp, th.opp), borderRadius: 4 }} />
            </div>
            <div className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>
              {sel.building ? `${n1(sel.census)} of ${n1(sel.building)} building patients on service` : "No building census this month"}
            </div>
          </div>
        </div>
      </div>

      {/* Return to acute + CMS scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <SectionLabel right={monthLabel(month)}>Return to acute</SectionLabel>
          <div className="ed-card p-5">
            {sel.rta ? (
              <>
                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
                  <Stat label="SNF RTA rate" value={sel.rta.snfRate == null ? "—" : sel.rta.snfRate.toFixed(1) + "%"} tone={toneFrom(sel.rta.snfRate, data.thresholds?.["rta.snf"])} />
                  <Stat label="LTC RTA rate" value={sel.rta.ltcRate == null ? "—" : sel.rta.ltcRate.toFixed(1) + "%"} tone={toneFrom(sel.rta.ltcRate, data.thresholds?.["rta.ltc_pct"])} />
                  <Stat label="SNF admits / RTA" value={`${sel.rta.admits ?? "—"} / ${sel.rta.rtas ?? "—"}`} />
                  <Stat label="LTC admits / RTA" value={`${sel.rta.ltc_admits ?? "—"} / ${sel.rta.ltc_rtas ?? "—"}`} />
                  <Stat label="ER visits" value={sel.rta.er ?? "—"} />
                </div>
                {data.thresholds?.["rta.snf"] && (
                  <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 4, lineHeight: 1.5 }}>
                    Spectrum goal {thNum(data.thresholds["rta.snf"].target)}% · national {thNum(data.thresholds["rta.snf"].benchmark_national)}%
                    {data.thresholds["rta.snf"].benchmark_state != null && ` · ${data.thresholds["rta.snf"].benchmark_state_code || "State"} ${thNum(data.thresholds["rta.snf"].benchmark_state)}%`}
                    {data.thresholds["rta.snf"].benchmark_period && ` (CMS ${data.thresholds["rta.snf"].benchmark_period})`}
                  </p>
                )}
              </>
            ) : <div style={{ color: T.inkSoft, fontSize: 13 }}>No return-to-acute data for {monthLabel(month)}.</div>}
          </div>
        </div>
        <div>
          <SectionLabel right={sel.cms ? `CMS refreshed ${fmtDate(sel.cms.refreshed_at)}` : "CMS"}>Quality &amp; CMS ratings</SectionLabel>
          <div className="ed-card p-5">
            {sel.cms ? (
              <>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Overall</span>
                  <Stars n={sel.cms.overall_rating} size={20} />
                </div>
                <RatingRow label="Health inspection" n={sel.cms.health_inspection_rating} />
                <RatingRow label="Staffing" n={sel.cms.staffing_rating} />
                <RatingRow label="Quality measures" n={sel.cms.qm_rating} />
                <RatingRow label="Long-stay QM" n={sel.cms.longstay_qm_rating} />
                <RatingRow label="Short-stay QM" n={sel.cms.shortstay_qm_rating} />
                <div className="grid grid-cols-2 gap-4" style={{ marginTop: 16 }}>
                  <Stat label="Nurse hrs / resident / day" value={sel.cms.total_nurse_hprd != null ? Number(sel.cms.total_nurse_hprd).toFixed(2) : "—"} />
                  <Stat label="RN hrs / resident / day" value={sel.cms.rn_hprd != null ? Number(sel.cms.rn_hprd).toFixed(2) : "—"} />
                  <Stat label="Nursing turnover" value={sel.cms.nursing_turnover != null ? sel.cms.nursing_turnover + "%" : "—"} tone={toneFrom(sel.cms.nursing_turnover, th.nurseTo)} />
                  <Stat label="RN turnover" value={sel.cms.rn_turnover != null ? sel.cms.rn_turnover + "%" : "—"} tone={toneFrom(sel.cms.rn_turnover, th.rnTo)} />
                  <Stat label="Certified beds" value={sel.cms.certified_beds ?? "—"} />
                  <Stat label="Fines" value={sel.cms.num_fines ? `${sel.cms.num_fines} · $${Number(sel.cms.total_fine_dollars).toLocaleString()}` : "None"} tone={sel.cms.num_fines ? T.amber : T.ink} />
                </div>
                <p style={{ fontSize: 11, color: T.inkSoft, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
                  From CMS Care Compare (CCN {sel.ccn}). Ratings reflect CMS's latest survey cycle, not the current month — treat separately from live census.
                </p>
              </>
            ) : (
              <div style={{ color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
                {sel.ccn ? "CMS data not loaded yet for this facility." : "No CCN on file — this facility isn't in CMS's nursing-home ratings (likely a rehab hospital or LTAC)."}
              </div>
            )}
         </div>
        </div>
      </div>

      <QapiFacilityPanel facilityId={sel.facility_id} />
    </>
  );
}


/* ————————————————————— Tab: RTA ————————————————————— */
function RtaTab({ data, month, goToFacility }) {
  const rows = data.rta;
  if (!rows.length) return <Empty>No return-to-acute data for {monthLabel(month)} yet.</Empty>;
  const tot = rows.reduce((a, r) => ({
    admits: a.admits + (r.admits || 0), rtas: a.rtas + (r.rtas || 0),
    ltc_admits: a.ltc_admits + (r.ltc_admits || 0), ltc_rtas: a.ltc_rtas + (r.ltc_rtas || 0),
    er: a.er + (r.er || 0),
  }), { admits: 0, rtas: 0, ltc_admits: 0, ltc_rtas: 0, er: 0 });
  const snfRateNum = tot.admits ? (tot.rtas / tot.admits) * 100 : null;
  const ltcRateNum = tot.ltc_admits ? (tot.ltc_rtas / tot.ltc_admits) * 100 : null;
  const snfTh = data.thresholds?.["rta.snf"];
  const ltcTh = data.thresholds?.["rta.ltc_pct"];
  const rateColor = (r, th) => (r == null ? T.inkSoft : toneFrom(r, th));

  return (
    <>
      <div className="vm-secbar"><span className="vm-tick2" /><h2>Return-to-acute</h2><span className="vm-secright">{rows.length} facilities · {monthLabel(month)}</span></div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
        <Kpi tone={toneName(snfRateNum, snfTh)} label="SNF RTA rate" value={snfRateNum == null ? "—" : snfRateNum.toFixed(1) + "%"} sub={`${tot.rtas} of ${tot.admits} SNF admits · goal ${thNum(snfTh?.target) ?? "—"}%`} />
        <Kpi tone={toneName(ltcRateNum, ltcTh)} label="LTC RTA rate" value={ltcRateNum == null ? "—" : ltcRateNum.toFixed(1) + "%"} sub={`${tot.ltc_rtas} of ${tot.ltc_admits} LTC admits`} />
        <Kpi tone="muted" label="Total admissions" value={n0(tot.admits + tot.ltc_admits)} sub="SNF + LTC" />
        <Kpi tone="muted" label="ER visits" value={n0(tot.er)} sub="Across portfolio" />
      </section>

      <SectionLabel right="Click a facility to drill in">Return-to-acute by facility</SectionLabel>
      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              {["Facility", "SNF admits", "SNF RTA", "SNF rate", "LTC admits", "LTC RTA", "LTC rate", "ER"].map((h) => (
                <th key={h} className="text-left py-3" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, paddingRight: 16, paddingLeft: h === "Facility" ? 20 : 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="vm-trow" onClick={() => goToFacility && goToFacility(r.name)} title="Open facility" style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{r.name}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{r.admits ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{r.rtas ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: rateColor(r.snfRate, snfTh) }}><span aria-hidden style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: rateColor(r.snfRate, snfTh), marginRight: 7, verticalAlign: "middle" }} />{r.snfRate == null ? "—" : r.snfRate.toFixed(1) + "%"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{r.ltc_admits ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{r.ltc_rtas ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: rateColor(r.ltcRate, ltcTh) }}>{ltcTh?.amber != null && r.ltcRate != null && <span aria-hidden style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: rateColor(r.ltcRate, ltcTh), marginRight: 7, verticalAlign: "middle" }} />}{r.ltcRate == null ? "—" : r.ltcRate.toFixed(1) + "%"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{r.er ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12 }}>
        RTA rate = returns to acute ÷ admissions. Spectrum goal {thNum(snfTh?.target) ?? "—"}%, amber above that, red above the national average of {thNum(snfTh?.benchmark_national) ?? "—"}% (CMS {snfTh?.benchmark_period || "—"}; Oklahoma {thNum(snfTh?.benchmark_state) ?? "—"}%). LTC has no percentage benchmark yet, so it stays uncoloured. Thresholds live in the metric_thresholds table — change them with SQL, no deploy.
      </p>
    </>
  );
}

/* ————————————————————— Tab: Team ————————————————————— */
function TeamTab({ data, month }) {
  const liaisons = data.liaisons;
  if (!liaisons.length) return <Empty>No liaison data for {monthLabel(month)} yet.</Empty>;
  const hrs = liaisons.reduce((s, l) => s + (l.hours || 0), 0);
  const ot = liaisons.reduce((s, l) => s + (l.ot || 0), 0);
  const notes = liaisons.reduce((s, l) => s + (l.notes || 0), 0);
  const otTh = data.thresholds?.["liaison.ot_hours"];
  const otTotalTh = data.thresholds?.["liaison.ot_total"];
  const otHot = otTotalTh?.amber != null && ot >= Number(otTotalTh.amber);
  return (
    <>
      <div className="vm-secbar"><span className="vm-tick2" /><h2>Team · liaison performance</h2><span className="vm-secright">{monthLabel(month)}</span></div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
        <Kpi tone="muted" label="Liaison hours" value={n0(hrs)} sub={`${liaisons.length} liaisons`} />
        <Kpi tone={otHot ? "watch" : "ok"} label="Overtime hours" value={n1(ot)} sub="Month to date" />
        <Kpi tone="muted" label="Notes completed" value={notes} sub="Across the team" />
        <Kpi tone="ok" label="Notes per hour" value={hrs ? (notes / hrs).toFixed(2) : "—"} sub="Team average" />
      </section>
      <SectionLabel right={`Monthly totals · ${monthLabel(month)}`}>Liaison performance</SectionLabel>
      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              {["Liaison", "Hours", "OT", "Notes", "Notes/hr"].map((h) => (
                <th key={h} className="text-left py-3" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, paddingRight: 16, paddingLeft: h === "Liaison" ? 20 : 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {liaisons.map((l) => (
              <tr key={l.name} className="vm-trow" style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{l.name}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{n1(l.hours)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: l.ot ? toneFrom(l.ot, otTh) : T.ink }}>{l.ot ? n1(l.ot) : "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{l.notes || "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{l.hours ? (l.notes / l.hours).toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


/* ————————————————————— Data loading ————————————————————— */
function lastDayOfMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}
function monthsAgoStart(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

async function loadMonthData(monthIso) {
  const ym = ymKey(monthIso);          // normalize 2026-06-01 -> 2026-06
  const start = `${ym}-01`;
  const end = lastDayOfMonth(ym);
  const trailStart = monthsAgoStart(ym, 5);   // 6-month window ending at `start`
  const [facs, fm, fg, rta, dc, lm, cms, th, tr] = await Promise.all([
    supabase.from("facilities").select("id, name, code, ccn, org_id, active"),
    supabase.from("facility_monthly").select("facility_id, avg_spectrum_census, avg_snf, avg_ltc").eq("month", start),
    supabase.from("facility_growth").select("facility_id, avg_building_census, avg_non_spectrum").eq("month", start),
    supabase.from("rta_monthly").select("facility_id, admits, rtas, ltc_admits, ltc_rtas, er_visits").eq("month", start),
    supabase.from("daily_census").select("facility_id, census_date, spectrum_census").gte("census_date", start).lte("census_date", end),
    supabase.from("liaison_monthly").select("hours, ot_hours, notes_count, liaisons(name)").eq("month", start),
    supabase.from("facility_cms").select("*"),
    supabase.from("metric_thresholds").select("metric_key, label, unit, direction, target, amber, red, benchmark_national, benchmark_state, benchmark_state_code, benchmark_period, benchmark_source, provisional").eq("active", true),
    supabase.from("facility_monthly").select("facility_id, month, avg_spectrum_census").gte("month", trailStart).lte("month", start),
  ]);
  const err = facs.error || fm.error || fg.error || rta.error || dc.error || lm.error || cms.error || th.error || tr.error;
  if (err) throw err;
  // QAPI weekly rollup (Spectrum-internal). Fetched separately and tolerantly so a
  // missing/empty QAPI table never breaks the Overview load. Filtered to the scoped
  // facility set inside OverviewTab, so client-scoped views stay accurate.
  let qapi = null;
  try {
    const [qsR, qfR] = await Promise.allSettled([
      supabase.from("qapi_submission_status").select("facility_id, facility_name, week_of, submitted, md_attended, flag_count, status"),
      supabase.from("qapi_open_flags").select("id, facility_name, week_of, section, question, days_open"),
    ]);
    const subs = qsR.status === "fulfilled" ? (qsR.value.data || []) : [];
    const flags = qfR.status === "fulfilled" ? (qfR.value.data || []) : [];
    const week = subs.reduce((mx, r) => (r.week_of && (!mx || r.week_of > mx) ? r.week_of : mx), null);
    qapi = week ? { week, submissions: subs.filter((r) => r.week_of === week), flags } : null;
  } catch { qapi = null; }
  const cmsById = {}; (cms.data || []).forEach((c) => { cmsById[c.facility_id] = c; });
  const rtaById = {}; (rta.data || []).forEach((r) => { rtaById[r.facility_id] = r; });
  const facById = {};
  (facs.data || []).forEach((f) => { facById[f.id] = f; });
  const byId = {};
  (fm.data || []).forEach((r) => {
    byId[r.facility_id] = { facility_id: r.facility_id, name: facById[r.facility_id]?.name || `#${r.facility_id}`,
      census: r.avg_spectrum_census, snf: r.avg_snf, ltc: r.avg_ltc, building: null, nonSpec: null };
  });
  (fg.data || []).forEach((r) => {
    const o = byId[r.facility_id] || (byId[r.facility_id] = { facility_id: r.facility_id, name: facById[r.facility_id]?.name || `#${r.facility_id}`, census: null, snf: null, ltc: null });
    o.building = r.avg_building_census; o.nonSpec = r.avg_non_spectrum;
  });
  // daily per facility + portfolio trend
  const dailyByFac = {}, byDate = {};
  (dc.data || []).forEach((r) => {
    (dailyByFac[r.facility_id] = dailyByFac[r.facility_id] || []).push([r.census_date, r.spectrum_census]);
    byDate[r.census_date] = (byDate[r.census_date] || 0) + (r.spectrum_census || 0);
  });
  Object.values(byId).forEach((o) => {
    const arr = (dailyByFac[o.facility_id] || []).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    o.trendDates = arr.map((x) => x[0]); o.trend = arr.map((x) => x[1]);
  });
  const portfolioTrend = Object.keys(byDate).sort().map((d) => ({ d: shortDay(d), census: Math.round(byDate[d]) }));
  Object.values(byId).forEach((o) => {
    if (o.nonSpec == null && o.building != null && o.census != null) o.nonSpec = Math.max(o.building - o.census, 0);
    o.opp = o.building && o.building > 0 && o.nonSpec != null ? Math.round((o.nonSpec / o.building) * 100) : null;
    o.ccn = facById[o.facility_id]?.ccn || null;
    o.org_id = facById[o.facility_id]?.org_id ?? null;
    o.cms = cmsById[o.facility_id] || null;
    const rr = rtaById[o.facility_id];
    o.rta = rr ? {
      admits: rr.admits, rtas: rr.rtas, ltc_admits: rr.ltc_admits, ltc_rtas: rr.ltc_rtas, er: rr.er_visits,
      snfRate: rr.admits ? (rr.rtas / rr.admits) * 100 : null,
      ltcRate: rr.ltc_admits ? (rr.ltc_rtas / rr.ltc_admits) * 100 : null,
    } : null;
  });
  // trailing monthly census series (sparklines) + portfolio MoM
  const trailByFac = {}, monthTotals = {};
  (tr.data || []).forEach((r) => {
    (trailByFac[r.facility_id] = trailByFac[r.facility_id] || []).push([r.month, r.avg_spectrum_census]);
    monthTotals[r.month] = (monthTotals[r.month] || 0) + (r.avg_spectrum_census || 0);
  });
  Object.values(byId).forEach((o) => {
    const arr = (trailByFac[o.facility_id] || []).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    o.mSeries = arr.map((x) => (x[1] == null ? null : Number(x[1])));
    o.mSeriesMonths = arr.map((x) => x[0]);
  });
  const facilities = Object.values(byId).sort((a, b) => (b.census || 0) - (a.census || 0));
  const hasGrowth = (fg.data || []).length > 0;
  const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);
  const totalCensus = sum(facilities, "census");
  const totalBuilding = hasGrowth ? sum(facilities, "building") : null;
  const totalOpportunity = hasGrowth ? sum(facilities, "nonSpec") : null;
  const captureRate = totalBuilding ? Math.round((totalCensus / totalBuilding) * 1000) / 10 : null;
  const totalSnf = sum(facilities, "snf"), totalLtc = sum(facilities, "ltc");
  const trailMonths = Object.keys(monthTotals).sort();
  const curIdx = trailMonths.indexOf(start);
  const prevKey = curIdx > 0 ? trailMonths[curIdx - 1] : null;
  const mom = { census: prevKey != null ? { prev: monthTotals[prevKey], delta: totalCensus - monthTotals[prevKey] } : null };
  // data-coverage for the freshness strip (numerators = distinct facilities present per source)
  const activeFacs = (facs.data || []).filter((f) => f.active !== false);
  const distinctIds = (rows) => new Set((rows || []).map((r) => r.facility_id)).size;
  const coverage = {
    month: start,
    facilities: activeFacs.length,
    census: distinctIds(fm.data),
    growth: distinctIds(fg.data),
    rta: distinctIds(rta.data),
    daily: distinctIds(dc.data),
    cms: {
      loaded: (cms.data || []).length,
      denom: activeFacs.filter((f) => f.ccn).length,
      latest: (cms.data || []).reduce((mx, c) => (c.refreshed_at && (!mx || c.refreshed_at > mx) ? c.refreshed_at : mx), null),
    },
  };
  const liaisons = (lm.data || []).map((l) => ({
    name: l.liaisons?.name || "—", hours: l.hours, ot: l.ot_hours, notes: l.notes_count,
  })).sort((a, b) => (b.hours || 0) - (a.hours || 0));
  const hasLiaison = liaisons.length > 0;
  const liaisonNotes = liaisons.reduce((s, l) => s + (l.notes || 0), 0);
  const liaisonHrs = liaisons.reduce((s, l) => s + (l.hours || 0), 0);
  const rtaRows = (rta.data || []).map((r) => ({
    name: facById[r.facility_id]?.name || `#${r.facility_id}`,
    admits: r.admits, rtas: r.rtas, ltc_admits: r.ltc_admits, ltc_rtas: r.ltc_rtas, er: r.er_visits,
    snfRate: r.admits ? (r.rtas / r.admits) * 100 : null,
    ltcRate: r.ltc_admits ? (r.ltc_rtas / r.ltc_admits) * 100 : null,
  })).sort((a, b) => (b.snfRate ?? -1) - (a.snfRate ?? -1));
  return {
    facilities, portfolioTrend, rta: rtaRows, liaisons, hasGrowth, hasLiaison, mom, coverage, qapi,
    thresholds: Object.fromEntries((th.data || []).map((t) => [t.metric_key, t])),
    mixData: [{ type: "SNF", count: Math.round(totalSnf) }, { type: "LTC", count: Math.round(totalLtc) }],
    kpis: { totalCensus, totalBuilding, totalOpportunity, captureRate, liaisonNotes, liaisonHrs },
  };
}

/* ————————————————————— App shell ————————————————————— */
export default function Executive() {
  return <ScopeProvider><ExecutiveInner /></ScopeProvider>;
}

function ExecutiveInner() {
  const [tab, setTab] = useState("Overview");
  const [selectedName, setSelectedName] = useState(null);
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState(null);
  const [rawData, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const { profile, isAdmin } = useAuth();
  const isStaff = ["admin", "manager"].includes(profile?.role);
  const { orgId, scoped } = useScope();
  const data = useMemo(() => applyScope(rawData, orgId), [rawData, orgId]);
  const tabs = scoped
     ? ["Overview", "Heatmap", "Facilities", "RTA", "Analysis", "QAPI"]
     : ["Overview", "Heatmap", "Facilities", "RTA", "Analysis", "QAPI", "Team"];
  useEffect(() => { if (!tabs.includes(tab)) setTab("Overview"); }, [scoped]);

  useEffect(() => {
    (async () => {
      const { data: mrows, error } = await supabase.from("facility_monthly").select("month").order("month", { ascending: false });
      if (error) { setErr(error.message); setLoading(false); return; }
      const uniq = [...new Set((mrows || []).map((r) => r.month))];
      setMonths(uniq);
      setMonth(uniq[0] || null);
      if (!uniq.length) setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!month) return;
    setLoading(true); setErr(null);
    loadMonthData(month)
      .then((d) => { setData(d); if (!selectedName && d.facilities[0]) setSelectedName(d.facilities[0].name); })
      .catch((e) => setErr(e.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, [month]);

  const goToFacility = (name) => { setSelectedName(name); setTab("Facilities"); };

  return (
    <div className="ed-ui min-h-screen" style={{ background: T.mist, color: T.ink }}>
      <style>{fontStyles}</style>
      <style>{vitalsCSS}</style>

      <header style={{ background: T.panel, borderBottom: `1px solid ${T.hairline}` }}>
        <div className="mx-auto px-6 py-5 flex flex-wrap items-end justify-between gap-4" style={{ maxWidth: 1280 }}>
          <div className="flex items-center gap-4">
            <img src={SPECTRUM_LOGO} alt="Spectrum Healthcare Solutions" style={{ height: 42, width: "auto", display: "block" }} />
            <div style={{ borderLeft: `1px solid ${T.hairline}`, paddingLeft: 16 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                <PulseLine width={38} />
                <span style={{ fontSize: 11, color: T.inkSoft }}>{month ? monthLabel(month) : "—"}</span>
              </div>
              <h1 className="ed-display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
                Executive Dashboard
              </h1>
            </div>
          </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Dashboard sections" style={{ justifyContent: "flex-end" }}>
            <ScopeSelector />
            {months.length > 0 && (
              <select value={month || ""} onChange={(e) => setMonth(e.target.value)} className="ed-ui" style={{
                fontSize: 13, padding: "9px 14px", borderRadius: 99, border: `1px solid ${T.hairline}`,
                background: "transparent", color: T.ink, fontWeight: 600, cursor: "pointer", marginRight: 4,
              }}>
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            )}
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className="ed-ui" style={{
                fontSize: 13, padding: "9px 18px", cursor: "pointer", borderRadius: 99,
                border: `1px solid ${tab === t ? T.teal : T.hairline}`,
                background: tab === t ? T.teal : "transparent",
                color: tab === t ? "#FFF" : T.inkSoft, fontWeight: 600,
              }}>{t}</button>
            ))}
            <div style={{ width: 1, height: 22, background: T.hairline, margin: "0 4px" }} />
            {profile?.email && (
              <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={profile.email}>{profile.email}</span>
            )}
            <button onClick={async () => { await signOut(); window.location.href = "/login"; }} className="ed-ui" style={{
              fontSize: 13, padding: "9px 18px", cursor: "pointer", borderRadius: 99,
              border: `1px solid ${T.hairline}`, background: "transparent", color: T.inkSoft, fontWeight: 600,
            }}>Sign out</button>
          </nav>
        </div>
  </header>

    <ScopeBanner />


     {isStaff && (
        <div style={{ background: T.panel, borderBottom: `1px solid ${T.hairline}`, padding: "10px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 700 }}>Admin</span>
          {isAdmin && <a href="/admin" style={{ fontSize: 12.5, fontWeight: 600, color: T.teal, textDecoration: "none", padding: "6px 14px", border: `1px solid ${T.hairline}`, borderRadius: 99 }}>Approve users</a>}
          <a href="/admin/md-time" style={{ fontSize: 12.5, fontWeight: 600, color: T.teal, textDecoration: "none", padding: "6px 14px", border: `1px solid ${T.hairline}`, borderRadius: 99 }}>MD time record</a>
          {isAdmin && <a href="/admin/qapi" style={{ fontSize: 12.5, fontWeight: 600, color: T.teal, textDecoration: "none", padding: "6px 14px", border: `1px solid ${T.hairline}`, borderRadius: 99 }}>QAPI submissions</a>}
          {isAdmin && <a href="/admin/qapi-exceptions" style={{ fontSize: 12.5, fontWeight: 600, color: T.teal, textDecoration: "none", padding: "6px 14px", border: `1px solid ${T.hairline}`, borderRadius: 99 }}>Excused weeks</a>}
        </div>
      )}

      <main className="mx-auto px-6 pb-14 pt-8" style={{ maxWidth: 1280 }}>
        {loading && <BootLoader month={month ? monthLabel(month) : ""} />}
        {err && !loading && <Empty>Couldn't load data: {err}</Empty>}
        {!loading && !err && !data && <Empty>No monthly data has been committed yet. Run the aggregation worker, then refresh.</Empty>}
        {!loading && !err && data && (
          <ErrorBoundary resetKey={tab} label={tab}>
            {tab === "Overview" && <OverviewTab data={data} month={month} goToFacility={goToFacility} />}
            {tab === "Heatmap" && <HeatmapTab data={data} month={month} goToFacility={goToFacility} />}
            {tab === "Facilities" && <FacilitiesTab data={data} selectedName={selectedName} setSelectedName={setSelectedName} month={month} />}
            {tab === "RTA" && <RtaTab data={data} month={month} goToFacility={goToFacility} />}
            {tab === "Analysis" && <AnalysisTab />}
            {tab === "QAPI" && <><QapiScorecard /><div style={{ marginTop: 24 }}><QapiTab /></div></>}
            {tab === "Team" && <TeamTab data={data} month={month} />}
          </ErrorBoundary>
        )}

        <footer className="flex items-center justify-between" style={{ marginTop: 48, borderTop: `2px solid ${T.teal}`, paddingTop: 14 }}>
          <span style={{ fontSize: 11, color: T.inkSoft }}>Spectrum Executive Dashboard · Live from Supabase</span>
          <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{month ? monthLabel(month) : ""}</span>
        </footer>
      </main>
    </div>
  );
}
