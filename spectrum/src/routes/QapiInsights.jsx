import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { supabase } from "../lib/supabase.js";

/* ————————————————————— Tokens (mirrors Qapi.jsx) ————————————————————— */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const isoOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

const parseIso = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const mondayOf = (s) => {
  const dt = parseIso(s);
  const offset = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - offset);
  return isoOf(dt);
};

const addWeeks = (s, n) => {
  const dt = parseIso(s);
  dt.setDate(dt.getDate() + n * 7);
  return isoOf(dt);
};

const thisMonday = () => mondayOf(isoOf(new Date()));

const shortWeek = (s) => {
  const d = parseIso(s);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
};

const longDate = (s) => {
  if (!s) return "—";
  const d = parseIso(s);
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const daysSince = (s) => Math.max(0, Math.round((new Date() - parseIso(s)) / 86400000));

const fmtValue = (v, unit) => {
  if (v == null) return "—";
  const n = Number(v);
  if (unit === "count") return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (unit === "percent_of_census") return `${n.toFixed(1)}%`;
  return n.toFixed(2);
};

const toneFor = (v, m) => {
  if (v == null || !m || m.amber == null) return T.ink;
  const val = Number(v);
  if (m.direction === "higher_better") {
    return val <= Number(m.red) ? T.alert : val <= Number(m.amber) ? T.amber : T.teal;
  }
  return val >= Number(m.red) ? T.alert : val >= Number(m.amber) ? T.amber : T.teal;
};

const ROLLING_WEEKS = 4;

/* ————————————————————— Shared bits ————————————————————— */
const SectionLabel = ({ children, right }) => (
  <div className="flex items-baseline justify-between" style={{ borderBottom: `2px solid ${T.teal}`, paddingBottom: 8, marginBottom: 14 }}>
    <span className="ed-ui" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.ink, fontWeight: 800 }}>{children}</span>
    {right && <span className="ed-num" style={{ fontSize: 11, color: T.inkSoft }}>{right}</span>}
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
    fontWeight: 600, paddingRight: 16, paddingLeft: first ? 20 : 0,
  }}>{children}</th>
);

const Chip = ({ label, tone = T.inkSoft, bg = "transparent" }) => (
  <span className="ed-ui" style={{
    fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700,
    color: tone, background: bg, border: `1px solid ${tone}33`,
    padding: "2px 7px", borderRadius: 99, whiteSpace: "nowrap",
  }}>{label}</span>
);

/* ═══════════════════════ 1 · METRIC TREND ═══════════════════════
   Plots the weekly value faintly and the 4-week rolling rate solid.
   The rolling line is the one to read; the weekly dots are there so
   nobody wonders where the smoothing came from.                    */

const MIN_TREND_WEEKS = 3;

