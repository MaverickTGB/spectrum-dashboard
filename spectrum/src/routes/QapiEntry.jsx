import React, { useEffect, useMemo, useRef, useState } from "react";
// ── ADJUST if your client lives elsewhere. Executive.jsx imports it as
//    "../lib/supabase.js", so this matches your tree. ──────────────────────
import { supabase } from "../lib/supabase.js";

/* ─────────────────────────── Spectrum tokens ─────────────────────────── */
const T = {
  mist: "#F2F6F7", panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", tealSoft: "#E4F1F2", alert: "#C4452A", flag: "#A8481A",
  flagSoft: "#FBEDE5", green: "#2C6B4F", hairline: "#DCE7E9",
};
const mono = "'IBM Plex Mono', ui-monospace, monospace";
const sans = "'Archivo', system-ui, sans-serif";

/* ─────────────────────────── Form template ───────────────────────────
   Mirrors the desktop QAPI form exactly. type: yn (Yes/No/N-A) · num ·
   text · longtext.  flag: the answer that raises a follow-up flag.       */
const FORM = [
  { id: "wounds", title: "Wounds", items: [
    { id: "w1", type: "yn", flag: "yes", t: "Any newly acquired or worsening wounds in the reporting period?" },
    { id: "w2", type: "num", t: "Number of newly acquired or worsening wounds" },
    { id: "w3", type: "yn", flag: "no", t: "Risk Management and wound checklist completed?", h: "Required for each wound identified above." },
    { id: "w4", type: "yn", flag: "no", t: "Pressure ulcer unavoidability evaluation completed?", h: "If applicable." },
    { id: "w5", type: "yn", flag: "yes", t: "Opportunities for improvement identified?", h: "If yes, describe in section notes." },
  ]},
  { id: "weights", title: "Weights", items: [
    { id: "g1", type: "yn", flag: "yes", t: "Any residents with significant weight gain or loss?", h: "Follow RAI guidelines." },
    { id: "g2", type: "num", t: "Number of residents with significant weight change" },
    { id: "g3", type: "yn", flag: "no", t: "Chart reviewed to determine whether new interventions or orders are needed?" },
    { id: "g4", type: "yn", flag: "no", t: "Referral made to Speech Therapy and Registered Dietitian?", h: "For residents with unplanned weight loss." },
    { id: "g5", type: "yn", flag: "yes", t: "Opportunities for improvement identified?" },
  ]},
  { id: "rehosp", title: "Re-Hospitalizations", items: [
    { id: "r1", type: "yn", flag: "yes", t: "Any unplanned re-hospitalizations in the reporting period?" },
    { id: "r2", type: "num", t: "Number of unplanned re-hospitalizations" },
    { id: "r3", type: "yn", flag: "no", t: "QI review completed for each transfer?" },
    { id: "r4", type: "yn", flag: "no", t: "CNO and provider notified prior to transfer?" },
    { id: "r5", type: "yn", flag: "yes", t: "Opportunities for improvement or trends identified?" },
  ]},
  { id: "falls", title: "Falls", items: [
    { id: "f1", type: "yn", flag: "yes", t: "Any fall incidents in the reporting period?" },
    { id: "f2", type: "num", t: "Number of falls" },
    { id: "f3", type: "yn", flag: "no", t: "Risk Management and fall checklist completed?" },
    { id: "f4", type: "yn", t: "Resident in an EarlySense bed?", h: "If yes, review the EarlySense report and adjust bed exit sensitivity if indicated." },
    { id: "f5", type: "yn", flag: "no", t: "Care plan updated to reflect the new intervention?" },
    { id: "f6", type: "yn", flag: "yes", t: "Opportunities for improvement identified?" },
  ]},
  { id: "psych", title: "Psychotropics", items: [
    { id: "p1", type: "num", t: "Residents or guests on psychotropics" },
    { id: "p2", type: "yn", flag: "no", t: "Appropriate diagnosis for every anti-psychotic?", h: "Tourette's, Huntington's, or schizophrenia." },
    { id: "p3", type: "yn", flag: "no", t: "14-day stop date in place for every PRN psychotropic?" },
    { id: "p4", type: "yn", flag: "no", t: "GDR attempted by pharmacist or psychiatrist?", h: "If not attempted, explain in a PCC progress note." },
  ]},
  { id: "cath", title: "Catheters", items: [
    { id: "c1", type: "num", t: "Guests with an indwelling catheter" },
    { id: "c2", type: "yn", flag: "no", t: "Appropriate diagnosis documented for every catheter?" },
    { id: "c3", type: "yn", t: "Removal requested and bladder scanning / voiding trial initiated?", h: "Required where diagnosis does not support continued use." },
  ]},
  { id: "dial", title: "Dialysis", items: [
    { id: "d1", type: "num", t: "Guests receiving dialysis" },
    { id: "d2", type: "yn", flag: "no", t: "Appropriate orders in place for every dialysis resident?" },
    { id: "d3", type: "yn", flag: "no", t: "Dialysis communication sheets completed and scanned into the medical record?" },
  ]},
  { id: "abx", title: "Antibiotic Use and Infections", items: [
    { id: "a1", type: "num", t: "Guests with an infection" },
    { id: "a2", type: "num", t: "Guests on antibiotics" },
    { id: "a3", type: "longtext", t: "Antibiotics in use and the indication for each" },
    { id: "a4", type: "yn", flag: "yes", t: "Any trend or cluster identified?", h: "Same organism, same unit, or same infection type." },
  ]},
  { id: "other", title: "Other Incidents", items: [
    { id: "o1", type: "yn", flag: "yes", t: "Any incidents other than falls in the reporting period?" },
    { id: "o2", type: "num", t: "Number of other incidents" },
    { id: "o3", type: "yn", flag: "no", t: "Risk Management completed?" },
    { id: "o4", type: "yn", flag: "no", t: "Care plan updated to reflect the new intervention?", h: "If applicable." },
    { id: "o5", type: "yn", flag: "yes", t: "Opportunities for improvement identified?" },
  ]},
  { id: "md", title: "Medical Director Input", items: [
    { id: "m1", type: "yn", flag: "no", t: "Medical Director attended the weekly QAPI?" },
    { id: "m2", type: "text", t: "Medical Director name" },
    { id: "m3", type: "yn", flag: "no", t: "Areas of opportunity discussed with the Medical Director?" },
    { id: "m4", type: "yn", flag: "no", t: "PIPs reviewed or implemented based on QAPI data?", h: "Blank PIP document is in the Clinical Systems Playbook." },
    { id: "m5", type: "longtext", t: "Medical Director comments and recommendations" },
  ]},
];

