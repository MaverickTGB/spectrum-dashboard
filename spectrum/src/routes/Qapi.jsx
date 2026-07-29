import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ReferenceLine,
} from "recharts";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";

/* ————————————————————— Tokens (mirrors Executive.jsx) ————————————————————— */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};

/* ————————————————————— Date + format helpers ————————————————————— */
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const isoOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

const parseIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Monday of the week containing `s` (ISO date string)
const mondayOf = (s) => {
  const dt = parseIso(s);
  const offset = (dt.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  dt.setDate(dt.getDate() - offset);
  return isoOf(dt);
};

const addWeeks = (s, n) => {
  const dt = parseIso(s);
  dt.setDate(dt.getDate() + n * 7);
  return isoOf(dt);
};

const weekLabel = (s) => {
  if (!s) return "—";
  const d = parseIso(s);
  return `Week of ${MON[d.getMonth()]} ${d.getDate()}`;
};

const shortWeek = (s) => {
  const d = parseIso(s);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
};

const longDate = (s) => {
  if (!s) return "—";
  const d = parseIso(String(s).slice(0, 10));
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const thisMonday = () => mondayOf(isoOf(new Date()));

const fmtValue = (v, unit) => {
  if (v == null) return "—";
  const n = Number(v);
  if (unit === "count") return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (unit === "percent_of_census") return `${n.toFixed(1)}%`;
  return n.toFixed(2);
};

const unitNote = (unit) =>
  unit === "rate_per_1000_pd" ? "per 1,000 resident-days"
  : unit === "percent_of_census" ? "% of census"
  : "count";

// Threshold colour. All current metrics are lower_better, but respect direction.
const toneFor = (v, m) => {
  if (v == null || !m || m.amber == null) return T.ink;
  const val = Number(v);
  if (m.direction === "higher_better") {
    return val <= Number(m.red) ? T.alert : val <= Number(m.amber) ? T.amber : T.teal;
  }
  return val >= Number(m.red) ? T.alert : val >= Number(m.amber) ? T.amber : T.teal;
};

/* ————————————————————— Shared bits ————————————————————— */
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

const Note = ({ children, tone = T.amber }) => (
  <div className="ed-card p-6" style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.6, borderLeft: `4px solid ${tone}` }}>
    {children}
  </div>
);

const ThresholdFootnote = () => (
  <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
    Amber and red thresholds are provisional and pending clinical review. Read the numbers; treat the colours as a draft.
  </p>
);

const Th = ({ children, first }) => (
  <th className="text-left py-3" style={{
    fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft,
    fontWeight: 600, paddingRight: 16, paddingLeft: first ? 20 : 0,
  }}>{children}</th>
);

/* ————————————————————— Metric catalog hook ————————————————————— */
function useMetricCatalog() {
  const [metrics, setMetrics] = useState([]);
  useEffect(() => {
    let alive = true;
    supabase.from("qapi_metrics")
      .select("id, key, label, section, unit, direction, target, amber, red, sort_order, active, reportable")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => { if (alive) setMetrics(data || []); });
    return () => { alive = false; };
  }, []);
  const byKey = useMemo(() => Object.fromEntries(metrics.map((m) => [m.key, m])), [metrics]);
  const reportable = useMemo(() => metrics.filter((m) => m.reportable), [metrics]);
  return { metrics, byKey, reportable };
}

