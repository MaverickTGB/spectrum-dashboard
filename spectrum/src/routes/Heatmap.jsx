import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

/* ————————————————————— Tokens (mirrors Executive.jsx) ————————————————————— */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};

/* ————————————————————— Date + format helpers ————————————————————— */
const isoOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const parseIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const mondayOf = (s) => { const dt = parseIso(s); const off = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - off); return isoOf(dt); };
const addWeeks = (s, n) => { const dt = parseIso(s); dt.setDate(dt.getDate() + n * 7); return isoOf(dt); };
const thisMonday = () => mondayOf(isoOf(new Date()));
const n1 = (v) => (v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }));

/* ————————————————————— Status logic ————————————————————— */
// Threshold colour against a metric_thresholds-style row. No row / no amber => neutral ink.
const toneFrom = (v, th) => {
  if (v == null || !th || th.amber == null) return T.ink;
  const val = Number(v);
  if (th.direction === "higher_better") return val <= Number(th.red) ? T.alert : val <= Number(th.amber) ? T.amber : T.teal;
  return val >= Number(th.red) ? T.alert : val >= Number(th.amber) ? T.amber : T.teal;
};
const starTone = (n) => (n == null ? T.hairline : n >= 4 ? T.teal : n >= 3 ? T.amber : T.alert);

// Colour + shape + number = triple encoding, so status survives colourblindness / greyscale.
const glyphFor = (tone) =>
  tone === T.teal ? "●" : tone === T.amber ? "◆" : tone === T.alert ? "▲" : "·";
const weightFor = (tone) => (tone === T.alert ? 2 : tone === T.amber ? 1 : 0);

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
const Th = ({ children, first }) => (
  <th className="text-left py-3" style={{
    fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft,
    fontWeight: 600, padding: "12px 8px", textAlign: first ? "left" : "center", paddingLeft: first ? 20 : 8,
  }}>{children}</th>
);
// A single heatmap cell: glyph + value, coloured by tone, click drills to the facility.
const Cell = ({ tone, value, onClick, title }) => (
  <td onClick={onClick} title={title} className="ed-num" style={{
    padding: "9px 8px", cursor: onClick ? "pointer" : "default", textAlign: "center",
    borderLeft: `1px solid ${T.hairline}`,
    background: tone === T.alert ? "rgba(196,69,42,0.06)" : tone === T.amber ? "rgba(176,124,31,0.06)" : "transparent",
  }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span aria-hidden style={{ color: tone, fontSize: 12, lineHeight: 1 }}>{glyphFor(tone)}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: tone === T.ink ? T.inkSoft : tone === T.hairline ? T.inkSoft : tone }}>{value}</span>
    </div>
  </td>
);

