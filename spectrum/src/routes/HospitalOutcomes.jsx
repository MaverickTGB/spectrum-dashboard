import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { supabase } from "../lib/supabase.js";

/* ─────────────────────────── design tokens ─────────────────────────── */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9", slate: "#8A9BA0",
};

const MONTH_LABEL = (iso) => {
  const [y, m] = iso.split("-");
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1] + " " + y.slice(2);
};

const num = (v, d = 2) => (v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(d));
const int = (v) => (v == null ? "—" : Math.round(v).toLocaleString());

/* ─────────────────────────── small pieces ─────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 10,
      padding: 18, ...style,
    }}>{children}</div>
  );
}

function Stat({ label, value, unit, sub, accent = T.ink }) {
  return (
    <Card style={{ flex: "1 1 200px", minWidth: 190 }}>
      <div style={{ fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase",
                    color: T.inkSoft, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: accent, lineHeight: 1,
                       fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: T.inkSoft }}>{unit}</span>}
      </div>
      {sub && <div style={{ marginTop: 8, fontSize: 12, color: T.inkSoft, lineHeight: 1.45 }}>{sub}</div>}
    </Card>
  );
}

function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: T.mist, borderRadius: 3, height: 8, width: "100%" }}>
      <div style={{ width: `${pct}%`, background: color, height: 8, borderRadius: 3 }} />
    </div>
  );
}

/* ─────────────────────────── main ─────────────────────────── */
export default function HospitalOutcomes() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("hospital_rta_comparison")
        .select("*")
        .eq("comparable", true)
        .order("month", { ascending: true });
      if (!alive) return;
      if (error) setErr(error.message);
      else setRows(data || []);
    })();
    return () => { alive = false; };
  }, []);

  /* Drop trailing months that are still being collected: a month is only
     included once its facility count reaches half the median month's. */
  const complete = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const byMonth = new Map();
    rows.forEach((r) => byMonth.set(r.month, (byMonth.get(r.month) || 0) + 1));
    const counts = [...byMonth.values()].sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)] || 0;
    const months = [...byMonth.keys()].sort();
    let cut = months.length;
    while (cut > 0 && byMonth.get(months[cut - 1]) < median / 2) cut -= 1;
    const keep = new Set(months.slice(0, cut));
    return rows.filter((r) => keep.has(r.month));
  }, [rows]);

  const agg = useMemo(() => {
    if (!complete.length) return null;
    const s = complete.reduce((a, r) => ({
      sRet: a.sRet + (r.spectrum_returns || 0),
      sDay: a.sDay + (r.spectrum_resident_days || 0),
      nRet: a.nRet + (r.nonspectrum_returns || 0),
      nDay: a.nDay + (r.nonspectrum_resident_days || 0),
    }), { sRet: 0, sDay: 0, nRet: 0, nDay: 0 });
    const sRate = s.sDay ? (1000 * s.sRet) / s.sDay : null;
    const nRate = s.nDay ? (1000 * s.nRet) / s.nDay : null;
    const rel = sRate != null && nRate ? ((nRate - sRate) / nRate) * 100 : null;
    return {
      ...s, sRate, nRate, rel,
      facilities: new Set(complete.map((r) => r.name)).size,
      months: new Set(complete.map((r) => r.month)).size,
      window: [complete[0].month, complete[complete.length - 1].month],
    };
  }, [complete]);

  const trend = useMemo(() => {
    const m = new Map();
    complete.forEach((r) => {
      const k = r.month;
      const c = m.get(k) || { sRet: 0, sDay: 0, nRet: 0, nDay: 0, n: 0 };
      c.sRet += r.spectrum_returns || 0; c.sDay += r.spectrum_resident_days || 0;
      c.nRet += r.nonspectrum_returns || 0; c.nDay += r.nonspectrum_resident_days || 0;
      c.n += 1; m.set(k, c);
    });
    return [...m.entries()].sort().map(([month, c]) => ({
      month: MONTH_LABEL(month),
      Spectrum: c.sDay ? +((1000 * c.sRet) / c.sDay).toFixed(2) : null,
      "Other provider": c.nDay ? +((1000 * c.nRet) / c.nDay).toFixed(2) : null,
      n: c.n,
    }));
  }, [complete]);

  const byFacility = useMemo(() => {
    const m = new Map();
    complete.forEach((r) => {
      const c = m.get(r.name) || { name: r.name, code: r.code, mo: 0, sRet: 0, sDay: 0, nRet: 0, nDay: 0 };
      c.mo += 1;
      c.sRet += r.spectrum_returns || 0; c.sDay += r.spectrum_resident_days || 0;
      c.nRet += r.nonspectrum_returns || 0; c.nDay += r.nonspectrum_resident_days || 0;
      m.set(r.name, c);
    });
    return [...m.values()].map((c) => {
      const sRate = c.sDay ? (1000 * c.sRet) / c.sDay : null;
      const nRate = c.nDay ? (1000 * c.nRet) / c.nDay : null;
      return { ...c, sRate, nRate, rel: sRate != null && nRate ? ((nRate - sRate) / nRate) * 100 : null };
    }).sort((a, b) => (b.rel ?? -999) - (a.rel ?? -999));
  }, [complete]);

  if (err) return <Card><span style={{ color: T.alert }}>Could not load outcomes data: {err}</span></Card>;
  if (!rows) return <Card><span style={{ color: T.inkSoft }}>Loading outcomes…</span></Card>;
  if (!agg) return (
    <Card>
      <div style={{ fontWeight: 600, color: T.ink }}>Not enough matched data yet</div>
      <div style={{ marginTop: 8, fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>
        This view only shows buildings where Spectrum and another provider both care for
        residents in the same month, and where both carry at least 300 resident-days of exposure.
      </div>
    </Card>
  );

  const favorable = byFacility.filter((f) => (f.rel ?? 0) > 0).length;
  const maxRate = Math.max(...byFacility.flatMap((f) => [f.sRate || 0, f.nRate || 0]), 1);
  const shown = showAll ? byFacility : byFacility.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* framing */}
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink }}>
          Readmission Outcomes
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.55, maxWidth: 780 }}>
          Return-to-hospital rates for residents under Spectrum's clinical management, compared
          against residents in the <em>same buildings, in the same months</em>, managed by another
          provider group. Matching within a building holds facility, staffing and local referral
          patterns constant.
        </p>
      </div>

      {/* headline */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Stat label="Spectrum-managed" value={num(agg.sRate)} unit="per 1,000 resident-days"
              accent={T.teal}
              sub={`${int(agg.sRet)} returns over ${int(agg.sDay)} resident-days`} />
        <Stat label="Other provider, same buildings" value={num(agg.nRate)} unit="per 1,000 resident-days"
              accent={T.slate}
              sub={`${int(agg.nRet)} returns over ${int(agg.nDay)} resident-days`} />
        <Stat label="Difference"
              value={agg.rel == null ? "—" : `${agg.rel > 0 ? "−" : "+"}${Math.abs(agg.rel).toFixed(1)}%`}
              unit={agg.rel > 0 ? "lower under Spectrum" : "higher under Spectrum"}
              accent={agg.rel > 0 ? T.teal : T.amber}
              sub={`${favorable} of ${byFacility.length} matched buildings favour Spectrum`} />
        <Stat label="Evidence base" value={agg.facilities} unit="buildings"
              sub={`${complete.length} matched facility-months · ${MONTH_LABEL(agg.window[0])} – ${MONTH_LABEL(agg.window[1])}`} />
      </div>

      {/* trend */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          Monthly rate, matched buildings only
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 14 }}>
          Returns to hospital per 1,000 resident-days. Lower is better.
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={T.hairline} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.inkSoft }}
                     axisLine={{ stroke: T.hairline }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: `1px solid ${T.hairline}`, borderRadius: 8, fontSize: 12 }}
                       formatter={(v) => [`${v} per 1,000`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Spectrum" stroke={T.teal} strokeWidth={2.4}
                    dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Other provider" stroke={T.slate} strokeWidth={2}
                    strokeDasharray="5 3" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* per-facility */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          Building-by-building
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 14 }}>
          Every matched building is listed, including those where Spectrum does not lead.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: T.inkSoft, fontSize: 11,
                           textTransform: "uppercase", letterSpacing: ".06em" }}>
                <th style={{ padding: "8px 10px 8px 0" }}>Building</th>
                <th style={{ padding: 8 }}>Mo</th>
                <th style={{ padding: 8, width: 190 }}>Spectrum</th>
                <th style={{ padding: 8, width: 190 }}>Other provider</th>
                <th style={{ padding: 8, textAlign: "right" }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f.name} style={{ borderTop: `1px solid ${T.hairline}` }}>
                  <td style={{ padding: "10px 10px 10px 0", fontWeight: 600, color: T.ink }}>
                    {f.name}
                    <div style={{ fontWeight: 400, fontSize: 11, color: T.inkSoft }}>
                      {int(f.sDay)} vs {int(f.nDay)} resident-days
                    </div>
                  </td>
                  <td style={{ padding: 8, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{f.mo}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", width: 40, color: T.teal }}>
                        {num(f.sRate)}
                      </span>
                      <Bar value={f.sRate} max={maxRate} color={T.teal} />
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", width: 40, color: T.slate }}>
                        {num(f.nRate)}
                      </span>
                      <Bar value={f.nRate} max={maxRate} color={T.slate} />
                    </div>
                  </td>
                  <td style={{ padding: 8, textAlign: "right", fontWeight: 600,
                               fontFamily: "'IBM Plex Mono', monospace",
                               color: (f.rel ?? 0) > 0 ? T.teal : T.amber }}>
                    {f.rel == null ? "—" : `${f.rel > 0 ? "−" : "+"}${Math.abs(f.rel).toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {byFacility.length > 6 && (
          <button onClick={() => setShowAll((v) => !v)}
            style={{ marginTop: 12, background: "transparent", border: `1px solid ${T.hairline}`,
                     borderRadius: 6, padding: "6px 12px", fontSize: 12, color: T.teal,
                     cursor: "pointer", fontWeight: 600 }}>
            {showAll ? "Show fewer" : `Show all ${byFacility.length} buildings`}
          </button>
        )}
      </Card>

      {/* methodology — keep this visible; it is what makes the numbers defensible */}
      <Card style={{ background: T.mist }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: ".05em",
                      textTransform: "uppercase" }}>How these numbers are built</div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5,
                     color: T.inkSoft, lineHeight: 1.7 }}>
          <li><strong>Unit.</strong> Returns to hospital per 1,000 resident-days, the CMS convention
              for long-stay populations. Resident-days come from daily census, so a resident counts
              only for the days they were actually in the building.</li>
          <li><strong>Matching.</strong> Only buildings where both Spectrum and another provider group
              carried residents in the same month are included. Single-provider buildings are excluded
              because they have no internal comparison.</li>
          <li><strong>Minimum exposure.</strong> A building-month appears only if both arms carry at
              least 300 resident-days. Small denominators produce unstable rates.</li>
          <li><strong>Case mix is not adjusted.</strong> Spectrum's panel is weighted toward
              short-stay skilled residents, who are hospitalised more often than stable long-stay
              residents. Where Spectrum carries the heavier skilled share, this comparison
              understates Spectrum's performance; where it does not, it may overstate it.</li>
          <li><strong>Source.</strong> Facility-reported monthly returns and daily census.
              Counts only — no resident-level information is used or stored in this system.</li>
        </ul>
      </Card>
    </div>
  );
}