/* ═══════════════════════ FACILITY PANEL ═══════════════════════ */
export function QapiFacilityPanel({ facilityId }) {
  const { reportable } = useMetricCatalog();
  const [facility, setFacility] = useState(null);
  const [rows, setRows] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!facilityId) return;
    let alive = true;
    setLoading(true); setErr(null);
    const since = addWeeks(thisMonday(), -11);

    Promise.all([
      supabase.from("facilities").select("id, name, qapi_required, qapi_start_week").eq("id", facilityId).maybeSingle(),
      supabase.from("qapi_weekly")
        .select("week_of, metric_key, metric_label, unit, direction, numerator, denominator, denom_basis, value, target, amber, red, md_attended, flag_count")
        .eq("facility_id", facilityId).gte("week_of", since).order("week_of", { ascending: false }),
      supabase.from("qapi_open_flags")
        .select("id, week_of, section, question, answer, owner, days_open")
        .eq("facility_id", facilityId).order("days_open", { ascending: false }),
    ]).then(([f, w, g]) => {
      if (!alive) return;
      const e = f.error || w.error || g.error;
      if (e) { setErr(e.message); setLoading(false); return; }
      setFacility(f.data || null);
      setRows(w.data || []);
      setFlags(g.data || []);
      setLoading(false);
    });

    return () => { alive = false; };
  }, [facilityId]);

  const weeks = useMemo(() => [...new Set(rows.map((r) => r.week_of))].sort().reverse(), [rows]);
  const latestWeek = weeks[0] || null;
  const priorWeek = weeks[1] || null;

  const latest = useMemo(() => {
    const m = {};
    rows.filter((r) => r.week_of === latestWeek).forEach((r) => { m[r.metric_key] = r; });
    return m;
  }, [rows, latestWeek]);

  const prior = useMemo(() => {
    const m = {};
    rows.filter((r) => r.week_of === priorWeek).forEach((r) => { m[r.metric_key] = r; });
    return m;
  }, [rows, priorWeek]);

  if (!facilityId) return null;

  const wrap = (body) => (
    <div style={{ marginTop: 32 }}>
      <SectionLabel right={latestWeek ? weekLabel(latestWeek) : "Weekly QAPI review"}>QAPI</SectionLabel>
      {body}
    </div>
  );

  if (loading) return wrap(<div className="ed-card p-6" style={{ color: T.inkSoft, fontSize: 13 }}>Loading QAPI…</div>);
  if (err) return wrap(<Note tone={T.alert}>Couldn't load QAPI data: {err}</Note>);

  // — State: this building doesn't hold a QAPI meeting —
  if (facility && facility.qapi_required === false) {
    return wrap(
      <Note>
        QAPI review isn't collected for this building. Weekly review applies to the skilled nursing
        facilities; rehab hospitals and LTACs report through their own programs.
      </Note>
    );
  }

  // — State: not yet in the rollout —
  if (facility && !facility.qapi_start_week) {
    return wrap(<Note>This facility isn't in the QAPI rollout yet. Set a start week to begin tracking weekly submissions.</Note>);
  }

  // — State: rollout starts in the future —
  if (facility?.qapi_start_week && facility.qapi_start_week > thisMonday()) {
    return wrap(
      <Note tone={T.teal}>
        Weekly QAPI review starts {longDate(facility.qapi_start_week)}. The first submission is due
        after that week's meeting — metrics and open items will appear here once it arrives.
      </Note>
    );
  }

  // — State: live, but nothing submitted —
  if (!latestWeek) {
    return wrap(
      <Note>
        No QAPI submissions yet. Once this facility submits its weekly review form, metrics and open
        items appear here.
      </Note>
    );
  }

  const head = rows.find((r) => r.week_of === latestWeek) || {};
  const stale = latestWeek < addWeeks(thisMonday(), -1);

  return wrap(
    <>
      <div className="ed-card p-5" style={{ marginBottom: 16 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 4 }}>Most recent review</div>
            <div className="ed-display" style={{ fontSize: 20, fontWeight: 800 }}>{weekLabel(latestWeek)}</div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 4 }}>Medical director</div>
              <div className="ed-num" style={{ fontSize: 14, fontWeight: 600, color: head.md_attended ? T.teal : T.amber }}>
                {head.md_attended ? "Attended" : "Did not attend"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 4 }}>Open items</div>
              <div className="ed-num" style={{ fontSize: 14, fontWeight: 600, color: flags.length ? T.amber : T.teal }}>{flags.length}</div>
            </div>
          </div>
        </div>
        {stale && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.hairline}`, fontSize: 12.5, color: T.amber }}>
            Nothing submitted since {weekLabel(latestWeek)} — this facility has missed at least one week.
          </div>
        )}
      </div>

      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              <Th first>Metric</Th><Th>Count</Th><Th>Rate</Th><Th>Target</Th><Th>vs last week</Th>
            </tr>
          </thead>
          <tbody>
            {reportable.map((m) => {
              const r = latest[m.key];
              const p = prior[m.key];
              const missing = r && r.denom_basis === "missing";
              const val = r && !missing ? Number(r.value) : null;
              const pv = p && p.denom_basis !== "missing" && p.value != null ? Number(p.value) : null;
              const delta = val != null && pv != null ? val - pv : null;
              const better = delta == null ? null : (m.direction === "higher_better" ? delta > 0 : delta < 0);
              return (
                <tr key={m.key} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                  <td className="py-3 pr-4" style={{ paddingLeft: 20 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: T.inkSoft }}>{unitNote(m.unit)}</div>
                  </td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: T.inkSoft }}>
                    {r?.numerator != null ? Number(r.numerator).toLocaleString() : "—"}
                  </td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 14, fontWeight: 600, color: toneFor(val, m) }}>
                    {missing
                      ? <span style={{ color: T.amber, fontWeight: 500, fontSize: 12 }}>census missing</span>
                      : fmtValue(val, m.unit)}
                  </td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>
                    {m.target == null ? "—" : fmtValue(m.target, m.unit)}
                  </td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: delta == null ? T.inkSoft : better ? T.teal : T.alert }}>
                    {delta == null ? "—" : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} ${fmtValue(Math.abs(delta), m.unit)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ThresholdFootnote />

      {flags.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel right={`${flags.length} open`}>Open items</SectionLabel>
          <div className="ed-card" style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
                  <Th first>Item</Th><Th>Section</Th><Th>Owner</Th><Th>Raised</Th><Th>Days open</Th>
                </tr>
              </thead>
              <tbody>
                {flags.map((g) => (
                  <tr key={g.id} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                    <td className="py-3 pr-4" style={{ fontSize: 13, paddingLeft: 20, maxWidth: 420 }}>{g.question}</td>
                    <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{g.section || "—"}</td>
                    <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{g.owner || "Unassigned"}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{shortWeek(g.week_of)}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: g.days_open > 21 ? T.alert : g.days_open > 7 ? T.amber : T.ink }}>{g.days_open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════ PORTFOLIO TAB ═══════════════════════ */
const MIN_FOR_BENCHMARK = 5;

export function QapiTab() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { reportable, byKey } = useMetricCatalog();

  const [status, setStatus] = useState([]);
  const [flags, setFlags] = useState([]);
  const [week, setWeek] = useState(null);
  const [weekRows, setWeekRows] = useState([]);
  const [bench, setBench] = useState([]);
  const [recon, setRecon] = useState([]);
  const [metricKey, setMetricKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Compliance grid + open flags (week-independent)
  useEffect(() => {
    let alive = true;
    const since = addWeeks(thisMonday(), -7);
    Promise.all([
      supabase.from("qapi_submission_status")
        .select("facility_id, facility_name, facility_code, week_of, submitted, submitted_at, facility_census, flag_count, md_attended, status")
        .gte("week_of", since).order("week_of", { ascending: false }),
      supabase.from("qapi_open_flags")
        .select("id, facility_name, week_of, section, question, owner, days_open")
        .order("days_open", { ascending: false }).limit(50),
      isAdmin
        ? supabase.from("qapi_rta_reconciliation").select("facility_name, month, weeks_reported, qapi_rehosp, workbook_rtas, variance").order("month", { ascending: false }).limit(40)
        : Promise.resolve({ data: [] }),
    ]).then(([s, g, r]) => {
      if (!alive) return;
      const e = s.error || g.error || r.error;
      if (e) { setErr(e.message); setLoading(false); return; }
      const rows = s.data || [];
      setStatus(rows);
      setFlags(g.data || []);
      setRecon(r.data || []);
      const ws = [...new Set(rows.map((x) => x.week_of))].sort().reverse();
      setWeek((w) => w || ws[0] || null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [isAdmin]);

  // Per-week metric detail
  useEffect(() => {
    if (!week) return;
    let alive = true;
    Promise.all([
      supabase.from("qapi_weekly")
        .select("facility_id, facility_name, metric_key, unit, direction, value, denom_basis, target, amber, red")
        .eq("week_of", week),
      supabase.from("qapi_portfolio_benchmark")
        .select("metric_key, metric_label, unit, facilities_reporting, pooled_value, median_value, best_value, worst_value")
        .eq("week_of", week),
    ]).then(([w, b]) => {
      if (!alive) return;
      setWeekRows(w.data || []);
      setBench(b.data || []);
    });
    return () => { alive = false; };
  }, [week]);

  useEffect(() => {
    if (!metricKey && reportable.length) setMetricKey(reportable[0].key);
  }, [reportable, metricKey]);

  const weeks = useMemo(() => [...new Set(status.map((r) => r.week_of))].sort().reverse(), [status]);
  const gridWeeks = useMemo(() => weeks.slice(0, 6), [weeks]);

  const facilitiesInGrid = useMemo(() => {
    const m = new Map();
    status.forEach((r) => {
      if (!m.has(r.facility_id)) m.set(r.facility_id, { id: r.facility_id, name: r.facility_name, code: r.facility_code, byWeek: {} });
      m.get(r.facility_id).byWeek[r.week_of] = r;
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [status]);

  const thisWeekRows = useMemo(() => status.filter((r) => r.week_of === week), [status, week]);
  const submittedCount = thisWeekRows.filter((r) => r.submitted).length;
  const dueCount = thisWeekRows.length;
  const mdCount = thisWeekRows.filter((r) => r.submitted && r.md_attended).length;

  const redFacilities = useMemo(() => {
    const bad = new Set();
    weekRows.forEach((r) => {
      const m = byKey[r.metric_key];
      if (!m || !m.reportable || r.value == null || r.denom_basis === "missing" || m.red == null) return;
      const val = Number(r.value);
      const isRed = m.direction === "higher_better" ? val <= Number(m.red) : val >= Number(m.red);
      if (isRed) bad.add(r.facility_id);
    });
    return bad.size;
  }, [weekRows, byKey]);

  const selectedMetric = metricKey ? byKey[metricKey] : null;
  const benchRow = bench.find((b) => b.metric_key === metricKey) || null;

  const rankedData = useMemo(() => {
    if (!selectedMetric) return [];
    return weekRows
      .filter((r) => r.metric_key === metricKey && r.value != null && r.denom_basis !== "missing")
      .map((r) => ({ name: r.facility_name, value: Number(r.value) }))
      .sort((a, b) => (selectedMetric.direction === "higher_better" ? a.value - b.value : b.value - a.value));
  }, [weekRows, metricKey, selectedMetric]);

  if (loading) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "40px 0" }}>Loading QAPI…</div>;
  if (err) return <Note tone={T.alert}>Couldn't load QAPI data: {err}</Note>;

  // — Pre-rollout: nothing is due yet —
  if (!weeks.length) {
    return (
      <>
        <SectionLabel right="Weekly QAPI review">QAPI</SectionLabel>
        <Note tone={T.teal}>
          <strong style={{ color: T.ink }}>Rollout hasn't started.</strong> No weeks are inside the
          compliance window yet, so there's nothing outstanding. Once the first Monday arrives,
          this tab shows who has submitted, which items are still open, and how facilities compare
          on each metric.
        </Note>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
        <SectionLabel right={`${facilitiesInGrid.length} facilities`}>Weekly QAPI review</SectionLabel>
      </div>

      <div className="flex items-center gap-2" style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft }}>Week</span>
        <select value={week || ""} onChange={(e) => setWeek(e.target.value)} className="ed-ui" style={{
          fontSize: 13, padding: "8px 14px", borderRadius: 99, border: `1px solid ${T.hairline}`,
          background: "transparent", color: T.ink, fontWeight: 600, cursor: "pointer",
        }}>
          {weeks.map((w) => <option key={w} value={w}>{weekLabel(w)}</option>)}
        </select>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 32 }}>
        <Kpi
          label="Submitted"
          value={`${submittedCount} / ${dueCount}`}
          sub={dueCount ? `${Math.round((submittedCount / dueCount) * 100)}% of facilities due` : "None due"}
          good={dueCount > 0 && submittedCount === dueCount}
        />
        <Kpi label="Open items" value={flags.length} sub={flags.length ? `Oldest ${flags[0].days_open} days` : "Nothing outstanding"} good={flags.length === 0} />
        <Kpi label="Medical director present" value={submittedCount ? `${mdCount} / ${submittedCount}` : "—"} sub="Of submitted reviews" good={submittedCount > 0 && mdCount === submittedCount} />
        <Kpi label="Facilities in red" value={redFacilities} sub="On at least one metric" good={redFacilities === 0} />
      </section>

      {/* ——— Compliance grid ——— */}
      <SectionLabel right={`Last ${gridWeeks.length} weeks`}>Submission compliance</SectionLabel>
      <div className="ed-card" style={{ overflowX: "auto", marginBottom: 12 }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              <Th first>Facility</Th>
              {gridWeeks.map((w) => <Th key={w}>{shortWeek(w)}</Th>)}
              <Th>Open</Th>
            </tr>
          </thead>
          <tbody>
            {facilitiesInGrid.map((f) => {
              const openHere = flags.filter((g) => g.facility_name === f.name).length;
              return (
                <tr key={f.id} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                  <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>
                    {f.name} <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{f.code}</span>
                  </td>
                  {gridWeeks.map((w) => {
                    const cell = f.byWeek[w];
                    const on = cell?.submitted;
                    const label = !cell ? "·" : on ? "✓" : "✕";
                    const colour = !cell ? T.hairline : on ? T.teal : T.alert;
                    return (
                      <td key={w} className="ed-num py-3 pr-4" style={{ fontSize: 15, fontWeight: 700, color: colour }}
                          title={!cell ? "Outside compliance window" : on ? `Submitted ${longDate(cell.submitted_at || w)}` : "Not submitted"}>
                        {label}
                      </td>
                    );
                  })}
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, color: openHere ? T.amber : T.inkSoft, fontWeight: openHere ? 600 : 400 }}>
                    {openHere || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 36 }}>
        ✓ submitted · ✕ not submitted · · outside the compliance window (before the facility's start week).
      </p>

      {/* ——— Cross-facility comparison ——— */}
      <SectionLabel right={weekLabel(week)}>Facility comparison</SectionLabel>
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 16 }}>
        {reportable.map((m) => (
          <button key={m.key} onClick={() => setMetricKey(m.key)} className="ed-ui" style={{
            fontSize: 12, padding: "7px 14px", cursor: "pointer", borderRadius: 99,
            border: `1px solid ${metricKey === m.key ? T.teal : T.hairline}`,
            background: metricKey === m.key ? T.teal : "transparent",
            color: metricKey === m.key ? "#FFF" : T.inkSoft, fontWeight: 600,
          }}>{m.label}</button>
        ))}
      </div>

      {rankedData.length < MIN_FOR_BENCHMARK ? (
        <Note>
          Comparison needs at least {MIN_FOR_BENCHMARK} facilities reporting this metric —
          {" "}{rankedData.length} {rankedData.length === 1 ? "has" : "have"} so far for {weekLabel(week).toLowerCase()}.
          A median across fewer buildings than that would be noise, not a benchmark.
        </Note>
      ) : (
        <>
          <div className="ed-card p-4" style={{ height: Math.max(260, rankedData.length * 26 + 60) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankedData} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={T.hairline} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={168} tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: T.tealSoft }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="ed-ui" style={{ background: T.ink, color: "#fff", padding: "8px 12px", fontSize: 12, borderRadius: 6 }}>
                        <div style={{ opacity: 0.7, marginBottom: 2 }}>{label}</div>
                        <div className="ed-num">{fmtValue(payload[0].value, selectedMetric?.unit)} {unitNote(selectedMetric?.unit)}</div>
                      </div>
                    );
                  }}
                />
                {benchRow?.median_value != null && (
                  <ReferenceLine x={Number(benchRow.median_value)} stroke={T.ink} strokeDasharray="4 3"
                    label={{ value: "median", position: "top", fill: T.ink, fontSize: 11 }} />
                )}
                <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]}>
                  {rankedData.map((d, i) => <Cell key={i} fill={toneFor(d.value, selectedMetric)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {benchRow && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginTop: 16 }}>
              <Kpi label="Portfolio pooled" value={fmtValue(benchRow.pooled_value, benchRow.unit)} sub="Recomputed from totals" />
              <Kpi label="Median facility" value={fmtValue(benchRow.median_value, benchRow.unit)} sub={`${benchRow.facilities_reporting} reporting`} />
              <Kpi label="Best" value={fmtValue(benchRow.best_value, benchRow.unit)} sub="Lowest this week" />
              <Kpi label="Worst" value={fmtValue(benchRow.worst_value, benchRow.unit)} sub="Highest this week" good={false} />
            </div>
          )}
          <ThresholdFootnote />
        </>
      )}

      {/* ——— Open items ——— */}
      <div style={{ marginTop: 36 }}>
        <SectionLabel right={`${flags.length} open`}>Open items across the portfolio</SectionLabel>
        {flags.length === 0 ? (
          <Note tone={T.teal}>No open items. Anything flagged during a weekly review shows up here until it's resolved.</Note>
        ) : (
          <div className="ed-card" style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
                  <Th first>Facility</Th><Th>Item</Th><Th>Owner</Th><Th>Raised</Th><Th>Days open</Th>
                </tr>
              </thead>
              <tbody>
                {flags.map((g) => (
                  <tr key={g.id} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                    <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{g.facility_name}</td>
                    <td className="py-3 pr-4" style={{ fontSize: 13, maxWidth: 380 }}>{g.question}</td>
                    <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{g.owner || "Unassigned"}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{shortWeek(g.week_of)}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: g.days_open > 21 ? T.alert : g.days_open > 7 ? T.amber : T.ink }}>{g.days_open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ——— Admin-only: RTA reconciliation tripwire ——— */}
      {isAdmin && recon.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <SectionLabel right="Spectrum admin only">Rehospitalization reconciliation</SectionLabel>
          <div className="ed-card" style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
                  <Th first>Facility</Th><Th>Month</Th><Th>Weeks</Th><Th>QAPI form</Th><Th>Workbook</Th><Th>Variance</Th>
                </tr>
              </thead>
              <tbody>
                {recon.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                    <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{r.facility_name}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{longDate(r.month)}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{r.weeks_reported}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{r.qapi_rehosp ?? "—"}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13 }}>{r.workbook_rtas ?? "—"}</td>
                    <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: Math.abs(Number(r.variance || 0)) > 2 ? T.alert : T.ink }}>
                      {r.variance == null ? "—" : (Number(r.variance) > 0 ? "+" : "") + Number(r.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
            The QAPI form's rehospitalization count is not a reported metric — it exists only to cross-check
            the facility workbook, which remains the source of truth for return-to-acute. A large variance
            means one of the two is being filled in wrong.
          </p>
        </div>
      )}
    </>
  );
}
