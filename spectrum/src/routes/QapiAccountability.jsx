import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from "recharts";
import { supabase } from "../lib/supabase.js";
import { useScope } from "../lib/scope.jsx";

/* ————————————————————— Tokens (mirrors Qapi.jsx) ————————————————————— */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ————————————————————— Date helpers ————————————————————— */
const isoOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const parseIso = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const mondayOf = (s) => { const dt = parseIso(s); const off = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - off); return isoOf(dt); };
const addWeeks = (s, n) => { const dt = parseIso(s); dt.setDate(dt.getDate() + n * 7); return isoOf(dt); };
const thisMonday = () => mondayOf(isoOf(new Date()));
const shortWeek = (s) => { const d = parseIso(s); return `${MON[d.getMonth()]} ${d.getDate()}`; };
// Whole days between a week-start date and a later timestamp.
const daysBetween = (isoWeek, ts) => Math.max(0, Math.round((new Date(ts).getTime() - parseIso(isoWeek).getTime()) / 86400000));
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/* ————————————————————— Shared bits ————————————————————— */
const SectionLabel = ({ children, right }) => (
  <div className="flex items-baseline justify-between" style={{ borderBottom: `2px solid ${T.teal}`, paddingBottom: 8, marginBottom: 14 }}>
    <span className="ed-ui" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.ink, fontWeight: 800 }}>{children}</span>
    {right && <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{right}</span>}
  </div>
);
const Kpi = ({ label, value, sub, tone = "ok" }) => {
  const bar = tone === "alert" ? T.alert : tone === "watch" ? T.amber : tone === "muted" ? T.hairline : T.teal;
  const flagged = tone === "alert" || tone === "watch";
  return (
    <div className="ed-card p-5" style={{ borderTop: `3px solid ${bar}`, background: flagged ? (tone === "alert" ? "rgba(196,69,42,0.06)" : "rgba(176,124,31,0.06)") : "transparent" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div className="ed-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: tone === "muted" ? T.inkSoft : T.ink }}>{value}</div>
      <div className="ed-num" style={{ fontSize: 11.5, marginTop: 8, color: flagged ? bar : T.inkSoft }}>{sub}</div>
    </div>
  );
};
const Note = ({ children, tone = T.amber }) => (
  <div className="ed-card p-6" style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.6, borderLeft: `4px solid ${tone}` }}>
    {children}
  </div>
);
const WEEKS_BACK = 8;