/* ————————————————————— Column definitions ————————————————————— */
// Each returns { tone, value, title } for a facility row. Kept declarative so
// adding a dimension is one entry, not a table rewrite.
const COLUMNS = [
  {
    key: "capture", label: "Capture",
    compute: (f, ctx) => {
      const cap = f.building ? Math.round((f.census / f.building) * 100) : null;
      if (cap == null) return { tone: f.census == null ? T.hairline : T.ink, value: f.census == null ? "—" : n1(f.census), title: "No building census this month" };
      return { tone: toneFrom(cap, ctx.th["growth.capture"]), value: `${cap}%`, title: `${n1(f.census)} of ${n1(f.building)} building patients on service` };
    },
  },
  {
    key: "growth", label: "Growth gap",
    compute: (f, ctx) => {
      if (f.opp == null) return { tone: T.hairline, value: "—", title: "No growth data this month" };
      return { tone: toneFrom(f.opp, ctx.th["growth.opportunity_pct"]), value: `${f.opp}%`, title: `${Math.round(f.nonSpec)} non-Spectrum patients in building` };
    },
  },
  {
    key: "rta", label: "RTA",
    compute: (f, ctx) => {
      const r = f.rta?.snfRate;
      if (r == null) return { tone: T.hairline, value: "—", title: "No return-to-acute data this month" };
      return { tone: toneFrom(r, ctx.th["rta.snf"]), value: `${r.toFixed(1)}%`, title: `SNF RTA ${r.toFixed(1)}% (${f.rta.rtas ?? "—"} of ${f.rta.admits ?? "—"})` };
    },
  },
  {
    key: "qapi", label: "QAPI",
    compute: (f, ctx) => {
      const q = ctx.qapi[f.facility_id];
      if (!q) return { tone: T.hairline, value: "—", title: "Not in QAPI rollout / no submissions" };
      if (!q.latestSubmitted) return { tone: T.alert, value: "missed", title: `No submission for week of ${q.latestWeek}` };
      if (q.openFlags > 0) return { tone: T.amber, value: `${q.openFlags} open`, title: `${q.openFlags} open item(s)` };
      return { tone: T.teal, value: "clear", title: "Submitted, no open items" };
    },
  },
  {
    key: "cms", label: "CMS",
    compute: (f) => {
      const n = f.cms?.overall_rating;
      if (n == null) return { tone: T.hairline, value: "—", title: f.ccn ? "CMS data not loaded" : "No CCN on file" };
      return { tone: starTone(n), value: `${n}★`, title: `CMS overall ${n} of 5 stars` };
    },
  },
  {
    key: "compliance", label: "Compliance",
    compute: (f, ctx) => {
      const q = ctx.qapi[f.facility_id];
      if (!q || q.due === 0) return { tone: T.hairline, value: "—", title: "No weeks in the compliance window yet" };
      const ratio = q.submitted / q.due;
      const tone = ratio >= 1 ? T.teal : ratio > 0 ? T.amber : T.alert;
      return { tone, value: `${q.submitted}/${q.due}`, title: `${q.submitted} of ${q.due} recent weeks submitted` };
    },
  },
];