// Form key -> qapi_metrics.key. The ONLY fields that leave the browser.
const MEASURE_MAP = {
  wounds_new: "w2", weight_changes: "g2", rehospitalizations: "r2", falls: "f2",
  psychotropic_census: "p1", catheter_census: "c1", dialysis_census: "d1",
  infections: "a1", antibiotics: "a2", other_incidents: "o2",
};

const labelOf = (v) => (v === "yes" ? "Yes" : v === "no" ? "No" : v === "na" ? "N/A" : (v === "" || v == null) ? "—" : String(v));
const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const nl2br = (s) => escapeHtml(s).replace(/\r?\n/g, "<br>");
function thisMonday() {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}
const today = () => new Date().toISOString().slice(0, 10);

const scopedCSS = `
.qe-seg{display:inline-flex;border:1px solid ${T.hairline};border-radius:6px;overflow:hidden}
.qe-seg button{border:none;background:#fff;padding:6px 15px;font-size:13px;cursor:pointer;color:${T.inkSoft};border-right:1px solid ${T.hairline};font-family:${sans}}
.qe-seg button:last-child{border-right:none}
.qe-seg button[aria-pressed="true"]{background:${T.teal};color:#fff;font-weight:600}
.qe-row.flagged{background:${T.flagSoft};margin:0 -18px;padding-left:18px;padding-right:18px}
`;

const fieldLabel = { display: "block", fontFamily: mono, fontSize: 10, letterSpacing: ".1em",
  textTransform: "uppercase", color: T.inkSoft, marginBottom: 5 };
