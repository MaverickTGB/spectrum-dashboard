import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { T, fontStyles, Label, Banner } from "../ui.jsx";

/* Snap any date to the Monday of its week — qapi_start_week is always a Monday,
   matching thisMonday()/weekLabel() elsewhere in the app. */
const isoOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const mondayOf = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const off = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - off);
  return isoOf(dt);
};

const BLANK = { name: "", orgId: "", code: "", ccn: "", facilityType: "snf", qapiRequired: true, startWeek: "" };

const FACILITY_TYPES = [
  { value: "snf", label: "Skilled Nursing" },
  { value: "al", label: "Assisted Living" },
];
const typeLabel = (t) => (FACILITY_TYPES.find((x) => x.value === t)?.label || t || "—");

function qapiStatus(f) {
  if (!f.qapi_required) return "Not required";
  if (!f.qapi_start_week) return "Not in rollout";
  return `Rollout ${f.qapi_start_week}`;
}

export default function Facilities() {
  const [orgs, setOrgs] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [added, setAdded] = useState(null); // the facility just inserted

  const orgName = useMemo(() => {
    const m = {};
    orgs.forEach((o) => { m[o.id] = o.display_name; });
    return m;
  }, [orgs]);

  const load = async () => {
    setErr(null);
    const [o, f] = await Promise.all([
      supabase.from("organizations").select("id, display_name, org_type").order("display_name"),
      supabase.from("facilities")
        .select("id, name, code, ccn, facility_type, qapi_required, qapi_start_week, org_id, active")
        .order("name"),
    ]);
    if (o.error) setErr(o.error.message);
    else setOrgs(o.data || []);
    if (f.error) setErr(f.error.message);
    else setFacilities(f.data || []);
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((s) => ({ ...s, [k]: v }));
  };

  const submit = async () => {
    setErr(null); setAdded(null);
    const name = form.name.trim();
    const code = form.code.trim();
    const ccn = form.ccn.trim();

    if (!name) return setErr("Enter a facility name.");
    if (!form.orgId) return setErr("Choose a partner organization.");
    if (!code) return setErr("Enter a facility code — the workers and QAPI form both join on it.");

    // Guard the Ignite-style prefix collision: block an exact code that already exists.
    const dupe = facilities.find(
      (x) => x.code && x.code.toLowerCase() === code.toLowerCase()
    );
    if (dupe) return setErr(`Code "${code}" already belongs to ${dupe.name}. Codes must be unique.`);

    setBusy(true);
    const payload = {
      name,
      org_id: Number(form.orgId),
      code,
      ccn: ccn || null,
      facility_type: form.facilityType,
      qapi_required: form.qapiRequired,
      qapi_start_week: form.startWeek ? mondayOf(form.startWeek) : null,
    };
    const { data, error } = await supabase
      .from("facilities")
      .insert(payload)
      .select("id, name, code, ccn, facility_type, qapi_required, qapi_start_week, org_id")
      .single();
    setBusy(false);

    if (error) { setErr(error.message); return; }
    setAdded(data);
    setForm(BLANK);
    load();
  };

  const nameClash = form.name.trim() &&
    facilities.some((x) => x.name.toLowerCase() === form.name.trim().toLowerCase());

  return (
    <div className="ed-ui" style={{ minHeight: "100vh", background: T.mist, color: T.ink, padding: "24px 32px" }}>
      <style>{fontStyles}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Facilities</h1>
        <Link to="/admin" style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: "none" }}>
          ← Access administration
        </Link>
      </div>

      {err && <Banner onClose={() => setErr(null)}>{err}</Banner>}

      {added && (
        <div className="ed-card" style={{ padding: 18, marginBottom: 20, borderLeft: `4px solid ${T.teal}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {added.name} is live on the dashboard.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.inkSoft, lineHeight: 1.7 }}>
            <li>Visible now under <strong>{orgName[added.org_id] || "its partner"}</strong> — empty states show until data arrives.</li>
            <li>Code <strong>{added.code}</strong> — drop this facility's workbook in the worker folder so <code>aggregate.py</code> picks it up.</li>
            <li>{added.ccn
              ? <>CCN <strong>{added.ccn}</strong> — CMS stars fill in on the next <code>cms_fetch.py</code> run.</>
              : <>No CCN yet — the heatmap reads "No CCN on file" until you add one.</>}</li>
            <li>{added.qapi_required
              ? <><strong>QAPI form:</strong> generate this building's form (see the note below) and send it to the facility.</>
              : <>QAPI not required for this building — no weekly form.</>}</li>
          </ul>
        </div>
      )}

      {/* ——— Add facility ——— */}
      <div className="ed-card" style={{ padding: 22, marginBottom: 26, maxWidth: 640 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.teal, fontWeight: 800, marginBottom: 16 }}>
          Add a building
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Facility name</Label>
          <input className="ed-in" value={form.name} onChange={set("name")} placeholder="e.g. Park Place Health &amp; Rehab" />
          {nameClash && (
            <div style={{ fontSize: 11.5, color: T.amber, marginTop: 6 }}>
              A facility with this name already exists — double-check this isn't a duplicate.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Partner organization</Label>
          <select className="ed-in" value={form.orgId} onChange={set("orgId")}>
            <option value="">Select partner…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.display_name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Facility type</Label>
          <select className="ed-in" value={form.facilityType} onChange={set("facilityType")}>
            {FACILITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>Assisted living skips the skilled-census requirement in the workers.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <Label>Facility code</Label>
            <input className="ed-in" value={form.code} onChange={set("code")} placeholder="e.g. PP" />
            <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>Join key for workbooks + QAPI form. Must be unique.</div>
          </div>
          <div>
            <Label>CCN <span style={{ textTransform: "none", letterSpacing: 0, color: T.inkSoft, fontWeight: 400 }}>(optional)</span></Label>
            <input className="ed-in" value={form.ccn} onChange={set("ccn")} placeholder="6-digit CMS number" />
            <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>Leave blank until CMS issues it.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20, alignItems: "start" }}>
          <div>
            <Label>QAPI start week <span style={{ textTransform: "none", letterSpacing: 0, color: T.inkSoft, fontWeight: 400 }}>(optional)</span></Label>
            <input className="ed-in" type="date" value={form.startWeek} onChange={set("startWeek")} disabled={!form.qapiRequired} />
            <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>Blank = not in rollout yet. Snaps to that week's Monday.</div>
          </div>
          <div style={{ paddingTop: 26 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={form.qapiRequired} onChange={set("qapiRequired")} style={{ width: 16, height: 16, accentColor: T.teal }} />
              Holds a weekly QAPI review
            </label>
            <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>Uncheck for rehab hospitals / LTACs.</div>
          </div>
        </div>

        <button className="ed-btn ed-btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Adding…" : "Add facility"}
        </button>
      </div>

      {/* ——— Current facilities ——— */}
      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              {["Facility", "Partner", "Type", "Code", "CCN", "QAPI"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => (
              <tr key={f.id} style={{ borderBottom: `1px solid ${T.hairline}`, opacity: f.active ? 1 : 0.5 }}>
                <td style={{ padding: "11px 16px", fontSize: 13.5, fontWeight: 600 }}>{f.name}</td>
                <td style={{ padding: "11px 16px", fontSize: 13, color: T.inkSoft }}>{orgName[f.org_id] || "—"}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: T.inkSoft }}>{typeLabel(f.facility_type)}</td>
                <td className="ed-num" style={{ padding: "11px 16px", fontSize: 12.5 }}>{f.code || "—"}</td>
                <td className="ed-num" style={{ padding: "11px 16px", fontSize: 12.5, color: f.ccn ? T.ink : T.amber }}>{f.ccn || "—"}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: T.inkSoft }}>{qapiStatus(f)}</td>
              </tr>
            ))}
            {!facilities.length && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: T.inkSoft, fontSize: 13 }}>No facilities yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
