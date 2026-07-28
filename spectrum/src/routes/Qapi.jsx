import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ReferenceLine,
} from "recharts";
import { useAuth } from "../lib/auth.jsx";
import { supabase } from "../lib/supabase.js";

/* ————————————————————— tokens (mirrors Executive.jsx) —————————————————————
   The .ed-* and Tailwind-shim classes are injected globally by Executive.jsx,
   so they're available here without re-declaring the <style> block.          */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const shortDay = (iso) => { if (!iso) return "—"; const [ , m, d] = iso.split("-"); return `${MONTHS[+m-1].slice(0,3)} ${+d}`; };
const longDay  = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${MONTHS[+m-1]} ${+d}, ${y}`; };
const n0 = (v) => (v == null ? "—" : Math.round(Number(v)).toLocaleString());
const n1 = (v) => (v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }));

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

/* ————————————————————— metric formatting & thresholds ————————————————————— */

// Thresholds live in qapi_metrics and arrive on every qapi_weekly row.
// direction is 'lower_better' for every metric today; higher_better is handled
// so a future metric (e.g. care-plan compliance %) doesn't need a code change.
function tone(value, row) {
  if (value == null || row.amber == null || row.red == null) return T.ink;
  const v = Number(value), amber = Number(row.amber), red = Number(row.red);
  if (row.direction === "higher_better") return v <= red ? T.alert : v <= amber ? T.amber : T.teal;
  return v >= red ? T.alert : v >= amber ? T.amber : T.teal;
}

function fmtValue(v, unit) {
  if (v == null) return "—";
  if (unit === "percent_of_census") return Number(v).toFixed(1) + "%";
  if (unit === "rate_per_1000_pd") return Number(v).toFixed(2);
  return n1(v);
}

// qapi_weekly doesn't expose facility_census directly, but it's recoverable:
// percent_of_census rows divide by census, rate_per_1000_pd rows by census * 7.
function facilityCensus(rows) {
  const pct = rows.find((r) => r.unit === "percent_of_census" && r.denom_basis === "facility_census" && r.denominator != null);
  if (pct) return Number(pct.denominator);
  const pd = rows.find((r) => r.unit === "rate_per_1000_pd" && r.denom_basis === "facility_census" && r.denominator != null);
  return pd ? Number(pd.denominator) / 7 : null;
}

const unitNote = (unit) =>
  unit === "rate_per_1000_pd" ? "per 1,000 resident-days"
  : unit === "percent_of_census" ? "% of census"
  : "count";

/* ————————————————————— Facility scorecard panel —————————————————————
   Renders nothing at all for buildings where qapi_required = false
   (Inspire, Pam Health, SSM Rehab, Luxe Life, OKC Rehab — no QAPI meeting).  */
export function QapiFacilityPanel({ facilityId }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (!facilityId) return;
    let dead = false;
    setState({ loading: true });

    (async () => {
      const [meta, weekly] = await Promise.all([
        supabase.from("facilities").select("qapi_required, qapi_start_week").eq("id", facilityId).maybeSingle(),
        supabase.from("qapi_weekly").select("*").eq("facility_id", facilityId).order("week_of", { ascending: false }).limit(200),
      ]);
      if (dead) return;
      if (meta.error || weekly.error) {
        setState({ loading: false, error: (meta.error || weekly.error).message });
        return;
      }
      const required = meta.data?.qapi_required !== false;
      const rows = weekly.data || [];
      if (!rows.length) {
        setState({ loading: false, required, startWeek: meta.data?.qapi_start_week || null, rows: [] });
        return;
      }
      // rows arrive newest-first; keep only the most recent week
      const latest = rows[0].week_of;
      const current = rows.filter((r) => r.week_of === latest);

      const bench = await supabase.from("qapi_portfolio_benchmark").select("metric_key, median_value").eq("week_of", latest);
      if (dead) return;
      const medians = {};
      (bench.data || []).forEach((b) => { medians[b.metric_key] = b.median_value; });

      setState({ loading: false, required, week: latest, rows: current, medians });
    })();

    return () => { dead = true; };
  }, [facilityId]);

  if (state.loading) return null;
  if (state.required === false) return null;  // rehab/LTAC — no QAPI panel at all

  const medianLabel = isAdmin ? "Portfolio median" : "Group median";

  return (
    <div style={{ marginTop: 32 }}>
      <SectionLabel right={state.week ? `Week of ${longDay(state.week)}` : "QAPI"}>
        Weekly QAPI review
      </SectionLabel>

      {state.error ? (
        <Empty>Couldn't load QAPI data: {state.error}</Empty>
      ) : !state.rows?.length ? (
        <div className="ed-card p-5" style={{ color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
          No QAPI submissions yet.
          {state.startWeek && <> Weekly review forms begin the week of {longDay(state.startWeek)}.</>}
        </div>
      ) : (
        <div className="ed-card p-5">
          <div className="flex items-center gap-4" style={{ marginBottom: 16, flexWrap: "wrap" }}>
            <span className="ed-num" style={{ fontSize: 12, color: T.inkSoft }}>
              Census {n1(facilityCensus(state.rows))}
            </span>
            <span style={{ fontSize: 12, color: state.rows[0].md_attended ? T.teal : T.amber, fontWeight: 600 }}>
              {state.rows[0].md_attended ? "MD attended" : "No MD present"}
            </span>
            {state.rows[0].flag_count > 0 && (
              <span style={{ fontSize: 12, color: T.alert, fontWeight: 600 }}>
                {state.rows[0].flag_count} open flag{state.rows[0].flag_count === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.hairline}` }}>
                {["Metric", "Count", "Rate", medianLabel, "Target"].map((h) => (
                  <th key={h} className="text-left" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, paddingBottom: 8, paddingRight: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.rows.map((r) => (
                <tr key={r.metric_key} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                  <td style={{ fontSize: 13, fontWeight: 600, padding: "9px 12px 9px 0" }}>
                    {r.metric_label}
                    <div style={{ fontSize: 10.5, color: T.inkSoft, fontWeight: 400 }}>{unitNote(r.unit)}</div>
                  </td>
                  <td className="ed-num" style={{ fontSize: 13, color: T.inkSoft, paddingRight: 12 }}>{n0(r.numerator)}</td>
                  <td className="ed-num" style={{ fontSize: 14, fontWeight: 700, color: tone(r.value, r), paddingRight: 12 }}>
                    {r.denom_basis === "missing"
                      ? <span style={{ color: T.amber, fontSize: 12, fontWeight: 500 }}>census missing</span>
                      : fmtValue(r.value, r.unit)}
                  </td>
                  <td className="ed-num" style={{ fontSize: 13, color: T.inkSoft, paddingRight: 12 }}>
                    {fmtValue(state.medians?.[r.metric_key], r.unit)}
                  </td>
                  <td className="ed-num" style={{ fontSize: 13, color: T.inkSoft }}>{fmtValue(r.target, r.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: 11, color: T.inkSoft, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
            All rates divide by <strong>total facility census</strong>, not Spectrum census. Amber/red thresholds are
            provisional and pending clinical review — treat colour as directional only.
          </p>
        </div>
      )}
    </div>
  );
}

/* ————————————————————— Compliance grid ————————————————————— */
function ComplianceGrid({ rows }) {
  const { weeks, facilities } = useMemo(() => {
    const w = [...new Set(rows.map((r) => r.week_of))].sort().slice(-12);
    const byFac = {};
    rows.forEach((r) => {
      if (!byFac[r.facility_id]) byFac[r.facility_id] = { id: r.facility_id, name: r.facility_name, code: r.facility_code, cells: {} };
      byFac[r.facility_id].cells[r.week_of] = r;
    });
    const f = Object.values(byFac).sort((a, b) => {
      const miss = (x) => w.filter((k) => x.cells[k] && x.cells[k].status === "missing").length;
      return miss(b) - miss(a) || a.name.localeCompare(b.name);
    });
    return { weeks: w, facilities: f };
  }, [rows]);

  const cellColor = (s) => (!s ? "transparent" : s === "submitted" ? T.teal : s === "current_week" ? T.hairline : T.alert);

  return (
    <div className="ed-card" style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
            <th className="text-left" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, padding: "10px 16px 10px 20px", position: "sticky", left: 0, background: "#F7FAFB" }}>Facility</th>
            {weeks.map((w) => (
              <th key={w} style={{ fontSize: 9.5, color: T.inkSoft, fontWeight: 500, padding: "10px 6px", whiteSpace: "nowrap" }}>{shortDay(w)}</th>
            ))}
            <th style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, padding: "10px 16px" }}>Missed</th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((f) => {
            const missed = weeks.filter((w) => f.cells[w]?.status === "missing").length;
            return (
              <tr key={f.id} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td style={{ fontSize: 13, fontWeight: 600, padding: "8px 16px 8px 20px", whiteSpace: "nowrap", position: "sticky", left: 0, background: T.panel }}>{f.name}</td>
                {weeks.map((w) => {
                  const c = f.cells[w];
                  return (
                    <td key={w} style={{ padding: "8px 6px", textAlign: "center" }}>
                      <div
                        title={c ? `${f.name} · week of ${shortDay(w)} · ${c.status.replace("_", " ")}` : "before rollout"}
                        style={{
                          width: 18, height: 18, borderRadius: 4, margin: "0 auto",
                          background: cellColor(c?.status),
                          border: c ? "none" : `1px dashed ${T.hairline}`,
                        }}
                      />
                    </td>
                  );
                })}
                <td className="ed-num" style={{ fontSize: 13, fontWeight: 600, padding: "8px 16px", color: missed > 2 ? T.alert : missed > 0 ? T.amber : T.teal }}>{missed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ————————————————————— Cross-facility comparison ————————————————————— */
function MetricComparison({ weekly, bench, medianLabel }) {
  const metrics = useMemo(() => {
    const seen = {};
    weekly.forEach((r) => { if (!seen[r.metric_key]) seen[r.metric_key] = { key: r.metric_key, label: r.metric_label, unit: r.unit, direction: r.direction, amber: r.amber, red: r.red }; });
    return Object.values(seen);
  }, [weekly]);

  const [key, setKey] = useState(null);
  const active = metrics.find((m) => m.key === key) || metrics[0];

  useEffect(() => { if (!active && metrics.length) setKey(metrics[0].key); }, [metrics.length]);
  if (!active) return null;

  const rows = weekly
    .filter((r) => r.metric_key === active.key && r.value != null)
    .map((r) => ({ name: r.facility_name, value: Number(r.value), row: r }))
    // worst first: for lower_better that's the highest value
    .sort((a, b) => (active.direction === "higher_better" ? a.value - b.value : b.value - a.value));

  const b = bench.find((x) => x.metric_key === active.key);
  const median = b?.median_value != null ? Number(b.median_value) : null;

  return (
    <>
      <div className="flex items-center gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        {metrics.map((m) => (
          <button key={m.key} onClick={() => setKey(m.key)} className="ed-ui" style={{
            fontSize: 12, padding: "6px 14px", cursor: "pointer", borderRadius: 99,
            border: `1px solid ${active.key === m.key ? T.teal : T.hairline}`,
            background: active.key === m.key ? T.teal : "transparent",
            color: active.key === m.key ? "#FFF" : T.inkSoft, fontWeight: 600,
          }}>{m.label}</button>
        ))}
      </div>

      {!rows.length ? (
        <Empty>No facility reported {active.label} this week.</Empty>
      ) : (
        <div className="ed-card p-4" style={{ height: Math.max(220, rows.length * 26 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 28, bottom: 4, left: 8 }}>
              <CartesianGrid stroke={T.hairline} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={168} interval={0} />
              <Tooltip
                cursor={{ fill: T.tealSoft }}
                content={({ active: on, payload, label }) => {
                  if (!on || !payload?.length) return null;
                  return (
                    <div className="ed-ui" style={{ background: T.ink, color: "#fff", padding: "8px 12px", fontSize: 12, borderRadius: 6 }}>
                      <div style={{ opacity: 0.7, marginBottom: 2 }}>{label}</div>
                      <div className="ed-num">{fmtValue(payload[0].value, active.unit)} {unitNote(active.unit)}</div>
                    </div>
                  );
                }}
              />
              {median != null && (
                <ReferenceLine x={median} stroke={T.ink} strokeDasharray="4 3"
                  label={{ value: `${medianLabel} ${fmtValue(median, active.unit)}`, position: "top", fontSize: 10, fill: T.ink }} />
              )}
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                {rows.map((r) => <Cell key={r.name} fill={tone(r.value, r.row)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

/* ————————————————————— Portfolio QAPI tab ————————————————————— */
export function QapiTab() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const medianLabel = isAdmin ? "Portfolio median" : "Group median";

  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState(null);
  const [startWeek, setStartWeek] = useState(null);
  const [boot, setBoot] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // which weeks exist at all
  useEffect(() => {
    (async () => {
      const [status, facs] = await Promise.all([
        supabase.from("qapi_submission_status").select("week_of").order("week_of", { ascending: false }).limit(1000),
        supabase.from("facilities").select("qapi_start_week").eq("qapi_required", true).not("qapi_start_week", "is", null).order("qapi_start_week").limit(1),
      ]);
      if (status.error) { setErr(status.error.message); setBoot(false); return; }
      const uniq = [...new Set((status.data || []).map((r) => r.week_of))];
      setWeeks(uniq);
      setWeek(uniq[0] || null);
      setStartWeek(facs.data?.[0]?.qapi_start_week || null);
      setBoot(false);
    })();
  }, []);

  // load the selected week
  useEffect(() => {
    if (!week) return;
    let dead = false;
    setLoading(true); setErr(null);
    (async () => {
      const [status, weekly, bench, flags] = await Promise.all([
        supabase.from("qapi_submission_status").select("*").order("week_of").limit(1000),
        supabase.from("qapi_weekly").select("*").eq("week_of", week).limit(1000),
        supabase.from("qapi_portfolio_benchmark").select("*").eq("week_of", week),
        supabase.from("qapi_open_flags").select("*").order("days_open", { ascending: false }).limit(200),
      ]);
      if (dead) return;
      const e = status.error || weekly.error || bench.error || flags.error;
      if (e) { setErr(e.message); setLoading(false); return; }
      setData({ status: status.data || [], weekly: weekly.data || [], bench: bench.data || [], flags: flags.data || [] });
      setLoading(false);
    })();
    return () => { dead = true; };
  }, [week]);

  if (boot) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "40px 0" }}>Loading QAPI…</div>;
  if (err) return <Empty>Couldn't load QAPI data: {err}</Empty>;

  if (!weeks.length) {
    return (
      <Empty>
        No QAPI weeks are being tracked yet.
        {startWeek
          ? <> Weekly review forms roll out the week of <strong>{longDay(startWeek)}</strong> — the compliance grid and
              facility comparisons fill in automatically from the first submission onward.</>
          : <> Set <code>qapi_start_week</code> on the facilities that hold a weekly QAPI meeting to begin tracking compliance.</>}
      </Empty>
    );
  }

  const thisWeek = (data?.status || []).filter((r) => r.week_of === week);
  const submitted = thisWeek.filter((r) => r.submitted).length;
  const expected = thisWeek.length;
  const pct = expected ? Math.round((submitted / expected) * 100) : null;
  const mdCount = thisWeek.filter((r) => r.submitted && r.md_attended).length;
  const openFlags = (data?.flags || []).length;
  const missingCensus = (data?.weekly || []).filter((r) => r.denom_basis === "missing").length;

  return (
    <>
      <div className="flex items-center gap-2" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, marginRight: 4 }}>Week of</span>
        <select value={week || ""} onChange={(e) => setWeek(e.target.value)} className="ed-ui" style={{
          fontSize: 13, padding: "8px 14px", borderRadius: 99, border: `1px solid ${T.hairline}`,
          background: "transparent", color: T.ink, fontWeight: 600, cursor: "pointer",
        }}>
          {weeks.map((w) => <option key={w} value={w}>{longDay(w)}</option>)}
        </select>
        {loading && <span style={{ fontSize: 12, color: T.inkSoft }}>Loading…</span>}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 32 }}>
        <Kpi label="Forms submitted" value={`${submitted} / ${expected}`} sub="Facilities with a QAPI meeting" good={pct === 100} />
        <Kpi label="Compliance" value={pct == null ? "—" : `${pct}%`} sub="This week" good={pct != null && pct >= 90} />
        <Kpi label="Open flags" value={openFlags} sub="Unresolved, all weeks" good={openFlags === 0} />
        <Kpi label="MD attendance" value={submitted ? `${mdCount} / ${submitted}` : "—"} sub="Of submitted meetings" good={submitted > 0 && mdCount === submitted} />
      </section>

      {missingCensus > 0 && (
        <div style={{ marginBottom: 28 }}>
          <Empty>
            {missingCensus} metric{missingCensus === 1 ? "" : "s"} this week couldn't be turned into a rate because the
            facility census was left blank on the form. Those show as “census missing” rather than a wrong number.
          </Empty>
        </div>
      )}

      <SectionLabel right="Last 12 weeks · teal submitted · red missed · grey current week">Submission compliance</SectionLabel>
      <div style={{ marginBottom: 36 }}>
        {data?.status?.length ? <ComplianceGrid rows={data.status} /> : <Empty>No compliance rows yet.</Empty>}
      </div>

      <SectionLabel right={`Week of ${longDay(week)} · worst to best`}>Facility comparison</SectionLabel>
      <div style={{ marginBottom: 36 }}>
        {data?.weekly?.length
          ? <MetricComparison weekly={data.weekly} bench={data.bench} medianLabel={medianLabel} />
          : <Empty>No submissions for the week of {longDay(week)}.</Empty>}
      </div>

      <SectionLabel right={`${openFlags} unresolved`}>Open flags</SectionLabel>
      {!data?.flags?.length ? (
        <div className="ed-card p-5" style={{ color: T.inkSoft, fontSize: 13 }}>No open flags.</div>
      ) : (
        <div className="ed-card" style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
                {["Facility", "Week", "Section", "Issue", "Owner", "Days open"].map((h) => (
                  <th key={h} className="text-left py-3" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600, paddingRight: 16, paddingLeft: h === "Facility" ? 20 : 0 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.flags.map((f) => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                  <td className="py-3 pr-4" style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 20 }}>{f.facility_name}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{shortDay(f.week_of)}</td>
                  <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{f.section}</td>
                  <td className="py-3 pr-4" style={{ fontSize: 13, maxWidth: 380 }}>{f.question}</td>
                  <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{f.owner || "—"}</td>
                  <td className="ed-num py-3 pr-4" style={{ fontSize: 13, fontWeight: 600, color: f.days_open > 14 ? T.alert : f.days_open > 7 ? T.amber : T.ink }}>{f.days_open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 16 }}>
        Rates divide by total facility census, not Spectrum census. Rehospitalization is tracked from the facility
        workbook (RTA tab), not from the QAPI form. Amber/red thresholds are provisional pending clinical review.
      </p>
    </>
  );
}