/* ═══════════════════════ FLAG ACCOUNTABILITY ═══════════════════════ */
// Shifts QAPI flags from "here's what's open" to "are we closing faster than we open?"
export function FlagAccountability() {
  const { orgId, scoped } = useScope();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.from("qapi_flag_history")
      .select("facility_id, facility_name, org_id, week_of, resolved, resolved_at")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { setErr(error.message); setRows([]); return; }
        setRows(data || []);
      });
    return () => { alive = false; };
  }, []);

  const scopedRows = useMemo(
    () => (rows || []).filter((r) => !scoped || r.org_id === orgId),
    [rows, scoped, orgId]
  );

  const model = useMemo(() => {
    const weeks = [];
    for (let i = WEEKS_BACK - 1; i >= 0; i--) weeks.push(addWeeks(thisMonday(), -i));
    const openedBy = {}, closedBy = {};
    weeks.forEach((w) => { openedBy[w] = 0; closedBy[w] = 0; });

    let backlog = 0;
    const cycleTimes = [];         // days-to-close for resolved flags
    const openAges = [];           // age of still-open flags
    scopedRows.forEach((r) => {
      const rw = mondayOf(r.week_of);
      if (rw in openedBy) openedBy[rw] += 1;
      if (r.resolved && r.resolved_at) {
        const cw = mondayOf(r.resolved_at);
        if (cw in closedBy) closedBy[cw] += 1;
        cycleTimes.push(daysBetween(r.week_of, r.resolved_at));
      } else if (!r.resolved) {
        backlog += 1;
        openAges.push(daysBetween(r.week_of, isoOf(new Date())));
      }
    });

    const chart = weeks.map((w) => ({ week: shortWeek(w), opened: openedBy[w], closed: closedBy[w] }));
    const openedWin = weeks.reduce((s, w) => s + openedBy[w], 0);
    const closedWin = weeks.reduce((s, w) => s + closedBy[w], 0);
    const thisW = thisMonday();
    const resolvedThisWeek = closedBy[thisW] || 0;
    const openedThisWeek = openedBy[thisW] || 0;

    // aging buckets for the current open backlog
    const aging = {
      fresh: openAges.filter((d) => d <= 7).length,
      aging: openAges.filter((d) => d > 7 && d <= 21).length,
      stale: openAges.filter((d) => d > 21).length,
    };

    return {
      chart, backlog, openedWin, closedWin, resolvedThisWeek, openedThisWeek,
      net: openedWin - closedWin,
      medianClose: median(cycleTimes),
      resolvedCount: cycleTimes.length,
      aging,
      oldestOpen: openAges.length ? Math.max(...openAges) : null,
    };
  }, [scopedRows]);

  if (rows === null) return <div style={{ color: T.inkSoft, fontSize: 13, padding: "20px 0" }}>Loading flag accountability…</div>;
  if (err) return <Note tone={T.alert}>Couldn't load flag history: {err}</Note>;

  return (
    <div style={{ marginTop: 36 }}>
      <SectionLabel right={`Last ${WEEKS_BACK} weeks`}>Flag accountability</SectionLabel>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 20 }}>
        <Kpi
          label="Open backlog"
          value={model.backlog}
          sub={model.oldestOpen != null ? `Oldest ${model.oldestOpen} days` : "Nothing open"}
          tone={model.backlog === 0 ? "ok" : model.oldestOpen > 21 ? "alert" : "watch"}
        />
        <Kpi
          label="Resolved this week"
          value={model.resolvedThisWeek}
          sub={`${model.openedThisWeek} opened this week`}
          tone={model.resolvedThisWeek >= model.openedThisWeek ? "ok" : "watch"}
        />
        <Kpi
          label="Opened vs closed"
          value={`${model.openedWin} / ${model.closedWin}`}
          sub={model.net > 0 ? `Backlog grew by ${model.net}` : model.net < 0 ? `Backlog shrank by ${-model.net}` : "Held even"}
          tone={model.net > 0 ? "watch" : "ok"}
        />
        <Kpi
          label="Median time to close"
          value={model.medianClose == null ? "—" : `${model.medianClose}d`}
          sub={model.resolvedCount ? `${model.resolvedCount} resolved` : "None resolved yet"}
          tone={model.medianClose == null ? "muted" : model.medianClose > 21 ? "alert" : model.medianClose > 7 ? "watch" : "ok"}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 8, fontWeight: 600 }}>Opened vs closed by week</div>
          <div className="ed-card p-4" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={model.chart} margin={{ top: 8, right: 10, bottom: 0, left: -8 }} barGap={2}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10.5, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: T.tealSoft }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="ed-ui" style={{ background: T.ink, color: "#fff", padding: "8px 12px", fontSize: 12, borderRadius: 6 }}>
                        <div style={{ opacity: 0.7, marginBottom: 3 }}>Week of {label}</div>
                        {payload.map((p) => <div key={p.dataKey} className="ed-num">{p.name}: {p.value}</div>)}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="opened" name="Opened" fill={T.amber} radius={[3, 3, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill={T.teal} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 8, fontWeight: 600 }}>Open backlog by age</div>
          <div className="ed-card p-5" style={{ height: 250, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            {[
              { key: "fresh", label: "0–7 days", tone: T.teal, glyph: "●", n: model.aging.fresh },
              { key: "aging", label: "8–21 days", tone: T.amber, glyph: "◆", n: model.aging.aging },
              { key: "stale", label: "Over 21 days", tone: T.alert, glyph: "▲", n: model.aging.stale },
            ].map((b) => {
              const pct = model.backlog ? Math.round((b.n / model.backlog) * 100) : 0;
              return (
                <div key={b.key}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: T.ink }}>
                      <span aria-hidden style={{ color: b.tone, marginRight: 6 }}>{b.glyph}</span>{b.label}
                    </span>
                    <span className="ed-num" style={{ fontSize: 13, fontWeight: 600, color: b.n ? b.tone : T.inkSoft }}>{b.n}</span>
                  </div>
                  <div style={{ height: 8, background: T.hairline, borderRadius: 4 }}>
                    <div style={{ height: 8, width: `${pct}%`, background: b.tone, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            {model.backlog === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, textAlign: "center" }}>No open items — nothing aging.</div>}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
        "Opened" counts flags raised in a weekly review; "closed" counts flags marked resolved that week. When the amber
        bars run taller than the teal over several weeks, the backlog is growing faster than it's being worked. Time-to-close
        is measured from the review week to the resolve date{scoped ? " for this client's facilities" : " across the portfolio"}.
      </p>
    </div>
  );
}
