import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { T, fontStyles, Banner } from "../ui.jsx";

export default function Admin() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, status, role, org_id, requested_org_id, created_at")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    setRows(data || []);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    const { error } = await supabase.rpc("set_user_status", { p_user: id, p_status: status });
    if (error) { setErr(error.message); return; }
    load();
  };

  return (
    <div className="ed-ui" style={{ minHeight: "100vh", background: T.mist, color: T.ink, padding: "24px 32px" }}>
      <style>{fontStyles}</style>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px" }}>Access administration</h1>
      {err && <Banner onClose={() => setErr(null)}>{err}</Banner>}
      <div className="ed-card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hairline}`, background: "#F7FAFB" }}>
              {["Email", "Status", "Role", "Actions"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10.5,
                  letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkSoft, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <td style={{ padding: "12px 16px", fontSize: 13.5, fontWeight: 600 }}>{r.email}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{r.status}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: T.inkSoft }}>{r.role || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  {r.status === "pending" && (
                    <>
                      <button className="ed-btn ed-btn-primary" style={{ padding: "6px 12px", marginRight: 8 }}
                        onClick={() => act(r.id, "approved")}>Approve</button>
                      <button className="ed-btn ed-btn-ghost" style={{ padding: "6px 12px" }}
                        onClick={() => act(r.id, "rejected")}>Reject</button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <button className="ed-btn ed-btn-ghost" style={{ padding: "6px 12px" }}
                      onClick={() => act(r.id, "suspended")}>Suspend</button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !busy && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: T.inkSoft, fontSize: 13 }}>
                No users yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
