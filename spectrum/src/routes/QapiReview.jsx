import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useScope } from "../lib/scope.jsx";

/**
 * QapiReview — admin-only approval queue for QAPI submissions.
 *
 * Submissions filed from the browser by anyone who is not role='admin'
 * (partners, managers) land in qapi_submissions with review_state='pending'.
 * They supersede nothing and appear in no reporting view until an admin
 * approves them here. The supersede of the prior live week is performed
 * inside the qapi_review_submission() RPC, atomically, at approval time.
 *
 * Desktop shared-secret submissions and admin browser submissions bypass
 * this queue entirely and commit directly.
 */
export default function QapiReview() {
  const { isAdmin } = useScope();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("qapi_pending_review")
      .select("*")
      .order("submitted_at", { ascending: true });
    if (error) setErr(error.message);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  // Admin-only. Non-admins get nothing rendered; the view and the RPC both
  // enforce this server-side as well, so this is presentation, not security.
  if (!isAdmin) return null;

  async function loadDetail(submissionId) {
    if (details[submissionId]) return;
    const { data, error } = await supabase
      .from("qapi_values")
      .select("numerator, qapi_metrics(key, label, unit, section)")
      .eq("submission_id", submissionId);
    if (!error) {
      setDetails((d) => ({ ...d, [submissionId]: data || [] }));
    }
  }

  function toggle(submissionId) {
    const next = expanded === submissionId ? null : submissionId;
    setExpanded(next);
    if (next) loadDetail(next);
  }

  async function review(submissionId, action) {
    const label = action === "approve" ? "Approve" : "Reject";
    const row = rows.find((r) => r.submission_id === submissionId);
    const warn =
      action === "approve" && row?.would_replace_existing
        ? `\n\nThis will REPLACE the submission already on file for ${row.facility_name}, week of ${row.week_of}. The replaced record is retained, not deleted.`
        : "";
    if (!window.confirm(`${label} this submission?${warn}`)) return;

    let note = null;
    if (action === "reject") {
      note = window.prompt("Reason for rejection (optional, stored on the record):", "");
      if (note === null) return;
    }

    setBusy(submissionId);
    const { data, error } = await supabase.rpc("qapi_review_submission", {
      p_submission_id: submissionId,
      p_action: action,
      p_note: note || null,
    });
    setBusy(null);

    if (error) {
      setToast({ kind: "err", text: error.message });
    } else {
      setToast({
        kind: "ok",
        text:
          data?.action === "approved"
            ? data?.superseded
              ? "Approved — replaced the previous submission for that week."
              : "Approved."
            : "Rejected — the record is retained with your note.",
      });
      await load();
    }
    setTimeout(() => setToast(null), 6000);
  }

  const pill = (text, tone) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background:
          tone === "warn" ? "#FEF3C7" : tone === "info" ? "#E0F2FE" : "#F1F5F9",
        color: tone === "warn" ? "#92400E" : tone === "info" ? "#075985" : "#475569",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );

  return (
    <section
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        background: "#fff",
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: rows.length || loading || err ? "1px solid #E2E8F0" : "none",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
          QAPI submissions awaiting review
        </h3>
        {rows.length > 0 &&
          pill(`${rows.length} pending`, rows.length > 0 ? "warn" : "info")}
        <button
          onClick={load}
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 7,
            border: "1px solid #CBD5E1",
            background: "#fff",
            cursor: "pointer",
            color: "#475569",
          }}
        >
          Refresh
        </button>
      </header>

      {toast && (
        <div
          style={{
            padding: "10px 18px",
            fontSize: 13,
            background: toast.kind === "ok" ? "#ECFDF5" : "#FEF2F2",
            color: toast.kind === "ok" ? "#065F46" : "#991B1B",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          {toast.text}
        </div>
      )}

      {loading && (
        <div style={{ padding: "16px 18px", fontSize: 13, color: "#64748B" }}>
          Loading queue…
        </div>
      )}

      {err && (
        <div style={{ padding: "16px 18px", fontSize: 13, color: "#991B1B" }}>
          Could not load the review queue: {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div style={{ padding: "16px 18px", fontSize: 13, color: "#64748B" }}>
          Nothing waiting. Submissions filed from the dashboard by partners appear
          here before they reach any reporting view.
        </div>
      )}

      {!loading &&
        rows.map((r) => {
          const open = expanded === r.submission_id;
          const vals = details[r.submission_id];
          return (
            <div
              key={r.submission_id}
              style={{ borderBottom: "1px solid #F1F5F9", padding: "12px 18px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => toggle(r.submission_id)}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0F172A",
                    textAlign: "left",
                  }}
                >
                  {open ? "▾" : "▸"} {r.facility_name}
                </button>
                {pill(r.org_name || "—", "info")}
                <span style={{ fontSize: 13, color: "#475569" }}>
                  week of {r.week_of}
                </span>
                {r.would_replace_existing && pill("would replace existing", "warn")}
                {r.days_waiting > 2 && pill(`waiting ${r.days_waiting}d`, "warn")}

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    disabled={busy === r.submission_id}
                    onClick={() => review(r.submission_id, "reject")}
                    style={{
                      fontSize: 12,
                      padding: "6px 14px",
                      borderRadius: 7,
                      border: "1px solid #FCA5A5",
                      background: "#fff",
                      color: "#B91C1C",
                      cursor: "pointer",
                    }}
                  >
                    Reject
                  </button>
                  <button
                    disabled={busy === r.submission_id}
                    onClick={() => review(r.submission_id, "approve")}
                    style={{
                      fontSize: 12,
                      padding: "6px 14px",
                      borderRadius: 7,
                      border: "1px solid #059669",
                      background: "#059669",
                      color: "#fff",
                      cursor: "pointer",
                      opacity: busy === r.submission_id ? 0.6 : 1,
                    }}
                  >
                    {busy === r.submission_id ? "Working…" : "Approve"}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                filed by {r.submitted_by_email || r.completed_by || "unknown"}
                {r.submitted_by_role ? ` (${r.submitted_by_role})` : ""} ·{" "}
                {new Date(r.submitted_at).toLocaleString()} · census{" "}
                {r.facility_census ?? "—"} · {r.flag_count} flag
                {r.flag_count === 1 ? "" : "s"} · MD{" "}
                {r.md_attended ? "attended" : "absent"}
              </div>

              {open && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "#F8FAFC",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  {!vals && <span style={{ color: "#64748B" }}>Loading values…</span>}
                  {vals && vals.length === 0 && (
                    <span style={{ color: "#64748B" }}>
                      No metric values on this submission.
                    </span>
                  )}
                  {vals && vals.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {vals.map((v, i) => (
                          <tr key={i}>
                            <td style={{ padding: "3px 0", color: "#475569" }}>
                              {v.qapi_metrics?.label || v.qapi_metrics?.key}
                            </td>
                            <td
                              style={{
                                padding: "3px 0",
                                textAlign: "right",
                                fontWeight: 600,
                                color: "#0F172A",
                              }}
                            >
                              {v.numerator}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {r.report_link && (
                    <div style={{ marginTop: 8 }}>
                      <a
                        href={r.report_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: "#0369A1" }}
                      >
                        Open submitted report
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </section>
  );
}
