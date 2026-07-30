import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";
import { signOut } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { supabase } from "../lib/supabase.js";
import { QapiTab, QapiFacilityPanel } from "./Qapi.jsx";
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

const Kpi = ({ label, value, sub, good = true }) => (
  <div className="ed-card p-5" style={{ borderTop: `3px solid ${good ? T.teal : T.amber}` }}>
    <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 10, fontWeight: 500 }}>{label}</div>
    <div className="ed-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
    <div className="ed-num" style={{ fontSize: 11.5, marginTop: 8, color: good ? T.teal : T.amber }}>{sub}</div>
  </div>
);

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

/* ————————————————————— Tab: Overview ————————————————————— */
function OverviewTab({ data, month, goToFacility }) {
  const { facilities, portfolioTrend, kpis, mixData, hasGrowth, hasLiaison } = data;
  const topOpp = facilities.filter((f) => f.nonSpec != null && f.nonSpec > 5).sort((a, b) => b.nonSpec - a.nonSpec).slice(0, 6);
  const oppTh = data.thresholds?.["growth.opportunity_pct"];
  const { scoped } = useScope();
  return (
    <>
     <section className={`grid grid-cols-2 ${scoped ? "md:grid-cols-4" : "md:grid-cols-5"} gap-4`}>
        <Kpi label="Avg daily census" value={n0(kpis.totalCensus)} sub={`${facilities.length} facilities · Spectrum patients`} />
        <Kpi label="Building census" value={n0(kpis.totalBuilding)} sub={hasGrowth ? "Total patients in buildings" : "No building data this month"} good={hasGrowth} />
        <Kpi label="Capture rate" value={kpis.captureRate == null ? "—" : `${kpis.captureRate}%`} sub={hasGrowth ? "Spectrum share of buildings" : "Needs building data"} good={hasGrowth} />
        <Kpi label="Growth opportunity" value={n0(kpis.totalOpportunity)} sub={hasGrowth ? "Non-Spectrum patients" : "Needs building data"} good={false} />
     {!scoped && <Kpi label="Liaison notes" value={hasLiaison ? kpis.liaisonNotes : "—"} sub={hasLiaison ? `${n0(kpis.liaisonHrs)} hrs worked` : "No liaison data this month"} good={hasLiaison} />}
      </section>

      {hasGrowth && topOpp.length > 0 ? (
        <div className="ed-card p-5 flex gap-4 items-start" style={{ margin: "20px 0 32px", background: T.tealSoft, border: "1px solid #C6E0E2" }}>
          <PulseLine width={60} />
          <p style={{ fontSize: 14, color: T.ink, lineHeight: 1.6, margin: 0, maxWidth: 900 }}>
            <strong style={{ color: T.teal }}>{n0(kpis.totalOpportunity)} patients</strong> in your buildings aren't on Spectrum service. Biggest pools:{" "}
            {topOpp.slice(0, 3).map((f, i) => (
              <span key={f.name}>{i > 0 ? ", " : ""}<strong>{f.name}</strong> ({Math.round(f.nonSpec)}, {f.opp}%)</span>
            ))}.
          </p>
        </div>
      ) : (
        <div style={{ margin: "20px 0 32px" }}>
          <Empty>
            Building-census and non-Spectrum figures aren't loaded for {monthLabel(month)} yet — those come from the growth report, not the facility reports. Census, SNF/LTC split, and RTA below are live.
          </Empty>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginBottom: 36 }}>
        <div>
          <SectionLabel right={`${portfolioTrend.length} days`}>Portfolio daily census</SectionLabel>
          <div className="ed-card p-4" style={{ height: 260 }}>
            {portfolioTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioTrend} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
                  <CartesianGrid stroke={T.hairline} vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} interval={Math.max(0, Math.floor(portfolioTrend.length / 8))} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="census" name="Spectrum census" stroke={T.teal} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ color: T.inkSoft, fontSize: 13, padding: 20 }}>No daily census for this month.</div>}
          </div>
        </div>
        <div>
          <SectionLabel right="Avg daily patients">Portfolio SNF vs LTC</SectionLabel>
          <div className="ed-card p-4" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixData} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Patients" radius={[4, 4, 0, 0]} fill={T.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <SectionLabel right="Ranked by non-Spectrum patients">Largest growth opportunities</SectionLabel>
      {hasGrowth && topOpp.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topOpp.map((f) => (
            <button key={f.name} onClick={() => goToFacility(f.name)} className="ed-card p-5 text-left" style={{ cursor: "pointer", borderLeft: `4px solid ${toneFrom(f.opp, oppTh)}` }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</span>
                <span className="ed-num" style={{ fontSize: 12, color: toneFrom(f.opp, oppTh), fontWeight: 600 }}>{f.opp}%</span>
              </div>
              <div className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>{Math.round(f.nonSpec)} of {Math.round(f.building)} not on service</div>
            </button>
          ))}
        </div>
      ) : (
        <Empty>No non-Spectrum / building data for {monthLabel(month)}. This populates once the growth report is loaded for the month.</Empty>
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
              {["Facility", "Spectrum census", "Building census", "Non-Spectrum", "Capture", "SNF", "LTC"].map((h) => (
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
function RtaTab({ data, month }) {
  const rows = data.rta;
  if (!rows.length) return <Empty>No return-to-acute data for {monthLabel(month)} yet.</Empty>;
  const tot = rows.reduce((a, r) => ({
    admits: a.admits + (r.admits || 0), rtas: a.rtas + (r.rtas || 0),
    ltc_admits: a.ltc_admits + (r.ltc_admits || 0), ltc_rtas: a.ltc_rtas + (r.ltc_rtas || 0),
    er: a.er + (r.er || 0),
  }), { admits: 0, rtas: 0, ltc_admits: 0, ltc_rtas: 0, er: 0 });
  const snfRate = tot.admits ? ((tot.rtas / tot.admits) * 100).toFixed(1) : "—";
  const ltcRate = tot.ltc_admits ? ((tot.ltc_rtas / tot.ltc_admits) * 100).toFixed(1) : "—";
const snfTh = data.thresholds?.["rta.snf"];
  const ltcTh = data.thresholds?.["rta.ltc_pct"];
  const rateColor = (r, th) => (r == null ? T.inkSoft : toneFrom(r, th));

  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 32 }}>
        <Kpi label="SNF RTA rate" value={`${snfRate}%`} sub={`${tot.rtas} of ${tot.admits} SNF admits`} good={snfRate === "—" || (snfTh?.target != null && +snfRate <= Number(snfTh.target))} />
        <Kpi label="LTC RTA rate" value={`${ltcRate}%`} sub={`${tot.ltc_rtas} of ${tot.ltc_admits} LTC admits`} good={ltcTh?.target != null ? (ltcRate === "—" || +ltcRate <= Number(ltcTh.target)) : true} />
        <Kpi label="Total admissions" value={n0(tot.admits + tot.ltc_admits)} sub="SNF + LTC" />
        <Kpi label="ER visits" value={n0(tot.er)} sub="Across portfolio" good={false} />
      </section>

      <SectionLabel right={`${rows.length} facilities · ${monthLabel(month)}`}>Return-to-acute by facility</SectionLabel>
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
              <tr key={r.name} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{r.name}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{r.admits ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{r.rtas ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: rateColor(r.snfRate, snfTh) }}>{r.snfRate == null ? "—" : r.snfRate.toFixed(1) + "%"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{r.ltc_admits ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{r.ltc_rtas ?? "—"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: rateColor(r.ltcRate, ltcTh) }}>{r.ltcRate == null ? "—" : r.ltcRate.toFixed(1) + "%"}</td>
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
  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 32 }}>
        <Kpi label="Liaison hours" value={n0(hrs)} sub={`${liaisons.length} liaisons`} />
        <Kpi label="Overtime hours" value={n1(ot)} sub="Month to date" good={otTotalTh?.amber == null || ot < Number(otTotalTh.amber)} />
        <Kpi label="Notes completed" value={notes} sub="Across the team" />
        <Kpi label="Notes per hour" value={hrs ? (notes / hrs).toFixed(2) : "—"} sub="Team average" />
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
              <tr key={l.name} style={{ borderBottom: `1px solid ${T.hairline}` }}>
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

async function loadMonthData(monthIso) {
  const ym = ymKey(monthIso);          // normalize 2026-06-01 -> 2026-06
  const start = `${ym}-01`;
  const end = lastDayOfMonth(ym);
  const [facs, fm, fg, rta, dc, lm, cms, th] = await Promise.all([
    supabase.from("facilities").select("id, name, code, ccn, org_id"),
    supabase.from("facility_monthly").select("facility_id, avg_spectrum_census, avg_snf, avg_ltc").eq("month", start),
    supabase.from("facility_growth").select("facility_id, avg_building_census, avg_non_spectrum").eq("month", start),
    supabase.from("rta_monthly").select("facility_id, admits, rtas, ltc_admits, ltc_rtas, er_visits").eq("month", start),
    supabase.from("daily_census").select("facility_id, census_date, spectrum_census").gte("census_date", start).lte("census_date", end),
    supabase.from("liaison_monthly").select("hours, ot_hours, notes_count, liaisons(name)").eq("month", start),
supabase.from("facility_cms").select("*"),
    supabase.from("metric_thresholds").select("metric_key, label, unit, direction, target, amber, red, benchmark_national, benchmark_state, benchmark_state_code, benchmark_period, benchmark_source, provisional").eq("active", true),
  ]);
  const err = facs.error || fm.error || fg.error || rta.error || dc.error || lm.error || cms.error || th.error;
  if (err) throw err;

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

  const facilities = Object.values(byId).sort((a, b) => (b.census || 0) - (a.census || 0));
  const hasGrowth = (fg.data || []).length > 0;

  const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);
  const totalCensus = sum(facilities, "census");
  const totalBuilding = hasGrowth ? sum(facilities, "building") : null;
  const totalOpportunity = hasGrowth ? sum(facilities, "nonSpec") : null;
  const captureRate = totalBuilding ? Math.round((totalCensus / totalBuilding) * 1000) / 10 : null;
  const totalSnf = sum(facilities, "snf"), totalLtc = sum(facilities, "ltc");

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
    facilities, portfolioTrend, rta: rtaRows, liaisons, hasGrowth, hasLiaison,
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
  const { profile } = useAuth();
  const { orgId, scoped } = useScope();
  const data = useMemo(() => applyScope(rawData, orgId), [rawData, orgId]);
  const tabs = scoped
    ? ["Overview", "Facilities", "RTA", "QAPI"]
    : ["Overview", "Facilities", "RTA", "QAPI", "Team", "Financials"];
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
        <nav className="flex items-center gap-2" aria-label="Dashboard sections">
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

      <main className="mx-auto px-6 pb-14 pt-8" style={{ maxWidth: 1280 }}>
        {loading && <div style={{ color: T.inkSoft, fontSize: 14, padding: "40px 0" }}>Loading {month ? monthLabel(month) : ""}…</div>}
        {err && !loading && <Empty>Couldn't load data: {err}</Empty>}
        {!loading && !err && !data && <Empty>No monthly data has been committed yet. Run the aggregation worker, then refresh.</Empty>}
        {!loading && !err && data && (
          <>
            {tab === "Overview" && <OverviewTab data={data} month={month} goToFacility={goToFacility} />}
            {tab === "Facilities" && <FacilitiesTab data={data} selectedName={selectedName} setSelectedName={setSelectedName} month={month} />}
            {tab === "RTA" && <RtaTab data={data} month={month} />}
            {tab === "QAPI" && <QapiTab />}
            {tab === "Team" && <TeamTab data={data} month={month} />}
            {tab === "Financials" && (
              <Empty>Weekly AR and financial tracking will appear here once billing data is loaded. Census, RTA, and facility metrics are live in the other tabs.</Empty>
            )}
          </>
        )}

        <footer className="flex items-center justify-between" style={{ marginTop: 48, borderTop: `2px solid ${T.teal}`, paddingTop: 14 }}>
          <span style={{ fontSize: 11, color: T.inkSoft }}>Spectrum Executive Dashboard · Live from Supabase</span>
          <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{month ? monthLabel(month) : ""}</span>
        </footer>
      </main>
    </div>
  );
}
