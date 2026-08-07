// QapiExceptions.jsx
// Admin-only screen to record a deliberately skipped QAPI week.
//
// Why this is its own table and not a column on qapi_submissions: an excused week
// is precisely a week where no submission row exists, so there is nothing to hang
// the reason on. `qapi_schedule_exceptions` is keyed on (facility_id, week_of),
// unique, so a week can only be excused once.
//
// Partners see the reason on their scorecard. That is the whole point — a blank
// week with no explanation reads as a facility that skipped, and this is what
// separates "state survey that week" from "nobody filed it."
//
// Auth: RLS allows admin write, staff + owning org read. The UI hides itself from
// non-admins as a courtesy, but the database is what actually enforces it.
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

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
  field: { display: "flex", flexDirection: "column", minWidth: 170 },
};

// Reasons match the CHECK constraint on qapi_schedule_exceptions.reason exactly.
// Adding one here without adding it to the constraint will fail on save.
const REASONS = [
  { value: "state_survey", label: "State survey" },
  { value: "leadership_absence", label: "DON / Administrator out" },
  { value: "holiday", label: "Holiday" },
  { value: "combined_with_adjacent_week", label: "Combined with adjacent week" },
  { value: "other", label: "Other" },
];
const reasonLabel = (v) => REASONS.find((r) => r.value === v)?.label || v || "—";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

/* Monday of the week containing `d`. Matches Postgres date_trunc('week'),
   which is Monday-based — the weeks generated here have to line up with the
   ones qapi_submission_status generates or nothing joins. */
function mondayOf(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

/* The current week plus the previous `n`, newest first. Excusing a future week
   isn't offered — an exception is a record of what happened, not a plan. */
function recentWeeks(n = 10) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i * 7);
    out.push(mondayOf(d));
  }
  return out;
}

