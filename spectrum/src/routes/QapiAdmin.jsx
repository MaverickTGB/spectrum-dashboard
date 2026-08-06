// QapiAdmin.jsx
// Admin-only screen to view every QAPI submission and correct one when needed.
//
// How editing works: saving does NOT overwrite. It calls the Postgres RPC
// `qapi_admin_revise`, which marks the current submission superseded and inserts
// a brand-new revision (header + values + flags) that supersedes it — the exact
// same supersede-not-overwrite model the facility forms use. Full history is kept;
// nothing is ever destroyed. Only the current (live) version of a week is editable.
//
// Auth: the RPC is SECURITY DEFINER and refuses anyone who is not an approved
// admin, so this is safe even though the browser uses the anon key. The UI also
// hides itself from non-admins as a courtesy.
//
// >>> ONE THING TO CONFIRM: the supabase import line just below must match the
// path your other components use (open Qapi.jsx and copy its exact import).
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js"; // matches Qapi.jsx

// ---------------------------------------------------------------- styling
const C = {
  ink: "#1f2937", sub: "#6b7280", line: "#e5e7eb", bg: "#f9fafb",
  teal: "#0f766e", tealBg: "#ccfbf1", amber: "#b45309", amberBg: "#fef3c7",
  red: "#b91c1c", redBg: "#fee2e2", blue: "#1d4ed8", blueBg: "#dbeafe", white: "#fff",
};
const S = {
  wrap: { color: C.ink, fontSize: 14, padding: "8px 4px" },
  h1: { fontSize: 20, fontWeight: 700, margin: "0 0 2px" },
  muted: { color: C.sub, fontSize: 13 },
  card: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "12px 0" },
  input: { padding: "7px 9px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 14, background: C.white },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, textTransform: "uppercase",
        letterSpacing: ".03em", color: C.sub, borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" },
  td: { padding: "9px 10px", borderBottom: `1px solid ${C.line}`, verticalAlign: "middle" },
  btn: { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.line}`,
         background: C.white, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  btnPrimary: { padding: "8px 16px", borderRadius: 8, border: "none",
                background: C.teal, color: C.white, cursor: "pointer", fontSize: 14, fontWeight: 700 },
  badge: (bg, fg) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999,
                        background: bg, color: fg, fontSize: 12, fontWeight: 600 }),
  label: { display: "block", fontSize: 12, color: C.sub, marginBottom: 4, fontWeight: 600 },
  field: { display: "flex", flexDirection: "column", minWidth: 160 },
};

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
const fmtTs = (t) => (t ? new Date(t).toLocaleString() : "—");

function statusOf(s) {
  if (s.superseded_at) return { label: "Superseded", bg: "#f3f4f6", fg: C.sub };
  if (s.edited_by) return { label: "Admin-edited", bg: C.blueBg, fg: C.blue };
  return { label: "Live", bg: C.tealBg, fg: C.teal };
}

export default function QapiAdmin() {
  const [role, setRole] = useState(null);        // 'admin' | other | null(loading)
  const [metrics, setMetrics] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [showSuperseded, setShowSuperseded] = useState(false);

  // editor
  const [editing, setEditing] = useState(null); // the submission row being edited

  const loadList = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await supabase
      .from("qapi_submissions")
      .select("*, facilities(name, org_id)")
      .order("submitted_at", { ascending: false });
    if (error) setErr(error.message);
    else setSubs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles").select("role, status").eq("user_id", uid).maybeSingle();
        setRole(prof && prof.status === "approved" ? prof.role : "none");
      } else setRole("none");

      const { data: m } = await supabase
        .from("qapi_metrics").select("id, key, label, section, unit, sort_order, active, reportable")
        .eq("active", true).order("sort_order", { ascending: true });
      setMetrics(m || []);
      await loadList();
    })();
  }, [loadList]);

  const facilities = useMemo(() => {
    const seen = new Map();
    subs.forEach((s) => { if (s.facilities) seen.set(s.facility_id, s.facilities.name); });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [subs]);

  const visible = useMemo(() => subs.filter((s) => {
    if (!showSuperseded && s.superseded_at) return false;
    if (facilityFilter !== "all" && String(s.facility_id) !== facilityFilter) return false;
    return true;
  }), [subs, facilityFilter, showSuperseded]);

  if (role === null) return <div style={S.wrap}>Loading…</div>;
  if (role !== "admin")
    return (
      <div style={S.wrap}>
        <div style={{ ...S.card, maxWidth: 520 }}>
          <div style={S.h1}>QAPI Admin</div>
          <p style={S.muted}>This tool is limited to Spectrum administrators.</p>
        </div>
      </div>
    );

  if (editing)
    return (
      <SubmissionEditor
        sub={editing}
        metrics={metrics}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await loadList(); }}
      />
    );

  return (
    <div style={S.wrap}>
      <div style={S.h1}>QAPI Submissions</div>
      <div style={S.muted}>
        View every weekly QAPI submission. Open a live one to correct a number, header
        field, or flag — saving creates a tracked revision and supersedes the original.
      </div>

      <div style={S.toolbar}>
        <select style={S.input} value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)}>
          <option value="all">All facilities</option>
          {facilities.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: C.sub }}>
          <input type="checkbox" checked={showSuperseded} onChange={(e) => setShowSuperseded(e.target.checked)} />
          Show superseded (history)
        </label>
        <button style={S.btn} onClick={loadList}>Refresh</button>
        <span style={{ ...S.muted, marginLeft: "auto" }}>{visible.length} shown</span>
      </div>

      {err && <div style={{ ...S.card, borderColor: C.red, color: C.red, marginBottom: 12 }}>Error: {err}</div>}

      <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Facility", "Week of", "Meeting", "Completed by", "MD", "Flags", "Submitted", "Status", ""]
                .map((h) => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={S.td} colSpan={9}>Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td style={S.td} colSpan={9}>No submissions match.</td></tr>
            ) : visible.map((s) => {
              const st = statusOf(s);
              const editable = !s.superseded_at;
              return (
                <tr key={s.id}>
                  <td style={S.td}>{s.facilities?.name || `#${s.facility_id}`}</td>
                  <td style={S.td}>{fmtDate(s.week_of)}</td>
                  <td style={S.td}>{fmtDate(s.meeting_date)}</td>
                  <td style={S.td}>{s.completed_by || "—"}</td>
                  <td style={S.td}>{s.md_attended ? "Yes" : "No"}</td>
                  <td style={S.td}>{s.flag_count}</td>
                  <td style={S.td} title={fmtTs(s.submitted_at)}>{fmtDate(s.submitted_at)}</td>
                  <td style={S.td}><span style={S.badge(st.bg, st.fg)}>{st.label}</span></td>
                  <td style={S.td}>
                    {editable
                      ? <button style={S.btn} onClick={() => setEditing(s)}>Edit</button>
                      : <button style={{ ...S.btn, color: C.sub }} onClick={() => setEditing(s)}>View</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ editor
function SubmissionEditor({ sub, metrics, onClose, onSaved }) {
  const readOnly = !!sub.superseded_at;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);

  const [header, setHeader] = useState({
    meeting_date: fmtDate(sub.meeting_date) === "—" ? "" : fmtDate(sub.meeting_date),
    completed_by: sub.completed_by || "",
    facility_census: sub.facility_census ?? "",
    md_attended: !!sub.md_attended,
    report_link: sub.report_link || "",
  });
  const [values, setValues] = useState({});   // metric_id -> { numerator, denominator }
  const [flags, setFlags] = useState([]);     // [{section,question,answer,owner,resolved}]

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      const [{ data: vals, error: vErr }, { data: fl, error: fErr }] = await Promise.all([
        supabase.from("qapi_values").select("metric_id, numerator, denominator").eq("submission_id", sub.id),
        supabase.from("qapi_flags").select("section, question, answer, owner, resolved").eq("submission_id", sub.id).order("id"),
      ]);
      if (vErr || fErr) setErr((vErr || fErr).message);
      const vmap = {};
      (vals || []).forEach((v) => {
        vmap[v.metric_id] = {
          numerator: v.numerator ?? "",
          denominator: v.denominator ?? "",
        };
      });
      setValues(vmap);
      setFlags((fl || []).map((f) => ({
        section: f.section || "", question: f.question || "",
        answer: f.answer || "", owner: f.owner || "", resolved: !!f.resolved,
      })));
      setLoading(false);
    })();
  }, [sub.id]);

  const setVal = (mid, field, v) =>
    setValues((prev) => ({ ...prev, [mid]: { ...(prev[mid] || {}), [field]: v } }));
  const setFlag = (i, field, v) =>
    setFlags((prev) => prev.map((f, k) => (k === i ? { ...f, [field]: v } : f)));
  const addFlag = () =>
    setFlags((prev) => [...prev, { section: "", question: "", answer: "", owner: "", resolved: false }]);
  const removeFlag = (i) => setFlags((prev) => prev.filter((_, k) => k !== i));

  async function doSave() {
    setSaving(true); setErr("");
    const p_header = {
      meeting_date: header.meeting_date || "",
      completed_by: header.completed_by,
      md_attended: header.md_attended ? "true" : "false",
      facility_census: header.facility_census === "" ? "" : String(header.facility_census),
      report_link: header.report_link,
    };
    const p_values = metrics
      .filter((m) => {
        const v = values[m.id];
        return v && v.numerator !== "" && v.numerator !== null && v.numerator !== undefined;
      })
      .map((m) => ({
        metric_id: m.id,
        numerator: String(values[m.id].numerator),
        denominator: values[m.id].denominator === "" ? "" : String(values[m.id].denominator),
      }));
    const p_flags = flags.map((f) => ({
      section: f.section, question: f.question, answer: f.answer,
      owner: f.owner, resolved: f.resolved,
    }));

    const { data, error } = await supabase.rpc("qapi_admin_revise", {
      p_submission_id: sub.id, p_header, p_values, p_flags,
    });
    setSaving(false);
    if (error) { setErr(error.message); setConfirm(false); return; }
    onSaved(data);
  }

  const bySection = useMemo(() => {
    const g = {};
    metrics.forEach((m) => { (g[m.section] = g[m.section] || []).push(m); });
    return Object.entries(g);
  }, [metrics]);

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <button style={S.btn} onClick={onClose}>← Back</button>
        <div style={S.h1}>{sub.facilities?.name || `Facility #${sub.facility_id}`}</div>
        <span style={S.badge(statusOf(sub).bg, statusOf(sub).fg)}>{statusOf(sub).label}</span>
        <span style={S.muted}>Week of {fmtDate(sub.week_of)}</span>
      </div>

      {readOnly && (
        <div style={{ ...S.card, background: C.bg, marginTop: 10 }}>
          <span style={S.muted}>
            This is a superseded (historical) version and is read-only. To make a correction,
            go back and edit the current live submission for this week.
          </span>
        </div>
      )}

      {loading ? <div style={{ ...S.card, marginTop: 12 }}>Loading…</div> : (
        <>
          {/* header */}
          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Submission details</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={S.field}>
                <label style={S.label}>Meeting date</label>
                <input type="date" style={S.input} disabled={readOnly}
                  value={header.meeting_date} onChange={(e) => setHeader({ ...header, meeting_date: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Completed by</label>
                <input style={S.input} disabled={readOnly}
                  value={header.completed_by} onChange={(e) => setHeader({ ...header, completed_by: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Facility census (denominator)</label>
                <input type="number" min="0" style={S.input} disabled={readOnly}
                  value={header.facility_census}
                  onChange={(e) => setHeader({ ...header, facility_census: e.target.value })} />
              </div>
              <div style={{ ...S.field, justifyContent: "flex-end" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                  <input type="checkbox" disabled={readOnly}
                    checked={header.md_attended}
                    onChange={(e) => setHeader({ ...header, md_attended: e.target.checked })} />
                  Medical Director attended
                </label>
              </div>
              <div style={{ ...S.field, flex: 1, minWidth: 240 }}>
                <label style={S.label}>Report link (optional)</label>
                <input style={S.input} disabled={readOnly}
                  value={header.report_link} onChange={(e) => setHeader({ ...header, report_link: e.target.value })} />
              </div>
            </div>
            <div style={{ ...S.muted, marginTop: 8 }}>
              Rates are computed at read time as numerator ÷ facility census, so fixing the
              census here corrects every percent-of-census metric for this week at once.
            </div>
          </div>

          {/* values */}
          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Metric counts (numerators)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={S.th}>Metric</th>
                  <th style={{ ...S.th, width: 140 }}>Count</th>
                  <th style={S.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {bySection.map(([section, ms]) => (
                  <React.Fragment key={section}>
                    <tr><td style={{ ...S.td, background: C.bg, fontWeight: 600, fontSize: 12,
                      textTransform: "uppercase", color: C.sub }} colSpan={3}>{section}</td></tr>
                    {ms.map((m) => (
                      <tr key={m.id}>
                        <td style={S.td}>{m.label}</td>
                        <td style={S.td}>
                          <input type="number" min="0" style={{ ...S.input, width: 110 }} disabled={readOnly}
                            value={values[m.id]?.numerator ?? ""}
                            onChange={(e) => setVal(m.id, "numerator", e.target.value)} />
                        </td>
                        <td style={{ ...S.td, color: C.sub, fontSize: 12 }}>
                          {m.reportable === false ? "Captured but not scorecarded" :
                           m.unit === "percent_of_census" ? "shown as % of census" :
                           m.unit === "count" ? "raw count" : m.unit}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <div style={{ ...S.muted, marginTop: 8 }}>
              Leaving a count blank omits that metric from the revision. Enter 0 to record a true zero.
            </div>
          </div>

          {/* flags */}
          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>Flags ({flags.length})</div>
              {!readOnly && <button style={{ ...S.btn, marginLeft: "auto" }} onClick={addFlag}>+ Add flag</button>}
            </div>
            {flags.length === 0 && <div style={S.muted}>No flags on this submission.</div>}
            {flags.map((f, i) => (
              <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ ...S.field, minWidth: 140 }}>
                    <label style={S.label}>Section</label>
                    <input style={S.input} disabled={readOnly}
                      value={f.section} onChange={(e) => setFlag(i, "section", e.target.value)} />
                  </div>
                  <div style={{ ...S.field, flex: 1, minWidth: 260 }}>
                    <label style={S.label}>Question</label>
                    <input style={S.input} disabled={readOnly}
                      value={f.question} onChange={(e) => setFlag(i, "question", e.target.value)} />
                  </div>
                  <div style={{ ...S.field, minWidth: 90 }}>
                    <label style={S.label}>Answer</label>
                    <input style={S.input} disabled={readOnly}
                      value={f.answer} onChange={(e) => setFlag(i, "answer", e.target.value)} />
                  </div>
                  <div style={{ ...S.field, minWidth: 140 }}>
                    <label style={S.label}>Owner</label>
                    <input style={S.input} disabled={readOnly}
                      value={f.owner} onChange={(e) => setFlag(i, "owner", e.target.value)} />
                  </div>
                  <div style={{ ...S.field, justifyContent: "flex-end" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                      <input type="checkbox" disabled={readOnly}
                        checked={f.resolved} onChange={(e) => setFlag(i, "resolved", e.target.checked)} />
                      Resolved
                    </label>
                  </div>
                  {!readOnly && (
                    <div style={{ ...S.field, justifyContent: "flex-end" }}>
                      <button style={{ ...S.btn, color: C.red, borderColor: C.redBg }} onClick={() => removeFlag(i)}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {err && <div style={{ ...S.card, borderColor: C.red, color: C.red, marginTop: 12 }}>Error: {err}</div>}

          {!readOnly && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
              <button style={S.btnPrimary} disabled={saving} onClick={() => setConfirm(true)}>
                {saving ? "Saving…" : "Save as new revision"}
              </button>
              <button style={S.btn} disabled={saving} onClick={onClose}>Cancel</button>
              <span style={S.muted}>Saving supersedes the current version; the original is preserved in history.</span>
            </div>
          )}
        </>
      )}

      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ ...S.card, maxWidth: 460 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Create a corrected revision?</div>
            <p style={S.muted}>
              This marks the current submission for {sub.facilities?.name} (week of {fmtDate(sub.week_of)})
              as superseded and saves your edits as a new live revision. The original stays in history.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={S.btnPrimary} disabled={saving} onClick={doSave}>{saving ? "Saving…" : "Yes, save revision"}</button>
              <button style={S.btn} disabled={saving} onClick={() => setConfirm(false)}>Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