/* ═══════════════════════ HEATMAP TAB ═══════════════════════ */
export function HeatmapTab({ data, month, goToFacility }) {
  const [qapi, setQapi] = useState(null);   // facility_id -> { latestWeek, latestSubmitted, openFlags, submitted, due }
  const [qErr, setQErr] = useState(null);

  // QAPI + compliance signals are week-based, so this tab fetches them itself
  // (independent of the monthly `data` the rest of the dashboard runs on).
  useEffect(() => {
    let alive = true;
    const since = addWeeks(thisMonday(), -5);
    Promise.all([
      supabase.from("qapi_submission_status")
        .select("facility_id, week_of, submitted")
        .gte("week_of", since).order("week_of", { ascending: false }),
      supabase.from("qapi_open_flags").select("facility_id, id"),
    ]).then(([s, g]) => {
      if (!alive) return;
      if (s.error || g.error) { setQErr((s.error || g.error).message); setQapi({}); return; }
      const openByFac = {};
      (g.data || []).forEach((r) => { openByFac[r.facility_id] = (openByFac[r.facility_id] || 0) + 1; });
      const byFac = {};
      (s.data || []).forEach((r) => {
        const o = byFac[r.facility_id] || (byFac[r.facility_id] = { latestWeek: null, latestSubmitted: false, submitted: 0, due: 0 });
        o.due += 1;
        if (r.submitted) o.submitted += 1;
        if (!o.latestWeek) { o.latestWeek = r.week_of; o.latestSubmitted = !!r.submitted; } // rows are week-desc, so first = latest
      });
      Object.keys(byFac).forEach((id) => { byFac[id].openFlags = openByFac[id] || 0; });
      setQapi(byFac);
    });
    return () => { alive = false; };
  }, []);

  const facilities = data?.facilities || [];
  const th = data?.thresholds || {};

  // Build one scored row per facility, then float the worst to the top — that's
  // the triage value: a CEO scanning 30 buildings sees where to look first.
  const rows = useMemo(() => {
    const ctx = { th, qapi: qapi || {} };
    return facilities
      .map((f) => {
        const cells = COLUMNS.map((c) => ({ key: c.key, ...c.compute(f, ctx) }));
        const severity = cells.reduce((s, c) => s + weightFor(c.tone), 0);
        const reds = cells.filter((c) => c.tone === T.alert).length;
        const worst = cells.reduce((w, c) => Math.max(w, weightFor(c.tone)), 0);
        return { f, cells, severity, reds, worst };
      })
      .sort((a, b) => b.severity - a.severity || b.reds - a.reds || a.f.name.localeCompare(b.f.name));
  }, [facilities, th, qapi]);

  const needAttention = rows.filter((r) => r.reds > 0).length;
  const totalReds = rows.reduce((s, r) => s + r.reds, 0);
  const capVals = facilities.map((f) => (f.building ? (f.census / f.building) * 100 : null)).filter((v) => v != null);
  const avgCapture = capVals.length ? Math.round((capVals.reduce((s, v) => s + v, 0) / capVals.length) * 10) / 10 : null;
  const qSubmitted = qapi ? Object.values(qapi).filter((q) => q.latestSubmitted).length : 0;
  const qDue = qapi ? Object.values(qapi).length : 0;

  if (!data) return <Note tone={T.teal}>No monthly data loaded yet.</Note>;
  if (qapi === null) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "40px 0" }}>Loading portfolio heatmap…</div>;

  return (
    <>
      <div className="vm-secbar"><span className="vm-tick2" /><h2>Portfolio heatmap</h2><span className="vm-secright">{facilities.length} facilities · {month ? month.slice(0, 7) : ""}</span></div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
        <Kpi label="Need attention" value={needAttention} sub="Facilities red on ≥1 metric" good={needAttention === 0} />
        <Kpi label="Red cells" value={totalReds} sub="Across all dimensions" good={totalReds === 0} />
        <Kpi label="Avg capture" value={avgCapture == null ? "—" : `${avgCapture}%`} sub={`${facilities.length} facilities`} />
        <Kpi label="QAPI submitted" value={qDue ? `${qSubmitted} / ${qDue}` : "—"} sub="Latest weekly review" good={qDue > 0 && qSubmitted === qDue} />
      </section>

      <SectionLabel right={`${facilities.length} facilities · worst first`}>Portfolio health heatmap</SectionLabel>

      {qErr && <div style={{ marginBottom: 12 }}><Note tone={T.amber}>QAPI signals unavailable ({qErr}); those columns show as no-data.</Note></div>}

      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              <Th first>Facility</Th>
              {COLUMNS.map((c) => <Th key={c.key}>{c.label}</Th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ f, cells, worst }) => (
              <tr key={f.facility_id} className="ed-row" style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td
                  onClick={() => goToFacility && goToFacility(f.name)}
                  className="py-3 pr-4"
                  style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 16, cursor: goToFacility ? "pointer" : "default",
                    borderLeft: `4px solid ${worst === 2 ? T.alert : worst === 1 ? T.amber : T.teal}` }}
                  title="Open facility detail"
                >
                  {f.name}
                </td>
                {cells.map((c) => (
                  <Cell key={c.key} tone={c.tone} value={c.value} title={c.title}
                    onClick={goToFacility ? () => goToFacility(f.name) : undefined} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4" style={{ marginTop: 14, fontSize: 12, color: T.inkSoft }}>
        <span><span style={{ color: T.teal }}>●</span> On track</span>
        <span><span style={{ color: T.amber }}>◆</span> Watch</span>
        <span><span style={{ color: T.alert }}>▲</span> Action needed</span>
        <span><span style={{ color: T.inkSoft }}>·</span> No data</span>
        <span style={{ marginLeft: "auto" }}>Click any cell to open the facility.</span>
      </div>

      <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
        Rows are sorted worst-first by how many dimensions are amber or red, so the buildings that need
        attention float to the top. Capture, growth, and RTA reflect {month ? month.slice(0, 7) : "the selected month"};
        QAPI and compliance reflect the most recent weekly review. Thresholds are still provisional and pending
        clinical review — treat colour as a prompt to look, not a verdict.
      </p>
    </>
  );
}
