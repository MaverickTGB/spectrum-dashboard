import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useScope } from "../lib/scope.jsx";

/* Spectrum design tokens — mirrors Executive.jsx */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", amber: "#B07C1F",
  hairline: "#DCE7E9",
};

/* Two Spectrum segments read as one family; non-Spectrum sits outside it. */
const C = { snf: T.teal, ltc: "#5FAEB4", nonspec: "#B9C9CC" };

const pct = (v) => (v === null || v === undefined ? null : Number(v));

const fmtPct = (v, suppress) => {
  if (suppress) return "—";
  const n = pct(v);
  return n === null ? "—" : `${n.toFixed(1)}%`;
};

const Num = ({ children, size = 13, weight = 500, color = T.ink }) => (
  <span className="ed-num" style={{ fontSize: size, fontWeight: weight, color }}>
    {children}
  </span>
);

/* count on top, rate beneath — the count is the fact, the rate is the comparison */
function Metric({ count, rate, suppress, label, accent, big }) {
  return (
    <div style={{ minWidth: big ? 104 : 84 }}>
      {label && (
        <div style={{
          fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
          color: T.inkSoft, fontWeight: 600, marginBottom: 3,
        }}>{label}</div>
      )}
      <Num size={big ? 24 : 15} weight={big ? 600 : 500} color={accent || T.ink}>
        {count === null || count === undefined ? "—" : count}
      </Num>
      <div>
        <Num size={big ? 13 : 11.5} weight={400} color={T.inkSoft}>
          {fmtPct(rate, suppress)}
        </Num>
      </div>
    </div>
  );
}

/* Segments share one denominator, so widths are directly comparable. */
function SplitBar({ snf, ltc, nonspec, denom, incomplete }) {
  if (!denom) return null;
  const seg = (n) => (n ? Math.max((n / denom) * 100, 0) : 0);
  const parts = [
    { w: seg(snf), c: C.snf, t: `SNF ${snf || 0}` },
    { w: seg(ltc), c: C.ltc, t: `LTC ${ltc || 0}` },
    { w: seg(nonspec), c: C.nonspec, t: `Non-Spectrum ${nonspec || 0}` },
  ].filter((p) => p.w > 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        display: "flex", height: 7, flex: 1, minWidth: 80, borderRadius: 4,
        overflow: "hidden", background: T.mist,
      }}>
        {parts.map((p, i) => (
          <div key={i} title={p.t} style={{ width: `${p.w}%`, background: p.c }} />
        ))}
      </div>
      {incomplete && (
        <span title="Non-Spectrum returns not reported — total is understated"
              style={{ color: T.amber, fontSize: 13, lineHeight: 1 }}>◍</span>
      )}
    </div>
  );
}

