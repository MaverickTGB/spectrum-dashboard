import React, { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend,
} from "recharts";

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

/* ————————————————— Real data · July_26.xlsx · through Jul 9, 2026 ————————————————— */
const dayLabels = ["Jul 1","Jul 2","Jul 3","Jul 4","Jul 5","Jul 6","Jul 7","Jul 8","Jul 9"];

// Per-facility: avg daily Spectrum census, total building census, non-Spectrum patients,
// opportunity % (share of building not on Spectrum), SNF/LTC mix, daily census Jul 1–9
const facilities = [
  { name: "Meadowlake Estates", census: 117.3, building: 117.3, nonSpec: 0, opp: 0, snf: 11.2, ltc: 106.1, trend: [119,118,118,118,118,117,116,116,116] },
  { name: "Oak Hills", census: 114.6, building: 114.6, nonSpec: 0, opp: 0, snf: 6.6, ltc: 108, trend: [116,116,115,115,115,114,113,113,114] },
  { name: "Medical Park West", census: 100.8, building: 100.8, nonSpec: 0, opp: 0, snf: 38.8, ltc: 62, trend: [100,103,99,98,99,103,102,103,100] },
  { name: "Midwest Post Acute", census: 96.9, building: 96.9, nonSpec: 0, opp: 0, snf: 13.6, ltc: 83.3, trend: [97,96,96,96,94,98,98,99,98] },
  { name: "Southpointe", census: 93.9, building: 210.7, nonSpec: 116.8, opp: 55.4, snf: 3, ltc: 90.9, trend: [94,94,94,94,94,94,94,94,93] },
  { name: "Ranchwood", census: 90, building: 104.9, nonSpec: 14.9, opp: 14.2, snf: 12.8, ltc: 77.2, trend: [90,90,90,90,90,89,90,90,91] },
  { name: "Edmond Healthcare", census: 77, building: 77, nonSpec: 0, opp: 0, snf: 3.7, ltc: 73.3, trend: [77,77,77,77,77,77,77,77,77] },
  { name: "Ignite OKC", census: 71.8, building: 71.8, nonSpec: 0, opp: 0, snf: 69.8, ltc: 2, trend: [70,71,74,74,73,72,71,72,69] },
  { name: "Montevista", census: 69.4, building: 84.4, nonSpec: 15, opp: 17.8, snf: 16.1, ltc: 53.3, trend: [69,71,72,71,71,69,68,67,67] },
  { name: "Noble", census: 69.1, building: 84.1, nonSpec: 15, opp: 17.8, snf: 5.6, ltc: 63.6, trend: [69,70,71,69,68,68,69,69,69] },
  { name: "Warr Acres", census: 69, building: 71, nonSpec: 2, opp: 2.8, snf: 1, ltc: 68, trend: [69,69,69,69,69,69,69,69,69] },
  { name: "Emerald Southwest", census: 68.8, building: 68.8, nonSpec: 0, opp: 0, snf: 13.9, ltc: 54.9, trend: [71,70,71,68,67,68,66,69,69] },
  { name: "Ignite Edmond", census: 68.2, building: 68.2, nonSpec: 0, opp: 0, snf: 37.1, ltc: 31.1, trend: [73,74,73,70,66,61,63,68,66] },
  { name: "Park Place", census: 64.9, building: 64.9, nonSpec: 0, opp: 0, snf: 3.8, ltc: 61.1, trend: [64,65,65,65,65,65,65,65,65] },
  { name: "Heritage Nursing Home - Tecumseh", census: 57.9, building: 57.9, nonSpec: 0, opp: 0, snf: 3.7, ltc: 54.2, trend: [59,58,58,58,58,58,57,57,58] },
  { name: "Luxe Life", census: 51, building: 68.1, nonSpec: 17.1, opp: 25.1, snf: 51, ltc: 0, trend: [51,51,51,51,51,51,51,51,51] },
  { name: "Lodge at Brookline", census: 48.8, building: 48.8, nonSpec: 0, opp: 0, snf: 2.8, ltc: 46, trend: [49,50,49,49,49,49,48,48,48] },
  { name: "Heritage Manor", census: 48, building: 48, nonSpec: 0, opp: 0, snf: 1.8, ltc: 46.2, trend: [48,48,48,47,47,47,49,49,49] },
  { name: "Accel Crystal Park", census: 45.9, building: 56.2, nonSpec: 10.3, opp: 18.3, snf: 35, ltc: 10.9, trend: [42,44,44,46,44,47,48,49,49] },
  { name: "Emerald Midwest", census: 45.3, building: 67.9, nonSpec: 22.6, opp: 33.3, snf: 13.8, ltc: 31.6, trend: [41,45,46,46,46,46,46,46,46] },
  { name: "Heritage Park", census: 43.1, building: 43.1, nonSpec: 0, opp: 0, snf: 1, ltc: 42.1, trend: [43,43,43,43,43,44,43,43,43] },
  { name: "The Garden", census: 42, building: 69.8, nonSpec: 27.8, opp: 39.8, snf: 42, ltc: 0, trend: [42,42,42,42,42,42,42,42,42] },
  { name: "OKC Rehab", census: 35, building: 37, nonSpec: 2, opp: 5.4, snf: 35, ltc: 0, trend: [0,0,35,0,0,0,0,0,0] },
  { name: "Tuscany", census: 31.4, building: 116.4, nonSpec: 85, opp: 73.0, snf: 4.1, ltc: 27.3, trend: [35,31,31,31,31,31,31,31,31] },
  { name: "Northwinds", census: 28, building: 28, nonSpec: 0, opp: 0, snf: 0, ltc: 28, trend: [28,28,28,28,28,28,28,28,28] },
  { name: "Ignite Norman", census: 24.6, building: 38.3, nonSpec: 13.8, opp: 36.0, snf: 23.8, ltc: 0.8, trend: [27,26,25,25,25,25,24,23,21] },
  { name: "Pam Health", census: 20.4, building: 30.1, nonSpec: 9.8, opp: 32.6, snf: 20.4, ltc: 0, trend: [20,20,20,21,21,20,20,21,0] },
  { name: "Inspire", census: 8.6, building: 8.6, nonSpec: 0, opp: 0, snf: 8.6, ltc: 0, trend: [9,9,9,8,7,7,8,12,0] },
  { name: "Windsor Hills", census: 5.7, building: 46.9, nonSpec: 41.2, opp: 87.8, snf: 1.6, ltc: 4.1, trend: [6,6,6,6,6,6,5,5,5] },
  { name: "SSM Rehab", census: 5.5, building: 5.5, nonSpec: 0, opp: 0, snf: 5.5, ltc: 0, trend: [5,6,6,5,5,5,6,6,0] },
];

