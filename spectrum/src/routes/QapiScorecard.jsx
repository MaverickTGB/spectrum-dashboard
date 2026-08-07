// QapiScorecard.jsx
// Org rollup: one row per facility, one column per scored metric, newest week.
// Click a facility to expand its full metric detail inline.
//
// Reads two views:
//   qapi_submission_status — every expected week per facility, with submitted /
//     excused / current_week / missing and weeks_ago. This is what makes a blank
//     cell legible: "due today" and "three weeks silent" look identical without it.
//   qapi_weekly — the actual metric values, already rate-converted against total
//     facility census (never Spectrum-only census).
//
// Both views are security_invoker, so a partner session sees only its own org.
// The scope filter below is a presentation control layered on top for admins
// running a client view — not a security boundary.
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useScope } from "../lib/scope.jsx";

const T = {
  ink: "#132A2E", inkSoft: "#5C7276", panel: "#FFFFFF", mist: "#F2F6F7",
  teal: "#0E7C86", tealSoft: "#E4F1F2", hairline: "#DCE7E9",
  amber: "#B07C1F", amberSoft: "#FBF3E2", alert: "#C4452A", alertSoft: "#FBEEEB",
  slate: "#6b7280", slateSoft: "#F3F4F6",
};

const REASONS = {
  state_survey: "State survey",
  leadership_absence: "DON / Administrator out",
  holiday: "Holiday",
  combined_with_adjacent_week: "Combined with adjacent week",
  other: "Other",
};

const box = {
  background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 10,
};
const th = {
  textAlign: "left", padding: "9px 10px", fontSize: 10.5, textTransform: "uppercase",
  letterSpacing: ".06em", color: T.inkSoft, fontWeight: 700,
  borderBottom: `1px solid ${T.hairline}`, whiteSpace: "nowrap",
};
const td = { padding: "10px", borderBottom: `1px solid ${T.hairline}`, verticalAlign: "middle" };
const pill = (bg, fg) => ({
  display: "inline-block", padding: "2px 9px", borderRadius: 999,
  background: bg, color: fg, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
});

/* Threshold colouring. Every metric in qapi_metrics is lower_better today, but
   direction is honoured rather than assumed — a future "MD attendance %" style
   metric would invert. A metric with no amber/red bands is tracked, not scored,
   and renders uncoloured on purpose. */
function tone(value, m) {
  if (value == null || m?.amber == null || m?.red == null) return null;
  const v = Number(value), amber = Number(m.amber), red = Number(m.red);
  if (m.direction === "higher_better") {
    if (v <= red) return "red";
    if (v <= amber) return "amber";
    return "good";
  }
  if (v >= red) return "red";
  if (v >= amber) return "amber";
  return "good";
}
const toneStyle = {
  red: { bg: T.alertSoft, fg: T.alert },
  amber: { bg: T.amberSoft, fg: T.amber },
  good: { bg: T.tealSoft, fg: T.teal },
};

const fmtWeek = (w) => {
  if (!w) return "—";
  const [y, m, d] = w.split("-");
  return `${+m}/${+d}`;
};
const fmtVal = (v, unit) => {
  if (v == null) return "—";
  return unit === "count" ? String(v) : `${v}%`;
};

