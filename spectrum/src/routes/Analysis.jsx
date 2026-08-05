import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, LineChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import { supabase } from "../lib/supabase.js";
import { useScope } from "../lib/scope.jsx";

/* ————————————————————— tokens (match Executive.jsx) ————————————————————— */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealBright: "#37B4BE", tealSoft: "#E4F1F2",
  alert: "#C4452A", amber: "#B07C1F", slate: "#7C93A6", hairline: "#DCE7E9",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ymKey = (iso) => (iso || "").slice(0, 7);                   // 2026-06-01 -> 2026-06
const monthLabel = (iso) => { const [y, m] = ymKey(iso).split("-"); return `${MONTHS[+m - 1]} ${y}`; };
const monthShort = (iso) => { const [y, m] = ymKey(iso).split("-"); return `${MONTHS[+m - 1].slice(0, 3)} '${y.slice(2)}`; };
const n0 = (v) => (v == null ? "—" : Math.round(Number(v)).toLocaleString());
const n1 = (v) => (v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }));

/* ————————————————————— shared bits (match Executive.jsx) ————————————————————— */
const PulseLine = ({ color = T.teal, width = 46 }) => (
  <svg width={width} height="14" viewBox={`0 0 ${width} 14`} aria-hidden="true">
    <path d={`M0 7 H${width * 0.3} L${width * 0.38} 2 L${width * 0.48} 12 L${width * 0.56} 7 H${width}`}
      fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const SectionLabel = ({ children, right }) => (
  <div className="flex items-baseline justify-between" style={{ borderBottom: `2px solid ${T.teal}`, paddingBottom: 8, marginBottom: 14 }}>
    <span className="ed-ui" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.ink, fontWeight: 800 }}>{children}</span>
    {right && <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{right}</span>}
  </div>
);
const Empty = ({ children }) => (
  <div className="ed-card p-6" style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.6, borderLeft: `4px solid ${T.amber}` }}>{children}</div>
);
const ChartTip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ed-ui" style={{ background: T.ink, color: "#fff", padding: "8px 12px", fontSize: 12, borderRadius: 6 }}>
      <div style={{ opacity: 0.7, marginBottom: 2 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="ed-num" style={{ color: p.color }}>
          {p.name}: {p.value == null ? "—" : (fmt ? fmt(p.dataKey, p.value) : p.value)}
        </div>
      ))}
    </div>
  );
};
/* KPI with a delta (change across the selected range) */
const TrendKpi = ({ label, value, sub, delta, goodWhenUp = true }) => {
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  const good = delta == null ? true : (goodWhenUp ? up || delta === 0 : down || delta === 0);
  const arrow = delta == null || delta === 0 ? "→" : up ? "▲" : "▼";
  const col = delta == null || delta === 0 ? T.inkSoft : good ? T.teal : T.amber;
  return (
    <div className="ed-card p-5" style={{ borderTop: `3px solid ${col === T.inkSoft ? T.teal : col}` }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div className="ed-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div className="ed-num" style={{ fontSize: 11.5, marginTop: 8, color: col }}>
        {delta != null && <span style={{ marginRight: 6 }}>{arrow} {n1(Math.abs(delta))}</span>}{sub}
      </div>
    </div>
  );
};

/* ————————————————————— multi-month load ————————————————————— */
async function loadTrend() {
  const [facs, fm, fg, rta] = await Promise.all([
    supabase.from("facilities").select("id, name, code, org_id"),
    supabase.from("facility_monthly").select("facility_id, month, avg_spectrum_census, avg_snf, avg_ltc"),
    supabase.from("facility_growth").select("facility_id, month, avg_building_census, avg_non_spectrum"),
    supabase.from("rta_monthly").select("facility_id, month, admits, rtas, ltc_admits, ltc_rtas, er_visits"),
  ]);
  const err = facs.error || fm.error || fg.error || rta.error;
  if (err) throw err;

  const facById = {};
  (facs.data || []).forEach((f) => { facById[f.id] = f; });

  const map = new Map();
  const ensure = (fid, m) => {
    const k = `${fid}|${ymKey(m)}`;
    let o = map.get(k);
    if (!o) {
      o = { facility_id: fid, ym: ymKey(m), month: `${ymKey(m)}-01`,
        spectrum: null, snf: null, ltc: null, building: null, nonSpec: null,
        admits: null, rtas: null, ltc_admits: null, ltc_rtas: null, er: null };
      map.set(k, o);
    }
    return o;
  };
  (fm.data || []).forEach((r) => { const o = ensure(r.facility_id, r.month); o.spectrum = r.avg_spectrum_census; o.snf = r.avg_snf; o.ltc = r.avg_ltc; });
  (fg.data || []).forEach((r) => { const o = ensure(r.facility_id, r.month); o.building = r.avg_building_census; o.nonSpec = r.avg_non_spectrum; });
  (rta.data || []).forEach((r) => { const o = ensure(r.facility_id, r.month); o.admits = r.admits; o.rtas = r.rtas; o.ltc_admits = r.ltc_admits; o.ltc_rtas = r.ltc_rtas; o.er = r.er_visits; });

  const rows = [...map.values()].map((o) => ({
    ...o,
    name: facById[o.facility_id]?.name || `#${o.facility_id}`,
    org_id: facById[o.facility_id]?.org_id ?? null,
  }));
  const months = [...new Set(rows.map((r) => r.month))].sort();
  const facilities = Object.values(
    rows.reduce((acc, r) => { acc[r.facility_id] = acc[r.facility_id] || { id: r.facility_id, name: r.name, org_id: r.org_id }; return acc; }, {})
  ).sort((a, b) => a.name.localeCompare(b.name));
  return { rows, months, facilities };
}

/* aggregate a set of rows (one month) into a single point */
function aggregate(rowsForMonth) {
  const sum = (k) => { let any = false, s = 0; rowsForMonth.forEach((r) => { if (r[k] != null) { any = true; s += Number(r[k]); } }); return any ? s : null; };
  const spectrum = sum("spectrum"), building = sum("building"), nonSpec = sum("nonSpec");
  const snf = sum("snf"), ltc = sum("ltc"), admits = sum("admits"), rtas = sum("rtas");
  return {
    spectrum, building, snf, ltc,
    nonSpec: nonSpec != null ? nonSpec : (building != null && spectrum != null ? Math.max(building - spectrum, 0) : null),
    capture: building ? Math.round((spectrum / building) * 1000) / 10 : null,
    admits, rtas,
    snfRate: admits ? Math.round((rtas / admits) * 1000) / 10 : null,
  };
}

/* first & last non-null across a series, for the delta chips */
function endpoints(series, key) {
  const vals = series.filter((p) => p[key] != null);
  if (!vals.length) return { last: null, delta: null };
  const first = vals[0][key], last = vals[vals.length - 1][key];
  return { last, delta: vals.length > 1 ? Math.round((last - first) * 10) / 10 : null };
}

/* ————————————————————— the tab ————————————————————— */
export function AnalysisTab() {
  const { orgId, scoped } = useScope();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [facilityId, setFacilityId] = useState("all");
  const [fromM, setFromM] = useState(null);
  const [toM, setToM] = useState(null);

  useEffect(() => {
    setLoading(true); setErr(null);
    loadTrend()
      .then((d) => { setData(d); setFromM(d.months[0] || null); setToM(d.months[d.months.length - 1] || null); })
      .catch((e) => setErr(e.message || "Failed to load trend data"))
      .finally(() => setLoading(false));
  }, []);

  // facilities visible under the current scope (RLS already limits partners; this
  // covers an admin viewing a specific org via the scope selector)
  const facilities = useMemo(() => {
    if (!data) return [];
    return scoped && orgId != null
      ? data.facilities.filter((f) => String(f.org_id) === String(orgId))
      : data.facilities;
  }, [data, scoped, orgId]);
  const allowedIds = useMemo(() => new Set(facilities.map((f) => f.id)), [facilities]);

  const rangeMonths = useMemo(() => {
    if (!data || !fromM || !toM) return [];
    const lo = fromM <= toM ? fromM : toM, hi = fromM <= toM ? toM : fromM;
    return data.months.filter((m) => m >= lo && m <= hi);
  }, [data, fromM, toM]);

  const series = useMemo(() => {
    if (!data) return [];
    return rangeMonths.map((m) => {
      const rowsForMonth = data.rows.filter((r) => r.month === m && allowedIds.has(r.facility_id) &&
        (facilityId === "all" || r.facility_id === Number(facilityId)));
      const agg = aggregate(rowsForMonth);
      return { month: monthShort(m), ...agg };
    });
  }, [data, rangeMonths, allowedIds, facilityId]);

  if (loading) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "40px 0" }}>Loading trend…</div>;
  if (err) return <Empty>Couldn't load trend data: {err}</Empty>;
  if (!data || !data.months.length) return <Empty>No monthly data has been committed yet.</Empty>;

  const facName = facilityId === "all" ? "All facilities" : (facilities.find((f) => f.id === Number(facilityId))?.name || "—");
  const spec = endpoints(series, "spectrum");
  const cap = endpoints(series, "capture");
  const opp = endpoints(series, "nonSpec");
  const rtaVals = series.filter((p) => p.snfRate != null);
  const avgRta = rtaVals.length ? Math.round((rtaVals.reduce((s, p) => s + p.snfRate, 0) / rtaVals.length) * 10) / 10 : null;

  const selStyle = {
    fontSize: 13, padding: "9px 14px", borderRadius: 99, border: `1px solid ${T.hairline}`,
    background: "#fff", color: T.ink, fontWeight: 600, cursor: "pointer",
  };

  return (
    <>
      <div className="vm-secbar"><span className="vm-tick2" /><h2>Trend analysis</h2><span className="vm-secright">{facName} · {rangeMonths.length} month{rangeMonths.length === 1 ? "" : "s"}</span></div>
      {/* controls */}
      <div className="flex flex-wrap items-end gap-3" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, marginBottom: 6 }}>Facility</div>
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="ed-ui" style={selStyle}>
            <option value="all">All facilities (portfolio)</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, marginBottom: 6 }}>From</div>
          <select value={fromM || ""} onChange={(e) => setFromM(e.target.value)} className="ed-ui" style={selStyle}>
            {data.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, marginBottom: 6 }}>To</div>
          <select value={toM || ""} onChange={(e) => setToM(e.target.value)} className="ed-ui" style={selStyle}>
            {data.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2" style={{ paddingBottom: 4 }}>
          <PulseLine width={44} />
          <span className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>{facName} · {rangeMonths.length} month{rangeMonths.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* KPIs — change across the selected range */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 32 }}>
        <TrendKpi label="Spectrum census" value={n0(spec.last)} sub="vs. range start" delta={spec.delta} goodWhenUp />
        <TrendKpi label="Capture rate" value={cap.last == null ? "—" : `${cap.last}%`} sub="vs. range start" delta={cap.delta} goodWhenUp />
        <TrendKpi label="Growth opportunity" value={n0(opp.last)} sub="non-Spectrum · vs. start" delta={opp.delta} goodWhenUp={false} />
        <TrendKpi label="Avg SNF RTA rate" value={avgRta == null ? "—" : `${avgRta}%`} sub="over range · lower is better" delta={null} />
      </section>

      {/* Census trend */}
      <SectionLabel right={`${monthShort(rangeMonths[0] || fromM)} – ${monthShort(rangeMonths[rangeMonths.length - 1] || toM)}`}>Census trend</SectionLabel>
      <div className="ed-card p-4" style={{ height: 300, marginBottom: 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={T.hairline} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip fmt={(k, v) => n1(v)} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="spectrum" name="Spectrum" stroke={T.teal} strokeWidth={2.6} dot={{ r: 3, fill: T.teal }} connectNulls />
            <Line type="monotone" dataKey="building" name="Building" stroke={T.slate} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="snf" name="SNF" stroke={T.amber} strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="ltc" name="LTC" stroke={T.tealBright} strokeWidth={1.8} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Growth opportunity + capture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginBottom: 32 }}>
        <div>
          <SectionLabel right="Non-Spectrum + capture %">Growth opportunity</SectionLabel>
          <div className="ed-card p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<ChartTip fmt={(k, v) => (k === "capture" ? `${v}%` : n0(v))} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="nonSpec" name="Non-Spectrum" radius={[4, 4, 0, 0]} fill={T.tealSoft} stroke={T.teal} />
                <Line yAxisId="r" type="monotone" dataKey="capture" name="Capture %" stroke={T.teal} strokeWidth={2.6} dot={{ r: 3, fill: T.teal }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionLabel right="SNF RTA rate %">Return to acute</SectionLabel>
          <div className="ed-card p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<ChartTip fmt={(k, v) => (k === "snfRate" ? `${v}%` : n0(v))} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="admits" name="SNF admits" radius={[4, 4, 0, 0]} fill={T.tealSoft} stroke={T.slate} />
                <Line yAxisId="r" type="monotone" dataKey="snfRate" name="RTA rate %" stroke={T.alert} strokeWidth={2.4} dot={{ r: 3, fill: T.alert }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly detail table */}
      <SectionLabel right={`${facName} · ${rangeMonths.length} months`}>Monthly detail</SectionLabel>
      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              {["Month", "Spectrum", "Building", "Capture", "Non-Spec", "SNF", "LTC", "SNF admits", "SNF RTA", "RTA rate"].map((h) => (
                <th key={h} className="text-left py-3" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, paddingRight: 14, paddingLeft: h === "Month" ? 20 : 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.month} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td className="py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, paddingLeft: 20 }}>{p.month}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5 }}>{n1(p.spectrum)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n1(p.building)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, fontWeight: 600, color: T.teal }}>{p.capture == null ? "—" : p.capture + "%"}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.amber }}>{p.nonSpec == null ? "—" : Math.round(p.nonSpec)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n1(p.snf)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n1(p.ltc)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n0(p.admits)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{n0(p.rtas)}</td>
                <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, fontWeight: 600, color: p.snfRate == null ? T.inkSoft : p.snfRate > 12 ? T.alert : p.snfRate > 8 ? T.amber : T.teal }}>{p.snfRate == null ? "—" : p.snfRate + "%"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
        Spectrum / SNF / LTC census and admits come from <span className="ed-num">facility_monthly</span> &amp; <span className="ed-num">rta_monthly</span>; building &amp; non-Spectrum from <span className="ed-num">facility_growth</span>. Capture = Spectrum ÷ building. "All facilities" sums across the buildings visible to you. Blank cells mean that metric wasn't reported that month.
      </p>
    </>
  );
}

export default AnalysisTab;