const portfolioTrend = dayLabels.map((d, i) => ({
  d, census: facilities.reduce((s, f) => s + (f.trend[i] || 0), 0),
}));

// Patient type mix (Overview sheet)
const patientTypes = [
  { type: "LTC", count: 1165 },
  { type: "SNF", count: 320.4 },
  { type: "AL", count: 93 },
  { type: "Rehab", count: 40.5 },
  { type: "LTAC", count: 29 },
];

// Liaison monthly totals (Overview sheet)
const liaisons = [
  { name: "Lori Huntley", hrs: 81.5, ot: 1.5, notes: 77 },
  { name: "Tracey Minyard", hrs: 80, ot: 0, notes: 51 },
  { name: "Chyna Deloney", hrs: 75.73, ot: 4.81, notes: 0 },
  { name: "Jessica Dees", hrs: 68.09, ot: 1.99, notes: 22 },
  { name: "Kelly Venard", hrs: 66.13, ot: 0, notes: 65 },
  { name: "Maurissa Clark", hrs: 63.17, ot: 0, notes: 27 },
  { name: "Mariah Lunsford", hrs: 59.98, ot: 0, notes: 0 },
  { name: "Heather Metcalf", hrs: 58.7, ot: 18.7, notes: 103 },
  { name: "Cassidy Anders", hrs: 54.96, ot: 0, notes: 0 },
  { name: "Jennefer Poole", hrs: 42.5, ot: 0, notes: 58 },
  { name: "Ariana Diaz", hrs: 38.9, ot: 0, notes: 0 },
  { name: "Carla Deleon Diaz", hrs: 25.98, ot: 0, notes: 17 },
  { name: "Bridget Baysinger", hrs: 0, ot: 0, notes: 0 },
];

// MG census by facility (MG sheet, avg daily)
const mgCensus = [
  { code: "MV", avg: 15 },
  { code: "EMW", avg: 10.4 },
  { code: "ACP", avg: 10.3 },
  { code: "RW", avg: 8.9 },
  { code: "OKCRH", avg: 2 },
];

/* ————————————————————— Portfolio KPIs ————————————————————— */
const totalCensus = 1647.9;      // avg daily Spectrum census (Overview total)
const totalBuilding = 2041.1;    // avg daily total building census
const totalOpportunity = 393.2;  // non-Spectrum patients
const captureRate = 80.7;        // Spectrum share of building census
const liaisonHrs = liaisons.reduce((s, l) => s + l.hrs, 0);
const liaisonOT = liaisons.reduce((s, l) => s + l.ot, 0);
const liaisonNotes = liaisons.reduce((s, l) => s + l.notes, 0);

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