export default function RtaPanel() {
  const { orgId, scoped } = useScope();
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(null);
  const [months, setMonths] = useState([]);
  const [sort, setSort] = useState("spectrum");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      let q = supabase.from("rta_reconciliation").select("*");
      if (scoped && orgId) q = q.eq("org_id", orgId);
      const { data, error } = await q;
      if (!alive) return;
      if (error) { setErr(error.message); setLoading(false); return; }
      const all = data || [];
      const ms = [...new Set(all.map((r) => r.month))].sort().reverse();
      setMonths(ms);
      setMonth((m) => (m && ms.includes(m) ? m : ms[0] || null));
      setRows(all);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [orgId, scoped]);

  const view = useMemo(() => rows.filter((r) => r.month === month), [rows, month]);

  const totals = useMemo(() => {
    const sum = (k) => view.reduce((a, r) => a + (r[k] || 0), 0);
    const denom = sum("denominator");
    const snf = sum("snf_rtas"), ltc = sum("ltc_rtas"), ns = sum("nonshs_rtas");
    const rate = (n) => (denom ? (n / denom) * 100 : null);
    return {
      denom, snf, ltc, ns,
      spectrum: snf + ltc,
      total: snf + ltc + ns,
      snfPct: rate(snf), ltcPct: rate(ltc), nsPct: rate(ns),
      spectrumPct: rate(snf + ltc), totalPct: rate(snf + ltc + ns),
      incomplete: view.filter((r) => r.total_incomplete).length,
      unfilled: view.filter((r) => !r.reported_facility_admits).length,
    };
  }, [view]);

  const sorted = useMemo(() => {
    const key = { spectrum: "spectrum_rta_pct", snf: "snf_rta_pct",
                  ltc: "ltc_rta_pct", total: "total_facility_rta_pct",
                  admits: "denominator" }[sort];
    return [...view].sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1));
  }, [view, sort]);

  const monthLabel = month
    ? new Date(month + "T00:00:00").toLocaleDateString(undefined,
        { month: "long", year: "numeric" })
    : "";

  if (loading) return <div className="ed-card p-6" style={{ color: T.inkSoft }}>Loading returns to acute…</div>;
  if (err) return (
    <div className="ed-card p-6" style={{ borderLeft: `4px solid ${T.alert}` }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Returns to acute unavailable</div>
      <div style={{ fontSize: 13, color: T.inkSoft }}>{err}</div>
    </div>
  );
  if (!month) return (
    <div className="ed-card p-6" style={{ color: T.inkSoft }}>
      No returns-to-acute data yet. It appears once facility reports are ingested.
    </div>
  );

  const th = {
    fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
    color: T.inkSoft, fontWeight: 600, padding: "0 10px 8px", textAlign: "right",
    cursor: "pointer", whiteSpace: "nowrap",
  };
  const td = { padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div className="ed-card" style={{ padding: 24, marginBottom: 24 }}>
      {/* header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline",
                    justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                        color: T.inkSoft, fontWeight: 600, marginBottom: 6 }}>
            Returns to acute · {monthLabel}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <Num size={38} weight={600} color={T.teal}>
              {totals.spectrumPct === null ? "—" : `${totals.spectrumPct.toFixed(1)}%`}
            </Num>
            <span style={{ fontSize: 13.5, color: T.inkSoft }}>
              Spectrum · <Num>{totals.spectrum}</Num> of <Num>{totals.denom}</Num> admissions
            </span>
          </div>
        </div>
        {months.length > 1 && (
          <select value={month} onChange={(e) => setMonth(e.target.value)}
                  style={{ border: `1px solid ${T.hairline}`, borderRadius: 6,
                           padding: "6px 10px", fontSize: 13, color: T.ink,
                           background: T.panel }}>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(m + "T00:00:00").toLocaleDateString(undefined,
                  { month: "short", year: "numeric" })}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* four distinctions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, padding: "16px 0",
                    borderTop: `1px solid ${T.hairline}`,
                    borderBottom: `1px solid ${T.hairline}`, marginBottom: 18 }}>
        <Metric label="Skilled" count={totals.snf} rate={totals.snfPct} accent={C.snf} big />
        <Metric label="Long term" count={totals.ltc} rate={totals.ltcPct} accent={C.ltc} big />
        <div style={{ width: 1, background: T.hairline, alignSelf: "stretch" }} />
        <Metric label="Spectrum combined" count={totals.spectrum} rate={totals.spectrumPct}
                accent={T.teal} big />
        <Metric label="Non-Spectrum" count={totals.ns || null} rate={totals.nsPct}
                accent={T.inkSoft} big />
        <Metric label="Facility total" count={totals.total} rate={totals.totalPct} big />
      </div>

      {(totals.incomplete > 0 || totals.unfilled > 0) && (
        <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 14, lineHeight: 1.6 }}>
          {totals.incomplete > 0 && (
            <div>
              <span style={{ color: T.amber }}>◍</span>{" "}
              {totals.incomplete} shared {totals.incomplete === 1 ? "building has" : "buildings have"}{" "}
              no non-Spectrum returns reported, so facility totals there are understated.
            </div>
          )}
          {totals.unfilled > 0 && (
            <div>{totals.unfilled} {totals.unfilled === 1 ? "facility" : "facilities"} filed no admissions for this month.</div>
          )}
        </div>
      )}

      {/* per facility */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", cursor: "default" }}>Facility</th>
              <th style={{ ...th, textAlign: "left", cursor: "default", width: 130 }}>Mix</th>
              <th style={th} onClick={() => setSort("admits")}>Admits</th>
              <th style={th} onClick={() => setSort("snf")}>Skilled</th>
              <th style={th} onClick={() => setSort("ltc")}>Long term</th>
              <th style={{ ...th, color: T.teal }} onClick={() => setSort("spectrum")}>Spectrum</th>
              <th style={th}>Non-Spec</th>
              <th style={th} onClick={() => setSort("total")}>Facility total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const low = r.low_denominator;
              return (
                <tr key={r.facility_code} style={{ borderTop: `1px solid ${T.hairline}` }}>
                  <td style={{ padding: "9px 10px", fontWeight: 500 }}>
                    {r.facility_name}
                    {low && (
                      <span title="Fewer than 5 admissions — rates not meaningful"
                            style={{ color: T.inkSoft, fontSize: 11, marginLeft: 6 }}>
                        low volume
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <SplitBar snf={r.snf_rtas} ltc={r.ltc_rtas} nonspec={r.nonshs_rtas}
                              denom={r.denominator} incomplete={r.total_incomplete} />
                  </td>
                  <td style={td}><Num color={T.inkSoft}>{r.denominator ?? "—"}</Num></td>
                  <td style={td}>
                    <Num>{r.snf_rtas ?? "—"}</Num>{" "}
                    <Num size={11.5} color={T.inkSoft}>{fmtPct(r.snf_rta_pct, low)}</Num>
                  </td>
                  <td style={td}>
                    <Num>{r.ltc_rtas ?? "—"}</Num>{" "}
                    <Num size={11.5} color={T.inkSoft}>{fmtPct(r.ltc_rta_pct, low)}</Num>
                  </td>
                  <td style={{ ...td, background: T.tealSoft }}>
                    <Num weight={600} color={T.teal}>{r.spectrum_rtas ?? "—"}</Num>{" "}
                    <Num size={11.5} color={T.teal}>{fmtPct(r.spectrum_rta_pct, low)}</Num>
                  </td>
                  <td style={td}>
                    <Num color={r.nonshs_rtas === null ? T.inkSoft : T.ink}>
                      {r.nonshs_rtas ?? "—"}
                    </Num>{" "}
                    <Num size={11.5} color={T.inkSoft}>{fmtPct(r.nonshs_rta_pct, low)}</Num>
                  </td>
                  <td style={td}>
                    <Num>{r.total_facility_rtas ?? "—"}</Num>{" "}
                    <Num size={11.5} color={T.inkSoft}>{fmtPct(r.total_facility_rta_pct, low)}</Num>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 14, lineHeight: 1.6 }}>
        All rates divide by facility admissions (skilled + long term), matching the
        monthly facility report. Long-term returns come from residents already in the
        building, so that rate can exceed the month's admissions at low volume.
      </div>
    </div>
  );
}