export function MetricTrend({ rows = [], metrics = [], weeks = [] }) {
  const [key, setKey] = useState(null);
  useEffect(() => {
    if (!key && metrics.length) setKey(metrics[0].key);
  }, [metrics, key]);

  const sel = metrics.find((m) => m.key === key) || null;
  const asc = useMemo(() => [...weeks].sort(), [weeks]);

  const series = useMemo(() => {
    if (!sel) return [];
    const isCount = sel.unit === "count";
    return asc.map((w, i) => {
      const r = rows.find((x) => x.week_of === w && x.metric_key === sel.key);
      const weekly = isCount
        ? (r?.numerator == null ? null : Number(r.numerator))
        : (r && r.denom_basis !== "missing" && r.value != null ? Number(r.value) : null);

      let num = 0, den = 0, used = 0, cnt = 0;
      for (let k = Math.max(0, i - (ROLLING_WEEKS - 1)); k <= i; k++) {
        const rr = rows.find((x) => x.week_of === asc[k] && x.metric_key === sel.key);
        if (!rr || rr.numerator == null) continue;
        if (isCount) { cnt += Number(rr.numerator); used += 1; continue; }
        if (rr.denominator == null || rr.denom_basis === "missing") continue;
        num += Number(rr.numerator); den += Number(rr.denominator); used += 1;
      }
      let rolling = null;
      if (isCount && used >= 2) rolling = Math.round((cnt / used) * 100) / 100;
      else if (!isCount && used >= 2 && den) {
        const v = sel.unit === "percent_of_census" ? (num * 100) / den : (num * 1000) / den;
        rolling = Math.round(v * 100) / 100;
      }

      return {
        week: w, label: shortWeek(w), weekly, rolling,
        count: r?.numerator == null ? null : Number(r.numerator),
        census: r?.denominator == null ? null : Number(r.denominator),
        weeksUsed: used,
      };
    });
  }, [rows, asc, sel]);

  const withData = series.filter((s) => s.weekly != null).length;

  if (!metrics.length) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <SectionLabel right={withData ? `${withData} week${withData === 1 ? "" : "s"} of data` : "No data yet"}>
        Trend
      </SectionLabel>

      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 14 }}>
        {metrics.map((m) => (
          <button key={m.key} onClick={() => setKey(m.key)} className="ed-ui" style={{
            fontSize: 12, padding: "6px 13px", cursor: "pointer", borderRadius: 99,
            border: `1px solid ${key === m.key ? T.teal : T.hairline}`,
            background: key === m.key ? T.teal : "transparent",
            color: key === m.key ? "#FFF" : T.inkSoft, fontWeight: 600,
          }}>{m.label}</button>
        ))}
      </div>

      {withData < MIN_TREND_WEEKS ? (
        <Note>
          A trend needs at least {MIN_TREND_WEEKS} weeks before it means anything — there
          {withData === 1 ? " is 1 week" : ` are ${withData} weeks`} so far. In a building this size a
          single event moves the weekly rate a long way, so the line would be noise rather than direction.
        </Note>
      ) : (
        <>
          <div className="ed-card p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={T.hairline} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.hairline }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="ed-ui" style={{ background: T.ink, color: "#fff", padding: "9px 12px", fontSize: 12, borderRadius: 6 }}>
                        <div style={{ opacity: 0.7, marginBottom: 4 }}>Week of {label}</div>
                        <div className="ed-num">This week: {fmtValue(d.weekly, sel?.unit)}</div>
                        <div className="ed-num">{ROLLING_WEEKS}-week: {fmtValue(d.rolling, sel?.unit)}
                          {d.weeksUsed < ROLLING_WEEKS && <span style={{ opacity: 0.7 }}> ({d.weeksUsed}w)</span>}
                        </div>
                        {d.count != null && (
                          <div className="ed-num" style={{ opacity: 0.75, marginTop: 3 }}>
                            {d.count.toLocaleString()}{d.census != null ? ` of ${d.census.toLocaleString()} residents` : ""}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {sel?.target != null && sel.unit !== "count" && (
                  <ReferenceLine y={Number(sel.target)} stroke={T.teal} strokeDasharray="6 3"
                    label={{ value: "goal", position: "right", fill: T.teal, fontSize: 10 }} />
                )}
                {sel?.amber != null && sel.unit !== "count" && (
                  <ReferenceLine y={Number(sel.amber)} stroke={T.amber} strokeDasharray="3 3"
                    label={{ value: "watch", position: "right", fill: T.amber, fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="weekly" name="This week" stroke={T.inkSoft} strokeWidth={1}
                  strokeDasharray="3 3" dot={{ r: 2.5, fill: T.inkSoft }} connectNulls />
                <Line type="monotone" dataKey="rolling" name={`${ROLLING_WEEKS}-week`} stroke={T.teal}
                  strokeWidth={2.6} dot={{ r: 3, fill: T.teal }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
            Solid line is the {ROLLING_WEEKS}-week rolling rate — read that one. The dotted line is the raw
            weekly value, shown so the smoothing is visible rather than hidden. Weeks with no census reported
            are skipped rather than counted as zero.
          </p>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ 2 · FLAG DETAIL ═══════════════════════
   Every flagged question for this facility, open or closed. Click a
   row to see the answer given and every week it has come up.        */

const RECUR_WEEKS = 3;

export function FlagHistory({ facilityId }) {
  const [flags, setFlags] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!facilityId) return;
    let alive = true;
    setLoading(true); setErr(null);
    supabase.from("qapi_flags")
      .select("id, week_of, section, item_id, question, answer, owner, resolved, resolved_at")
      .eq("facility_id", facilityId)
      .gte("week_of", addWeeks(thisMonday(), -25))
      .order("week_of", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr(error.message); else setFlags(data || []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [facilityId]);

  // How many distinct weeks has each question been raised?
  const recurrence = useMemo(() => {
    const m = {};
    flags.forEach((f) => {
      const k = f.question || "";
      (m[k] = m[k] || new Set()).add(f.week_of);
    });
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.size]));
  }, [flags]);

  const visible = useMemo(
    () => flags.filter((f) => (showAll ? true : !f.resolved)),
    [flags, showAll]
  );

  const openCount = flags.filter((f) => !f.resolved).length;

  async function resolve(id) {
    setBusy(id);
    const now = new Date().toISOString();
    const { error } = await supabase.from("qapi_flags")
      .update({ resolved: true, resolved_at: now }).eq("id", id);
    if (!error) {
      setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: true, resolved_at: now } : f)));
    } else {
      setErr(error.message);
    }
    setBusy(null);
  }

  async function reopen(id) {
    setBusy(id);
    const { error } = await supabase.from("qapi_flags")
      .update({ resolved: false, resolved_at: null }).eq("id", id);
    if (!error) {
      setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: false, resolved_at: null } : f)));
    } else {
      setErr(error.message);
    }
    setBusy(null);
  }

  if (!facilityId) return null;
  if (loading) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <SectionLabel right={openCount ? `${openCount} open` : "Nothing open"}>Flagged items</SectionLabel>

      {err && <Note tone={T.alert}>Couldn't update: {err}</Note>}

      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        {[["Open", false], ["All history", true]].map(([label, v]) => (
          <button key={label} onClick={() => setShowAll(v)} className="ed-ui" style={{
            fontSize: 12, padding: "6px 14px", cursor: "pointer", borderRadius: 99,
            border: `1px solid ${showAll === v ? T.teal : T.hairline}`,
            background: showAll === v ? T.teal : "transparent",
            color: showAll === v ? "#FFF" : T.inkSoft, fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Note tone={T.teal}>
          {showAll
            ? "Nothing has been flagged during a weekly review yet."
            : "No open items. Anything flagged during a weekly review stays here until it's marked resolved."}
        </Note>
      ) : (
        <div className="ed-card" style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
                <Th first>Item</Th><Th>Section</Th><Th>Owner</Th><Th>Raised</Th><Th>Days</Th><Th> </Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => {
                const isOpen = open === f.id;
                const times = recurrence[f.question || ""] || 1;
                const days = f.resolved ? null : daysSince(f.week_of);
                return (
                  <React.Fragment key={f.id}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : f.id)}
                      style={{
                        borderBottom: `1px solid ${T.hairline}`, cursor: "pointer",
                        background: isOpen ? T.tealSoft : "transparent",
                        opacity: f.resolved ? 0.62 : 1,
                      }}
                    >
                      <td className="py-3 pr-4" style={{ fontSize: 13, paddingLeft: 20, maxWidth: 400 }}>
                        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                          <span style={{ color: T.inkSoft, fontSize: 11 }}>{isOpen ? "▾" : "▸"}</span>
                          <span>{f.question}</span>
                          {times >= RECUR_WEEKS && <Chip label={`${times}× recurring`} tone={T.alert} bg="#FBEEED" />}
                          {f.resolved && <Chip label="Resolved" tone={T.teal} bg={T.tealSoft} />}
                        </div>
                      </td>
                      <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{f.section || "—"}</td>
                      <td className="py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{f.owner || "Unassigned"}</td>
                      <td className="ed-num py-3 pr-4" style={{ fontSize: 12.5, color: T.inkSoft }}>{shortWeek(f.week_of)}</td>
                      <td className="ed-num py-3 pr-4" style={{
                        fontSize: 13, fontWeight: 600,
                        color: days == null ? T.inkSoft : days > 21 ? T.alert : days > 7 ? T.amber : T.ink,
                      }}>{days == null ? "—" : days}</td>
                      <td className="py-3 pr-4" style={{ textAlign: "right", paddingRight: 16 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); f.resolved ? reopen(f.id) : resolve(f.id); }}
                          disabled={busy === f.id}
                          className="ed-ui"
                          style={{
                            fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 99,
                            border: `1px solid ${T.hairline}`, background: "transparent",
                            color: f.resolved ? T.inkSoft : T.teal, cursor: busy === f.id ? "wait" : "pointer",
                          }}
                        >
                          {busy === f.id ? "…" : f.resolved ? "Reopen" : "Resolve"}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#FAFCFC" }}>
                        <td colSpan={6} style={{ padding: "14px 20px 18px" }}>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 5 }}>Answer given</div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{f.answer || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 5 }}>Raised</div>
                              <div style={{ fontSize: 14 }}>{longDate(f.week_of)}</div>
                              {f.resolved && f.resolved_at && (
                                <div style={{ fontSize: 12, color: T.teal, marginTop: 3 }}>
                                  Resolved {longDate(f.resolved_at)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 5 }}>History</div>
                              <div style={{ fontSize: 14 }}>
                                {times === 1 ? "First time raised" : `Raised in ${times} separate weeks`}
                              </div>
                              {f.item_id && (
                                <div className="ed-num" style={{ fontSize: 11, color: T.inkSoft, marginTop: 3 }}>{f.item_id}</div>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
                            The committee's written notes stay with the facility — only the flagged question and
                            its answer come across.
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ 3 · WATCH LIST ═══════════════════════
   Signals worth a Monday-morning conversation. Every rule below has a
   minimum-evidence guard: nothing fires on a single week or a swing of
   one or two events, because in a 60-bed building that is noise.      */

const RECENT = 4;      // weeks in the current window
const PRIOR = 4;       // weeks in the comparison window
const MIN_WEEKS_EACH = 3;
const MIN_EVENTS = 3;  // absolute floor before a % change means anything
const REL_JUMP = 0.5;  // +50% pooled rate

export function QapiWatchList({ metrics = [], inScope = () => true, scoped = false }) {
  const [facs, setFacs] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [status, setStatus] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const since = addWeeks(thisMonday(), -(RECENT + PRIOR - 1));
    Promise.all([
      supabase.from("facilities").select("id, name"),
      supabase.from("qapi_weekly")
        .select("facility_id, week_of, metric_key, numerator, denominator, denom_basis, value")
        .gte("week_of", since),
      supabase.from("qapi_submission_status")
        .select("facility_id, facility_name, week_of, submitted, facility_census, md_attended")
        .gte("week_of", addWeeks(thisMonday(), -(RECENT - 1))),
      supabase.from("qapi_flags")
        .select("facility_id, question, week_of, resolved")
        .gte("week_of", since),
    ]).then(([f, w, s, g]) => {
      if (!alive) return;
      setFacs(f.data || []);
      setWeekly(w.data || []);
      setStatus(s.data || []);
      setFlags(g.data || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const nameById = useMemo(
    () => Object.fromEntries(facs.map((f) => [f.id, f.name])),
    [facs]
  );

  const byKey = useMemo(
    () => Object.fromEntries(metrics.map((m) => [m.key, m])),
    [metrics]
  );

  const signals = useMemo(() => {
    const out = [];
    const allWeeks = [...new Set(weekly.map((r) => r.week_of))].sort().reverse();
    const recentWeeks = allWeeks.slice(0, RECENT);
    const priorWeeks = allWeeks.slice(RECENT, RECENT + PRIOR);

    const pooled = (rows, weeks, unit) => {
      let num = 0, den = 0, used = 0;
      weeks.forEach((w) => {
        const r = rows.find((x) => x.week_of === w);
        if (!r || r.numerator == null || r.denominator == null || r.denom_basis === "missing") return;
        num += Number(r.numerator); den += Number(r.denominator); used += 1;
      });
      if (!used || !den) return null;
      const v = unit === "percent_of_census" ? (num * 100) / den : (num * 1000) / den;
      return { value: v, num, den, used };
    };

    // — Sustained rise, and currently red on the rolling rate —
    const facIds = [...new Set(weekly.map((r) => r.facility_id))].filter(inScope);
    facIds.forEach((fid) => {
      metrics.filter((m) => m.reportable && m.unit !== "count").forEach((m) => {
        const rows = weekly.filter((r) => r.facility_id === fid && r.metric_key === m.key);
        const a = pooled(rows, recentWeeks, m.unit);
        const b = pooled(rows, priorWeeks, m.unit);

        if (a && m.red != null) {
          const isRed = m.direction === "higher_better"
            ? a.value <= Number(m.red) : a.value >= Number(m.red);
          if (isRed && a.used >= MIN_WEEKS_EACH) {
            out.push({
              severity: "act", facility: nameById[fid] || `Facility ${fid}`, facilityId: fid,
              title: `${m.label} is in the red band`,
              detail: `${fmtValue(Math.round(a.value * 100) / 100, m.unit)} over ${a.used} weeks · ${a.num} event${a.num === 1 ? "" : "s"} across ${Math.round(a.den).toLocaleString()} resident-weeks. Threshold ${fmtValue(m.red, m.unit)}.`,
            });
          }
        }

        if (a && b && a.used >= MIN_WEEKS_EACH && b.used >= MIN_WEEKS_EACH && a.num >= MIN_EVENTS) {
          const worse = m.direction === "higher_better"
            ? b.value > 0 && (b.value - a.value) / b.value >= REL_JUMP
            : b.value > 0 && (a.value - b.value) / b.value >= REL_JUMP;
          if (worse) {
            const pct = Math.round(Math.abs((a.value - b.value) / b.value) * 100);
            out.push({
              severity: "watch", facility: nameById[fid] || `Facility ${fid}`, facilityId: fid,
              title: `${m.label} up ${pct}% against the prior month`,
              detail: `${fmtValue(Math.round(b.value * 100) / 100, m.unit)} → ${fmtValue(Math.round(a.value * 100) / 100, m.unit)} · ${b.num} → ${a.num} events. Both windows have at least ${MIN_WEEKS_EACH} reported weeks.`,
            });
          }
        }
      });
    });

    // — Same question flagged repeatedly —
    const recur = {};
    flags.forEach((f) => {
      if (!inScope(f.facility_id)) return;
      const k = `${f.facility_id}||${f.question}`;
      (recur[k] = recur[k] || { weeks: new Set(), open: 0, q: f.question, fid: f.facility_id });
      recur[k].weeks.add(f.week_of);
      if (!f.resolved) recur[k].open += 1;
    });
    Object.values(recur).forEach((r) => {
      if (r.weeks.size >= RECUR_WEEKS) {
        out.push({
          severity: r.open ? "act" : "watch",
          facility: nameById[r.fid] || `Facility ${r.fid}`, facilityId: r.fid,
          title: "Same item flagged repeatedly",
          detail: `"${r.q}" raised in ${r.weeks.size} separate weeks${r.open ? " and still open" : " (all resolved)"}. A repeat is usually a process gap rather than an incident.`,
        });
      }
    });

    // — Compliance and data-quality signals —
    const byFac = {};
    status.forEach((s) => {
      if (!inScope(s.facility_id)) return;
      (byFac[s.facility_id] = byFac[s.facility_id] || { name: s.facility_name, rows: [] }).rows.push(s);
    });
    Object.entries(byFac).forEach(([fid, f]) => {
      const missed = f.rows.filter((r) => !r.submitted).length;
      if (missed >= 2) {
        out.push({
          severity: "act", facility: f.name, facilityId: Number(fid),
          title: `Missed ${missed} of the last ${f.rows.length} weeks`,
          detail: "No submission means no metrics for those weeks — the gap is invisible in the rates rather than counted as zero.",
        });
      }
      const noCensus = f.rows.filter((r) => r.submitted && r.facility_census == null).length;
      if (noCensus >= 2) {
        out.push({
          severity: "watch", facility: f.name, facilityId: Number(fid),
          title: `Census left blank in ${noCensus} of ${f.rows.length} weeks`,
          detail: "Counts came through but no rate can be computed for those weeks, so this building drops out of comparisons.",
        });
      }
      const submitted = f.rows.filter((r) => r.submitted);
      const noMd = submitted.filter((r) => !r.md_attended).length;
      if (submitted.length >= 3 && noMd >= 3) {
        out.push({
          severity: "watch", facility: f.name, facilityId: Number(fid),
          title: `Medical director absent from ${noMd} of ${submitted.length} reviews`,
          detail: "Medical director participation in QAPI is an expectation at survey, and a run of absences is the kind of thing that gets asked about.",
        });
      }
    });

    const rank = { act: 0, watch: 1 };
    return out.sort((a, b) =>
      rank[a.severity] - rank[b.severity] || a.facility.localeCompare(b.facility)
    );
  }, [weekly, status, flags, metrics, nameById, byKey, inScope]);

  if (loading) return null;

  const acts = signals.filter((s) => s.severity === "act");
  const watches = signals.filter((s) => s.severity === "watch");
  const weeksAvailable = [...new Set(weekly.map((r) => r.week_of))].length;

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionLabel right={signals.length ? `${acts.length} to act on · ${watches.length} to watch` : "Nothing flagged"}>
        Things to watch
      </SectionLabel>

      {weeksAvailable < MIN_WEEKS_EACH ? (
        <Note tone={T.teal}>
          Watch signals need a few weeks of history before they can tell a pattern from a coincidence —
          there {weeksAvailable === 1 ? "is 1 week" : `are ${weeksAvailable} weeks`} so far. Rate comparisons
          start once two {MIN_WEEKS_EACH}-week windows exist, around week {RECENT + MIN_WEEKS_EACH} of the rollout.
        </Note>
      ) : signals.length === 0 ? (
        <Note tone={T.teal}>
          Nothing meets the threshold for attention. Rules require a sustained move across at least{" "}
          {MIN_WEEKS_EACH} weeks and {MIN_EVENTS} events — a one-week spike won't appear here on purpose.
        </Note>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.map((s, i) => (
            <div key={i} className="ed-card p-4" style={{
              borderLeft: `4px solid ${s.severity === "act" ? T.alert : T.amber}`,
            }}>
              <div className="flex items-center justify-between gap-3" style={{ marginBottom: 5 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{s.facility}</span>
                <Chip
                  label={s.severity === "act" ? "Act" : "Watch"}
                  tone={s.severity === "act" ? T.alert : T.amber}
                  bg={s.severity === "act" ? "#FBEEED" : "#FDF6E6"}
                />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 5 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}

      {signals.length > 0 && (
        <p style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
          Signals compare the last {RECENT} weeks against the {PRIOR} before, pooling numerators and
          denominators rather than averaging weekly rates. Nothing fires below {MIN_EVENTS} events or{" "}
          {MIN_WEEKS_EACH} reported weeks per window{scoped ? "" : ", and each facility is judged against its own history rather than the portfolio"}.
        </p>
      )}
    </div>
  );
}