const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${T.hairline}`,
  borderRadius: 6, background: "#fff", fontFamily: sans, fontSize: 14, color: T.ink, boxSizing: "border-box" };
const taStyle = { ...inputStyle, minHeight: 44, lineHeight: 1.45, resize: "vertical" };

export default function QapiEntry() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 24 }}>
      <style>{scopedCSS}</style>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: open ? T.teal : T.panel, color: open ? "#fff" : T.ink,
          border: `1px solid ${open ? T.teal : T.hairline}`, borderRadius: 10,
          padding: "14px 18px", fontFamily: sans, fontSize: 15, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span>＋ New weekly QAPI submission</span>
        <span style={{ fontFamily: mono, fontSize: 12, opacity: 0.8 }}>{open ? "Close" : "Enter from here"}</span>
      </button>
      {open && <QapiForm onDone={() => {}} />}
    </div>
  );
}

function QapiForm() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);

  const [facilityId, setFacilityId] = useState("");
  const [weekOf, setWeekOf] = useState(thisMonday());
  const [meetingDate, setMeetingDate] = useState(today());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [completedBy, setCompletedBy] = useState("");
  const [census, setCensus] = useState("");
  const [attendees, setAttendees] = useState("");

  const [answers, setAnswers] = useState({});   // itemId -> "yes"|"no"|"na"|number-string|text
  const [notes, setNotes] = useState({});       // itemId -> local note (never submitted)
  const [secNotes, setSecNotes] = useState({}); // sectionId -> local note (never submitted)
  const [followup, setFollowup] = useState({ focus: "", pips: "", owner: "", due: "" });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const topRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: facs, error: fErr } = await supabase
          .from("facilities").select("id, name, code, org_id")
          .eq("active", true).order("name");
        if (fErr) throw fErr;
        setFacilities(facs || []);
        if ((facs || []).length === 1) setFacilityId(String(facs[0].id));
        const { data: u } = await supabase.auth.getUser();
        if (u?.user) {
          const { data: prof } = await supabase.from("profiles")
            .select("full_name").eq("user_id", u.user.id).maybeSingle();
          if (prof?.full_name) setCompletedBy(prof.full_name);
        }
      } catch (e) {
        setLoadErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedFacility = useMemo(
    () => facilities.find((f) => String(f.id) === String(facilityId)) || null,
    [facilities, facilityId],
  );

  const isFlagged = (item) => !!item.flag && answers[item.id] === item.flag;
  const flags = useMemo(() => {
    const out = [];
    FORM.forEach((sec) => sec.items.forEach((it) => {
      if (isFlagged(it)) out.push({ section: sec.title, question: it.t, answer: labelOf(answers[it.id]), note: notes[it.id] || "" });
    }));
    return out;
  }, [answers, notes]);

  const setAns = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const setNum = (id, v) => { if (v === "" || /^\d+$/.test(v)) setAns(id, v); };

  /* ── build the aggregate payload — counts + flag Q/A only, NO narrative ── */
  function buildPayload() {
    const measures = { md_attended: answers.m1 === "yes" };
    for (const [k, id] of Object.entries(MEASURE_MAP)) {
      const v = answers[id];
      measures[k] = v === undefined || v === "" ? 0 : Number(v);
    }
    return {
      facility_code: selectedFacility.code || undefined,
      facility: selectedFacility.name,
      week_of: weekOf,
      meeting_date: meetingDate || null,
      completed_by: completedBy || null,
      facility_census: census === "" ? null : Number(census),
      measures,
      // flag question + answer travel (no note — the note is narrative and stays local)
      flags: flags.map((f) => ({ section: f.section, question: f.question, answer: f.answer })),
      followup: { owner: followup.owner || null },
      flag_count: flags.length,
      submitted_at: new Date().toISOString(),
    };
  }

  async function submit() {
    setError(null); setResult(null);
    if (!selectedFacility) { setError("Choose a facility first."); return; }
    const missing = [];
    if (!weekOf) missing.push("Week of");
    if (!meetingDate) missing.push("Meeting date");
    if (census === "") missing.push("Total facility census");
    if (missing.length) { setError("Fill in " + missing.join(", ") + " before submitting."); return; }

    setSubmitting(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("qapi-ingest", { body: buildPayload() });
      if (invokeErr) {
        let detail = invokeErr.message;
        try { const b = await invokeErr.context?.json?.(); if (b?.error) detail = b.error + (b.detail ? ` — ${b.detail}` : ""); } catch (_) {}
        throw new Error(detail);
      }
      if (data && data.ok === false) throw new Error(data.error || "Submission rejected.");
      setResult(data);
      if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── local PDF (full narrative) — opens a print window, never uploaded ── */
  function downloadPDF() {
    if (!selectedFacility) { setError("Choose a facility first."); return; }
    const rec = {
      facility: selectedFacility.name, code: selectedFacility.code,
      week_of: weekOf, meeting_date: meetingDate, start_time: startTime, end_time: endTime,
      completed_by: completedBy, facility_census: census, attendees,
    };
    const meta = `
      <table class="p-meta">
        <tr><td class="k">Facility</td><td>${escapeHtml(rec.facility)}</td><td class="k">Week of</td><td>${escapeHtml(rec.week_of || "—")}</td></tr>
        <tr><td class="k">Meeting date</td><td>${escapeHtml(rec.meeting_date || "—")}</td><td class="k">Time</td><td>${escapeHtml((rec.start_time || "—") + " to " + (rec.end_time || "—"))}</td></tr>
        <tr><td class="k">Completed by</td><td>${escapeHtml(rec.completed_by || "—")}</td><td class="k">Facility census</td><td>${escapeHtml(rec.facility_census !== "" ? String(rec.facility_census) : "—")}</td></tr>
        <tr><td class="k">Attendees</td><td colspan="3">${nl2br(rec.attendees || "—")}</td></tr>
      </table>`;
    const sections = FORM.map((sec, i) => {
      const rows = sec.items.map((it) => {
        const fl = isFlagged(it) ? ' class="p-flag"' : "";
        return `<tr${fl}><td>${escapeHtml(it.t)}</td><td class="a">${escapeHtml(labelOf(answers[it.id]))}</td><td class="n">${nl2br(notes[it.id] || "")}</td></tr>`;
      }).join("");
      const sn = secNotes[sec.id] ? `<tr><td colspan="3"><b>Notes:</b> ${nl2br(secNotes[sec.id])}</td></tr>` : "";
      return `<div class="p-sec"><h2>${String(i + 1).padStart(2, "0")} · ${escapeHtml(sec.title)}</h2><table class="p-tbl">${rows}${sn}</table></div>`;
    }).join("");
    const flagRows = flags.length
      ? flags.map((f) => `<tr class="p-flag"><td style="width:34mm">${escapeHtml(f.section)}</td><td>${escapeHtml(f.question)}</td><td class="a">${escapeHtml(f.answer)}</td><td class="n">${nl2br(f.note)}</td></tr>`).join("")
      : `<tr><td colspan="4">No items flagged for follow-up.</td></tr>`;
    const followupTbl = `
      <table class="p-tbl" style="margin-top:3mm">
        <tr><td class="a" style="width:34mm;text-align:left">Areas of focus</td><td>${nl2br(followup.focus || "—")}</td></tr>
        <tr><td class="a" style="text-align:left">PIPs</td><td>${nl2br(followup.pips || "—")}</td></tr>
        <tr><td class="a" style="text-align:left">Owner</td><td>${escapeHtml(followup.owner || "—")}</td></tr>
        <tr><td class="a" style="text-align:left">Target date</td><td>${escapeHtml(followup.due || "—")}</td></tr>
      </table>`;
    const css = `
      body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;margin:0;padding:14mm}
      .p-eyebrow{font-size:9pt;letter-spacing:.14em;text-transform:uppercase;color:#0F5C63;margin:0 0 1mm}
      .p-h1{font-size:16pt;margin:0 0 4mm}
      .p-meta{width:100%;border-collapse:collapse;margin-bottom:5mm;font-size:10pt}
      .p-meta td{border:1px solid #999;padding:2mm 3mm}
      .p-meta td.k{background:#F0F0F0;font-weight:bold;width:26mm;white-space:nowrap}
      .p-sec{page-break-inside:avoid;margin-bottom:4mm}
      .p-sec h2{font-size:12pt;margin:0 0 1.5mm;border-bottom:1.5pt solid #000;padding-bottom:1mm}
      .p-tbl{width:100%;border-collapse:collapse;font-size:9.5pt}
      .p-tbl td{border:1px solid #999;padding:1.6mm 2.5mm;vertical-align:top}
      .p-tbl td.a{width:20mm;text-align:center;font-weight:bold}
      .p-tbl td.n{width:62mm;color:#333}
      .p-flag{background:#F7EDE6}
      .p-sign{margin-top:8mm;font-size:10pt}
      .p-sign div{border-top:1px solid #000;width:70mm;padding-top:1.5mm;margin-top:12mm;display:inline-block;margin-right:12mm}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QAPI-${escapeHtml(rec.code)}-week-of-${escapeHtml(rec.week_of || today())}</title><style>${css}</style></head><body>
      <p class="p-eyebrow">Spectrum Healthcare Solutions</p>
      <h1 class="p-h1">Weekly QAPI Review</h1>
      ${meta}${sections}
      <div class="p-sec"><h2>11 · Follow-Up Items</h2><table class="p-tbl">${flagRows}</table>${followupTbl}</div>
      <div class="p-sign"><div>Administrator</div><div>Director of Nursing</div><div>Medical Director</div></div>
      </body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      // popup blocked — fall back to a local file download
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `QAPI-${rec.code}-week-of-${rec.week_of || today()}.html`;
      a.click();
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }

  if (loading) return <div style={{ fontFamily: sans, color: T.inkSoft, padding: 20 }}>Loading form…</div>;
  if (loadErr) return <div style={{ fontFamily: sans, color: T.alert, padding: 20 }}>Couldn’t load the form: {loadErr}</div>;
  if (!facilities.length) return <div style={{ fontFamily: sans, color: T.inkSoft, padding: 20 }}>No facilities in your scope.</div>;

  const card = { background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 10, marginTop: 14, overflow: "hidden" };
  const secHead = { display: "flex", alignItems: "baseline", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${T.tealSoft}` };

  return (
    <div ref={topRef} style={{ fontFamily: sans, color: T.ink, marginTop: 6 }}>
      {/* meeting header */}
      <div style={{ ...card, marginTop: 0, padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))", gap: "12px 18px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Facility</span>
            <select style={inputStyle} value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="">— choose —</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}{f.code ? ` (${f.code})` : ""}</option>)}
            </select>
          </div>
          <label><span style={fieldLabel}>Week of</span><input type="date" style={inputStyle} value={weekOf} onChange={(e) => setWeekOf(e.target.value)} /></label>
          <label><span style={fieldLabel}>Meeting date</span><input type="date" style={inputStyle} value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} /></label>
          <label><span style={fieldLabel}>Start time</span><input type="time" style={inputStyle} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
          <label><span style={fieldLabel}>End time</span><input type="time" style={inputStyle} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
          <label><span style={fieldLabel}>Completed by</span><input type="text" style={inputStyle} value={completedBy} onChange={(e) => setCompletedBy(e.target.value)} placeholder="Name and title" /></label>
          <label><span style={fieldLabel}>Total facility census</span><input type="number" min="0" step="1" style={{ ...inputStyle, fontFamily: mono }} value={census} onChange={(e) => setCensus(e.target.value)} placeholder="All guests in the building" /></label>
          <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Attendees <span style={{ textTransform: "none", letterSpacing: 0, color: T.inkSoft }}>· stays on this device, not submitted</span></span>
            <textarea style={taStyle} value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="One per line — name and role" /></label>
        </div>
      </div>

      {/* sections */}
      {FORM.map((sec, i) => (
        <div key={sec.id} style={card}>
          <div style={secHead}>
            <span style={{ fontFamily: mono, fontSize: 11, color: T.inkSoft }}>{String(i + 1).padStart(2, "0")}</span>
            <h3 style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, margin: 0 }}>{sec.title}</h3>
            <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: sec.items.some(isFlagged) ? T.flag : T.inkSoft }}>
              {sec.items.filter(isFlagged).length ? `${sec.items.filter(isFlagged).length} flagged` : ""}
            </span>
          </div>
          <div style={{ padding: "4px 18px 12px" }}>
            {sec.items.map((it) => (
              <div key={it.id} className={`qe-row${isFlagged(it) ? " flagged" : ""}`} style={{ padding: "11px 0", borderBottom: `1px solid ${T.tealSoft}` }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 14 }}>{it.t}</div>
                    {it.h && <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>{it.h}</div>}
                  </div>
                  {it.type === "yn" && (
                    <div className="qe-seg">
                      {[["yes", "Yes"], ["no", "No"], ["na", "N/A"]].map(([v, lab]) => (
                        <button key={v} type="button" aria-pressed={answers[it.id] === v} onClick={() => setAns(it.id, v)}>{lab}</button>
                      ))}
                    </div>
                  )}
                  {it.type === "num" && (
                    <input type="text" inputMode="numeric" style={{ ...inputStyle, fontFamily: mono, textAlign: "right", width: 108, flex: "0 0 108px" }}
                      value={answers[it.id] ?? ""} onChange={(e) => setNum(it.id, e.target.value)} placeholder="0" />
                  )}
                </div>
                {it.type === "text" && (
                  <input type="text" style={{ ...inputStyle, marginTop: 8 }} value={answers[it.id] ?? ""} onChange={(e) => setAns(it.id, e.target.value)} />
                )}
                {it.type === "longtext" && (
                  <textarea style={{ ...taStyle, marginTop: 8 }} value={answers[it.id] ?? ""} onChange={(e) => setAns(it.id, e.target.value)} />
                )}
                {(it.type === "yn" || it.type === "num") && (
                  <textarea style={{ ...taStyle, marginTop: 8 }} value={notes[it.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                    placeholder="Note — stays on this device (resident detail is never submitted)" />
                )}
              </div>
            ))}
            <div style={{ paddingTop: 11 }}>
              <span style={fieldLabel}>Section notes <span style={{ textTransform: "none", letterSpacing: 0 }}>· local</span></span>
              <textarea style={taStyle} value={secNotes[sec.id] ?? ""} onChange={(e) => setSecNotes((s) => ({ ...s, [sec.id]: e.target.value }))}
                placeholder={`Discussion, trends, and decisions for ${sec.title.toLowerCase()}`} />
            </div>
          </div>
        </div>
      ))}

      {/* follow-up */}
      <div style={{ ...card, borderColor: T.flag }}>
        <div style={{ ...secHead, background: T.flagSoft, borderBottomColor: "#EBD5C6" }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: T.flag }}>11</span>
          <h3 style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, margin: 0, color: T.flag }}>Follow-Up Items</h3>
          <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: T.inkSoft }}>{flags.length ? `${flags.length} flagged` : "clear"}</span>
        </div>
        <div style={{ padding: "12px 18px" }}>
          {flags.length === 0
            ? <div style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 12 }}>Nothing flagged yet. Items answered in a way that needs follow-up collect here automatically.</div>
            : (
              <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {flags.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, borderLeft: `3px solid ${T.flag}`, background: T.flagSoft, borderRadius: "0 6px 6px 0", padding: "7px 11px" }}>
                    <span style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", color: T.flag }}>{f.section}</span>
                    <span>{f.question} <b>· {f.answer}</b></span>
                  </div>
                ))}
              </div>
            )}
          <div style={{ display: "grid", gap: 12 }}>
            <label><span style={fieldLabel}>Areas of focus <span style={{ textTransform: "none", letterSpacing: 0 }}>· local</span></span>
              <textarea style={taStyle} value={followup.focus} onChange={(e) => setFollowup((f) => ({ ...f, focus: e.target.value }))} /></label>
            <label><span style={fieldLabel}>New or updated PIPs <span style={{ textTransform: "none", letterSpacing: 0 }}>· local</span></span>
              <textarea style={taStyle} value={followup.pips} onChange={(e) => setFollowup((f) => ({ ...f, pips: e.target.value }))} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label><span style={fieldLabel}>Owner</span><input type="text" style={inputStyle} value={followup.owner} onChange={(e) => setFollowup((f) => ({ ...f, owner: e.target.value }))} placeholder="Who is accountable" /></label>
              <label><span style={fieldLabel}>Target date</span><input type="text" style={inputStyle} value={followup.due} onChange={(e) => setFollowup((f) => ({ ...f, due: e.target.value }))} placeholder="e.g. next QAPI meeting" /></label>
            </div>
          </div>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
        <button onClick={submit} disabled={submitting}
          style={{ background: T.teal, color: "#fff", border: "none", borderRadius: 6, padding: "12px 22px",
            fontSize: 15, fontWeight: 600, fontFamily: sans, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Submitting…" : "Submit review"}
        </button>
        <button onClick={downloadPDF}
          style={{ background: "#fff", color: T.ink, border: `1px solid ${T.hairline}`, borderRadius: 6, padding: "12px 18px", fontSize: 14, fontFamily: sans, cursor: "pointer" }}>
          Download PDF
        </button>
        <span style={{ fontSize: 12.5, color: T.inkSoft }}>
          {flags.length ? `${flags.length} flagged for follow-up · ` : ""}counts submit to the dashboard; the PDF (with notes) stays on this device.
        </span>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "11px 13px", borderRadius: 8, fontSize: 13.5, background: "#FBEEED", color: T.alert, border: "1px solid #F0D3D0" }}>{error}</div>
      )}
      {result && (
        <div style={{ marginTop: 14, padding: "11px 13px", borderRadius: 8, fontSize: 13.5, background: "#EEF4F0", color: T.green, border: "1px solid #D5E5DB" }}>
          Saved for week of {result.week_of} — {result.measures_stored} measures, {result.flags_stored} flags recorded.
          {Array.isArray(result.warnings) && result.warnings.length > 0 && (
            <ul style={{ margin: "8px 0 0 18px", color: T.flag }}>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