export default function QapiExceptions() {
  const [role, setRole] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const weeks = useMemo(() => recentWeeks(10), []);

  const [form, setForm] = useState({
    facility_id: "", week_of: weeks[0], reason: "state_survey", note: "",
  });

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const [{ data: ex, error: exErr }, { data: st }] = await Promise.all([
      supabase
        .from("qapi_schedule_exceptions")
        .select("id, facility_id, week_of, reason, note, created_at, facilities(name, code)")
        .order("week_of", { ascending: false }),
      supabase
        .from("qapi_submission_status")
        .select("facility_id, week_of, status"),
    ]);
    if (exErr) setErr(exErr.message);
    else setRows(ex || []);
    setStatus(st || []);
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

      const { data: f } = await supabase
        .from("facilities")
        .select("id, name, code")
        .eq("qapi_required", true)
        .order("name");
      setFacilities(f || []);
      await load();
    })();
  }, [load]);

  /* Guard against excusing a week that already has a submission. The database
     permits it (the tables are independent), but it produces a contradictory
     row that would make the scorecard say two different things at once. */
  const conflict = useMemo(() => {
    if (!form.facility_id || !form.week_of) return null;
    const hit = status.find(
      (s) => String(s.facility_id) === String(form.facility_id) && s.week_of === form.week_of
    );
    if (hit?.status === "submitted") return "submitted";
    const dupe = rows.find(
      (r) => String(r.facility_id) === String(form.facility_id) && r.week_of === form.week_of
    );
    if (dupe) return "excused";
    return null;
  }, [form.facility_id, form.week_of, status, rows]);

  async function save() {
    if (!form.facility_id) { setErr("Pick a facility."); return; }
    setSaving(true); setErr(""); setNotice("");
    const { error } = await supabase.from("qapi_schedule_exceptions").insert({
      facility_id: Number(form.facility_id),
      week_of: form.week_of,
      reason: form.reason,
      note: form.note || null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setNotice("Week marked as excused.");
    setForm({ ...form, note: "" });
    await load();
  }

  async function remove(id) {
    setErr(""); setNotice("");
    const { error } = await supabase.from("qapi_schedule_exceptions").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    setNotice("Exception removed. That week reverts to missing.");
    await load();
  }

  if (role === null) return <div style={S.wrap}>Loading…</div>;
  if (role !== "admin")
    return (
      <div style={S.wrap}>
        <div style={{ ...S.card, maxWidth: 520 }}>
          <div style={S.h1}>QAPI Exceptions</div>
          <p style={S.muted}>This tool is limited to Spectrum administrators.</p>
        </div>
      </div>
    );

  return (
    <div style={S.wrap}>
      <div style={S.h1}>Excused QAPI Weeks</div>
      <div style={S.muted}>
        Record a week a facility deliberately skipped. The reason appears on the facility's
        scorecard, so a partner sees why the week is blank instead of assuming it was missed.
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Mark a week excused</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ ...S.field, minWidth: 220 }}>
            <label style={S.label}>Facility</label>
            <select style={S.input} value={form.facility_id}
              onChange={(e) => setForm({ ...form, facility_id: e.target.value })}>
              <option value="">Select a facility…</option>
              {facilities.map((f) => (
                <option key={f.id} value={String(f.id)}>{f.name} ({f.code})</option>
              ))}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Week of (Monday)</label>
            <select style={S.input} value={form.week_of}
              onChange={(e) => setForm({ ...form, week_of: e.target.value })}>
              {weeks.map((w, i) => (
                <option key={w} value={w}>{w}{i === 0 ? " — this week" : ""}</option>
              ))}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Reason</label>
            <select style={S.input} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ ...S.field, flex: 1, minWidth: 240 }}>
            <label style={S.label}>Note (optional, visible to the partner)</label>
            <input style={S.input} value={form.note} maxLength={200}
              placeholder="e.g. Survey team on site Mon–Thu"
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        {conflict === "submitted" && (
          <div style={{ ...S.card, background: C.amberBg, borderColor: C.amber, color: C.amber, marginTop: 12 }}>
            That week already has a submission for this facility. Excusing it would leave the
            scorecard saying both things at once — pick a different week.
          </div>
        )}
        {conflict === "excused" && (
          <div style={{ ...S.card, background: C.bg, marginTop: 12, ...S.muted }}>
            This week is already marked excused for that facility. Remove the existing entry below
            to change the reason.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button style={{ ...S.btnPrimary, opacity: conflict ? 0.5 : 1 }}
            disabled={saving || !!conflict} onClick={save}>
            {saving ? "Saving…" : "Mark week excused"}
          </button>
          <span style={S.muted}>Your account is recorded against the entry.</span>
        </div>
      </div>

      {err && <div style={{ ...S.card, borderColor: C.red, color: C.red, marginTop: 12 }}>Error: {err}</div>}
      {notice && <div style={{ ...S.card, borderColor: C.teal, color: C.teal, marginTop: 12 }}>{notice}</div>}

      <div style={{ ...S.card, marginTop: 12, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Facility", "Week of", "Reason", "Note", "Recorded", ""].map((h) =>
              <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={S.td} colSpan={6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td style={{ ...S.td, ...S.muted }} colSpan={6}>
                No excused weeks recorded. Every expected week counts as missing until one is added here.
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>{r.facilities?.name || `#${r.facility_id}`}</td>
                <td style={S.td}>{fmtDate(r.week_of)}</td>
                <td style={S.td}><span style={S.badge(C.blueBg, C.blue)}>{reasonLabel(r.reason)}</span></td>
                <td style={{ ...S.td, color: C.sub }}>{r.note || "—"}</td>
                <td style={{ ...S.td, color: C.sub, fontSize: 12 }}>{fmtDate(r.created_at)}</td>
                <td style={S.td}>
                  <button style={{ ...S.btn, color: C.red, borderColor: C.redBg }}
                    onClick={() => remove(r.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