/* ————————————————————— Tab: Overview ————————————————————— */
function OverviewTab({ goToFacility }) {
  const topOpp = [...facilities].filter((f) => f.nonSpec > 5).sort((a, b) => b.nonSpec - a.nonSpec).slice(0, 6);
  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi label="Avg daily census" value={totalCensus.toLocaleString(undefined,{maximumFractionDigits:0})} sub="30 facilities · Spectrum patients" />
        <Kpi label="Building census" value={totalBuilding.toLocaleString(undefined,{maximumFractionDigits:0})} sub="Total patients in buildings" />
        <Kpi label="Capture rate" value={`${captureRate}%`} sub="Spectrum share of buildings" />
        <Kpi label="Growth opportunity" value={Math.round(totalOpportunity)} sub="Non-Spectrum patients (19.3%)" good={false} />
        <Kpi label="Liaison notes" value={liaisonNotes} sub={`${liaisonHrs.toFixed(0)} hrs worked MTD`} />
      </section>

      <div className="ed-card p-5 flex gap-4 items-start" style={{ margin: "20px 0 32px", background: T.tealSoft, border: "1px solid #C6E0E2" }}>
        <PulseLine width={60} />
        <p style={{ fontSize: 14, color: T.ink, lineHeight: 1.6, margin: 0, maxWidth: 900 }}>
          Nearly <strong style={{ color: T.teal }}>400 patients</strong> in your buildings aren't on Spectrum service.
          The three biggest pools: <strong>Southpointe</strong> (117 patients, 55% of the building),{" "}
          <strong>Tuscany</strong> (85 patients, 73%), and <strong>Windsor Hills</strong> (41 patients, 88% —
          only 5.7 on service). Ignite Norman's census is also sliding: 27 → 21 over nine days.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginBottom: 36 }}>
        <div>
          <SectionLabel right="Data through Jul 9">Portfolio daily census</SectionLabel>
          <div className="ed-card p-4" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioTrend} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis domain={[1550, 1780]} tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="census" name="Spectrum census" stroke={T.teal} strokeWidth={2.5} dot={{ r: 3, fill: T.teal }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionLabel right="Avg daily patients">Patient type mix</SectionLabel>
          <div className="ed-card p-4" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patientTypes} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topOpp.map((f) => (
          <button key={f.name} onClick={() => goToFacility(f.name)} className="ed-card p-5 text-left" style={{ cursor: "pointer", borderLeft: `4px solid ${f.opp > 50 ? T.alert : T.amber}` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</span>
              <span className="ed-num" style={{ fontSize: 12, color: f.opp > 50 ? T.alert : T.amber, fontWeight: 600 }}>{f.opp}%</span>
            </div>
            <div className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>
              {Math.round(f.nonSpec)} of {Math.round(f.building)} patients not on service
            </div>
            <div style={{ height: 6, background: T.hairline, borderRadius: 3, marginTop: 10 }}>
              <div style={{ height: 6, width: `${100 - f.opp}%`, background: T.teal, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6 }}>Spectrum census {f.census}</div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ————————————————————— Tab: Facilities ————————————————————— */
function FacilitiesTab({ selectedName, setSelectedName }) {
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? facilities : facilities.filter((f) => f.nonSpec > 0);
  const sel = facilities.find((f) => f.name === selectedName) || facilities[0];
  const selTrend = dayLabels.map((d, i) => ({ d, census: sel.trend[i] }));
  const mix = [{ type: "SNF", count: sel.snf }, { type: "LTC", count: sel.ltc }];

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
              const cap = f.building ? Math.round((f.census / f.building) * 100) : 100;
              return (
                <tr key={f.name} className="ed-row" onClick={() => setSelectedName(f.name)} style={{ borderBottom: `1px solid ${T.hairline}`, background: f.name === sel.name ? T.tealSoft : "transparent" }}>
                  <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{f.name}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{f.census}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{f.building}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: f.nonSpec > 20 ? T.alert : f.nonSpec > 0 ? T.amber : T.ink }}>{f.nonSpec ? Math.round(f.nonSpec) : "—"}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: cap < 70 ? T.alert : cap < 95 ? T.amber : T.teal, fontWeight: 600 }}>{cap}%</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{f.snf}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{f.ltc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
        <h2 className="ed-display" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{sel.name}</h2>
        <PulseLine color={sel.opp > 50 ? T.alert : T.teal} />
        <span className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>
          avg census {sel.census}{sel.nonSpec > 0 ? ` · ${Math.round(sel.nonSpec)} patients not on service` : " · full building capture"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <SectionLabel right="Jul 1–9">Daily Spectrum census</SectionLabel>
          <div className="ed-card p-4" style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selTrend} margin={{ top: 10, right: 10, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="census" name="Census" stroke={T.teal} strokeWidth={2.5} dot={{ r: 3, fill: T.teal }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionLabel right="Avg daily patients">Patient mix &amp; capture</SectionLabel>
          <div className="ed-card p-5">
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 18 }}>
              {mix.map((m) => (
                <div key={m.type}>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 6 }}>{m.type}</div>
                  <div className="ed-display" style={{ fontSize: 26, fontWeight: 800 }}>{m.count}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 6 }}>Building capture</div>
            <div style={{ height: 8, background: T.hairline, borderRadius: 4, marginBottom: 6 }}>
              <div style={{ height: 8, width: `${sel.building ? (sel.census / sel.building) * 100 : 100}%`, background: sel.opp > 50 ? T.alert : T.teal, borderRadius: 4 }} />
            </div>
            <div className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>
              {sel.census} of {sel.building} building patients on Spectrum service
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ————————————————————— Tab: Team ————————————————————— */
function TeamTab() {
  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 32 }}>
        <Kpi label="Liaison hours MTD" value={liaisonHrs.toFixed(0)} sub="13 liaisons" />
        <Kpi label="Overtime hours" value={liaisonOT.toFixed(1)} sub="18.7 from one liaison" good={liaisonOT < 15} />
        <Kpi label="Notes completed" value={liaisonNotes} sub="MTD across the team" />
        <Kpi label="Notes per hour" value={(liaisonNotes / liaisonHrs).toFixed(2)} sub="Team average" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SectionLabel right="Monthly totals · Jul 2026">Liaison performance</SectionLabel>
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
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{l.hrs.toFixed(1)}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: l.ot > 5 ? T.alert : l.ot > 0 ? T.amber : T.ink }}>{l.ot ? l.ot.toFixed(1) : "—"}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{l.notes || "—"}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>{l.hrs ? (l.notes / l.hrs).toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SectionLabel right="Avg daily patients">MG census by facility</SectionLabel>
          <div className="ed-card p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mgCensus} layout="vertical" margin={{ top: 10, right: 20, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={T.hairline} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={64} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="avg" name="MG census" radius={[0, 4, 4, 0]} fill={T.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

/* ————————————————————— Tab: Financials ————————————————————— */
function FinancialsTab() {
  return (
    <>
      <SectionLabel right="From July_26.xlsx">Financial &amp; quality tracking</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ed-card p-6" style={{ borderLeft: `4px solid ${T.amber}` }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 8, fontWeight: 600 }}>Weekly AR · Billed vs collected</div>
          <div className="ed-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Awaiting July data</div>
          <p style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, margin: 0 }}>
            The Weekly AR section of the workbook has billed and collected columns set up per provider by week,
            but no July entries yet. Once billing posts, this panel will show weekly billed vs collected trends
            and provider-level collection rates.
          </p>
        </div>
        <div className="ed-card p-6" style={{ borderLeft: `4px solid ${T.amber}` }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 8, fontWeight: 600 }}>RTA rates by facility</div>
          <div className="ed-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Awaiting July data</div>
          <p style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, margin: 0 }}>
            The RTA Rates table lists all facility codes with admits and RTA count columns, but they're empty
            for July so far. When admits and returns to acute are logged, this panel will show RTA% per facility
            against your target with month-over-month direction.
          </p>
        </div>
      </div>
    </>
  );
}

