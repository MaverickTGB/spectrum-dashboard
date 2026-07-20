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

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .ed-ui { font-family: 'Archivo', system-ui, sans-serif; }
  .ed-display { font-family: 'Archivo', system-ui, sans-serif; }
  .ed-num { font-family: 'IBM Plex Mono', monospace; }
  .ed-card { background: ${T.panel}; border: 1px solid ${T.hairline}; border-radius: 10px; }
  .ed-row { cursor: pointer; transition: background 120ms ease; }
  .ed-row:hover { background: ${T.tealSoft}; }
  @media (prefers-reduced-motion: reduce) { .ed-pulse { animation: none !important; } }
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
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
              <span className="ed-display" style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: T.teal, fontWeight: 800 }}>Spectrum</span>
              <PulseLine />
              <span style={{ fontSize: 11, color: T.inkSoft }}>July 2026 · data through Jul 9</span>
            </div>
            <h1 className="ed-display" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
              Spectrum Executive Dashboard
            </h1>
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