export default function QapiScorecard() {
  const { orgId, scoped, orgName } = useScope();
  const [statusRows, setStatusRows] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null); // expanded facility_id

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      const [{ data: st, error: sErr }, { data: wk, error: wErr }] = await Promise.all([
        supabase.from("qapi_submission_status")
          .select("facility_id, facility_name, facility_code, org_id, week_of, status, exception_reason, exception_note, weeks_ago, flag_count")
          .order("week_of", { ascending: false }),
        supabase.from("qapi_weekly")
          .select("facility_id, facility_name, org_id, week_of, metric_key, metric_label, section, unit, direction, value, target, amber, red, benchmark_national, provisional")
          .order("week_of", { ascending: false }),
      ]);
      if (!alive) return;
      if (sErr || wErr) setErr((sErr || wErr).message);
      setStatusRows(st || []);
      setWeekly(wk || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const scopedStatus = useMemo(
    () => (orgId == null ? statusRows : statusRows.filter((r) => r.org_id === orgId)),
    [statusRows, orgId]
  );
  const scopedWeekly = useMemo(
    () => (orgId == null ? weekly : weekly.filter((r) => r.org_id === orgId)),
    [weekly, orgId]
  );

  /* Column set comes from the data, ordered by first appearance in qapi_weekly
     (which the view already returns in metric sort_order). Metrics nobody has
     submitted yet simply don't get a column, so the grid never renders a
     permanently empty stripe. */
  const metrics = useMemo(() => {
    const seen = new Map();
    scopedWeekly.forEach((r) => {
      if (!seen.has(r.metric_key)) {
        seen.set(r.metric_key, {
          key: r.metric_key, label: r.metric_label, unit: r.unit,
          direction: r.direction, target: r.target, amber: r.amber, red: r.red,
          benchmark_national: r.benchmark_national, provisional: r.provisional,
          section: r.section,
        });
      }
    });
    return [...seen.values()];
  }, [scopedWeekly]);

  /* One row per facility: current-week status, the newest week that actually has
     values, and that week's metric map. */
  const rows = useMemo(() => {
    const byFac = new Map();
    scopedStatus.forEach((r) => {
      if (!byFac.has(r.facility_id)) {
        byFac.set(r.facility_id, {
          facility_id: r.facility_id, name: r.facility_name, code: r.facility_code,
          weeks: [],
        });
      }
      byFac.get(r.facility_id).weeks.push(r);
    });

    return [...byFac.values()].map((f) => {
      const current = f.weeks.find((w) => w.weeks_ago === 0) || null;
      const lastActive = f.weeks.find((w) => w.status === "submitted" || w.status === "excused") || null;
      const facWeekly = scopedWeekly.filter((w) => w.facility_id === f.facility_id);
      const newestWeek = facWeekly.length ? facWeekly[0].week_of : null;
      const values = {};
      facWeekly.filter((w) => w.week_of === newestWeek).forEach((w) => { values[w.metric_key] = w; });
      return { ...f, current, lastActive, newestWeek, values, flagCount: lastActive?.flag_count ?? null };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedStatus, scopedWeekly]);

  const hasProvisional = metrics.some((m) => m.provisional);

  if (loading) return <div style={{ ...box, padding: 18, color: T.inkSoft, fontSize: 13 }}>Loading scorecard…</div>;
  if (err) return <div style={{ ...box, padding: 18, borderColor: T.alert, color: T.alert, fontSize: 13 }}>Couldn't load the scorecard: {err}</div>;
  if (!rows.length)
    return (
      <div style={{ ...box, padding: 18, color: T.inkSoft, fontSize: 13 }}>
        No facilities are enrolled in weekly QAPI{scoped ? ` for ${orgName}` : ""} yet.
      </div>
    );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: T.ink, margin: 0 }}>
          Weekly QAPI scorecard{scoped ? ` — ${orgName}` : ""}
        </h2>
        <span style={{ fontSize: 12.5, color: T.inkSoft }}>
          Most recent submitted week per facility. Click a facility for full detail.
        </span>
      </div>

      <div style={{ ...box, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, position: "sticky", left: 0, background: T.panel }}>Facility</th>
              <th style={th}>This week</th>
              <th style={th}>Week</th>
              {metrics.map((m) => (
                <th key={m.key} style={th} title={m.label}>
                  {m.label}{m.provisional ? " *" : ""}
                </th>
              ))}
              <th style={th}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = open === r.facility_id;
              return (
                <React.Fragment key={r.facility_id}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : r.facility_id)}
                    style={{ cursor: "pointer", background: isOpen ? T.mist : "transparent" }}
                  >
                    <td style={{ ...td, fontWeight: 600, position: "sticky", left: 0, background: isOpen ? T.mist : T.panel }}>
                      <span style={{ color: T.inkSoft, marginRight: 6, fontSize: 11 }}>{isOpen ? "▾" : "▸"}</span>
                      {r.name}
                    </td>
                    <td style={td}><StatusPill row={r} /></td>
                    <td style={{ ...td, color: T.inkSoft, whiteSpace: "nowrap" }}>{fmtWeek(r.newestWeek)}</td>
                    {metrics.map((m) => {
                      const cell = r.values[m.key];
                      const t = tone(cell?.value, m);
                      return (
                        <td key={m.key} style={td}>
                          {cell?.value == null ? (
                            <span style={{ color: T.hairline }}>—</span>
                          ) : t ? (
                            <span style={pill(toneStyle[t].bg, toneStyle[t].fg)}>{fmtVal(cell.value, m.unit)}</span>
                          ) : (
                            <span style={{ color: T.ink }}>{fmtVal(cell.value, m.unit)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={td}>
                      {r.flagCount == null ? <span style={{ color: T.hairline }}>—</span>
                        : r.flagCount > 0
                          ? <span style={pill(T.amberSoft, T.amber)}>{r.flagCount}</span>
                          : <span style={{ color: T.inkSoft }}>0</span>}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={metrics.length + 4} style={{ ...td, background: T.mist, padding: 0 }}>
                        <FacilityDetail row={r} metrics={metrics} weekly={scopedWeekly} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
        Rates are the week's count divided by total building census, so they include
        residents who aren't Spectrum-managed. A dash means no value was submitted for
        that metric.
        {hasProvisional && (
          <>
            {" "}Metrics marked <strong>*</strong> use provisional colour thresholds pending
            clinical review; treat the number as reliable and the colour as indicative.
          </>
        )}
      </p>
    </div>
  );
}

/* Current-week state. The distinction that matters: a facility whose meeting is
   today is not behind, and a week skipped for survey is not a miss. */
function StatusPill({ row }) {
  const c = row.current;
  if (!c) return <span style={{ color: T.hairline }}>—</span>;

  if (c.status === "submitted") return <span style={pill(T.tealSoft, T.teal)}>Submitted</span>;

  if (c.status === "excused")
    return (
      <span style={pill(T.slateSoft, T.slate)} title={c.exception_note || ""}>
        Excused · {REASONS[c.exception_reason] || c.exception_reason}
      </span>
    );

  // Current week, nothing filed yet. How concerning depends on the gap behind it.
  const gap = row.lastActive ? row.lastActive.weeks_ago : null;
  if (gap == null) return <span style={pill(T.slateSoft, T.slate)}>Not started</span>;
  if (gap <= 1) return <span style={pill(T.slateSoft, T.slate)}>Due this week</span>;
  return <span style={pill(T.amberSoft, T.amber)}>{gap} weeks since last</span>;
}

/* Expanded detail: every metric for the newest week with its target and national
   benchmark, plus the recent week-by-week history so a single reading isn't
   mistaken for a trend. */
function FacilityDetail({ row, metrics, weekly }) {
  const facWeekly = useMemo(
    () => weekly.filter((w) => w.facility_id === row.facility_id),
    [weekly, row.facility_id]
  );
  const weeks = useMemo(
    () => [...new Set(facWeekly.map((w) => w.week_of))].sort().reverse().slice(0, 6),
    [facWeekly]
  );

  if (!weeks.length)
    return (
      <div style={{ padding: 16, fontSize: 13, color: T.inkSoft }}>
        No submissions recorded for {row.name} yet. Once the first week is filed it will
        appear here with its history.
      </div>
    );

  const newest = weeks[0];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
        {row.name} — week of {newest}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: T.panel }}>
          <thead>
            <tr>
              <th style={th}>Metric</th>
              <th style={th}>Current</th>
              <th style={th}>Target</th>
              <th style={th}>National</th>
              {weeks.slice(1).map((w) => <th key={w} style={th}>{fmtWeek(w)}</th>)}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const cur = facWeekly.find((w) => w.week_of === newest && w.metric_key === m.key);
              const t = tone(cur?.value, m);
              return (
                <tr key={m.key}>
                  <td style={td}>{m.label}{m.provisional ? " *" : ""}</td>
                  <td style={td}>
                    {cur?.value == null ? <span style={{ color: T.hairline }}>—</span>
                      : t ? <span style={pill(toneStyle[t].bg, toneStyle[t].fg)}>{fmtVal(cur.value, m.unit)}</span>
                        : fmtVal(cur.value, m.unit)}
                  </td>
                  <td style={{ ...td, color: T.inkSoft }}>
                    {m.target == null ? "—" : fmtVal(m.target, m.unit)}
                  </td>
                  <td style={{ ...td, color: T.inkSoft }}>
                    {m.benchmark_national == null ? "—" : fmtVal(m.benchmark_national, m.unit)}
                  </td>
                  {weeks.slice(1).map((w) => {
                    const cell = facWeekly.find((x) => x.week_of === w && x.metric_key === m.key);
                    return (
                      <td key={w} style={{ ...td, color: T.inkSoft }}>
                        {cell?.value == null ? "—" : fmtVal(cell.value, m.unit)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {weeks.length < 3 && (
        <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 8, marginBottom: 0 }}>
          Fewer than three weeks recorded, so week-to-week movement here isn't yet a trend.
        </p>
      )}
    </div>
  );
}