/* ————————————————————— App shell ————————————————————— */
export default function SpectrumExecutiveDashboard() {
  const [tab, setTab] = useState("Overview");
  const [selectedName, setSelectedName] = useState("Southpointe");
  const tabs = ["Overview", "Facilities", "Team", "Financials"];
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
                <span style={{ fontSize: 11, color: T.inkSoft }}>July 2026 · data through Jul 9</span>
              </div>
              <h1 className="ed-display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
                Executive Dashboard
              </h1>
            </div>
          </div>
          <nav className="flex items-center gap-2" aria-label="Dashboard sections">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className="ed-ui" style={{
                fontSize: 13, padding: "9px 20px", cursor: "pointer", borderRadius: 99,
                border: `1px solid ${tab === t ? T.teal : T.hairline}`,
                background: tab === t ? T.teal : "transparent",
                color: tab === t ? "#FFF" : T.inkSoft, fontWeight: 600,
              }}>{t}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto px-6 pb-14 pt-8" style={{ maxWidth: 1280 }}>
        {tab === "Overview" && <OverviewTab goToFacility={goToFacility} />}
        {tab === "Facilities" && <FacilitiesTab selectedName={selectedName} setSelectedName={setSelectedName} />}
        {tab === "Team" && <TeamTab />}
        {tab === "Financials" && <FinancialsTab />}

        <footer className="flex items-center justify-between" style={{ marginTop: 48, borderTop: `2px solid ${T.teal}`, paddingTop: 14 }}>
          <span style={{ fontSize: 11, color: T.inkSoft }}>
            Spectrum Executive Dashboard · Source: July_26.xlsx (census through Jul 9)
          </span>
          <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>Updated Jul 13, 2026</span>
        </footer>
      </main>
    </div>
  );
}
