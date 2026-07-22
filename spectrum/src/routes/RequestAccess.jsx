import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestAccess, listOrganizations } from "../lib/api.js";
import { T, fontStyles, Label, Banner } from "../ui.jsx";

export default function RequestAccess() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgs, setOrgs] = useState([]);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    listOrganizations().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr(null);
    try {
      await requestAccess(email, pw, orgSlug);
      setOk(true);
    } catch (e2) {
      setErr(e2?.message || "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ed-ui" style={{ minHeight: "100vh", background: T.mist, color: T.ink,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{fontStyles}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 18px" }}>Request access</h1>
        {ok ? (
          <div className="ed-card" style={{ padding: 22 }}>
            <Banner tone="info">Account created. An administrator will review your request.</Banner>
            <p style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 0 }}>
              You'll be able to sign in once your access is approved.
            </p>
            <button className="ed-btn ed-btn-primary" onClick={() => nav("/login")} style={{ width: "100%" }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form className="ed-card" style={{ padding: 22 }} onSubmit={submit}>
            {err && <Banner onClose={() => setErr(null)}>{err}</Banner>}
            <div style={{ marginBottom: 14 }}>
              <Label>Email</Label>
              <input className="ed-in" type="email" autoComplete="username"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Password</Label>
              <input className="ed-in" type="password" autoComplete="new-password"
                value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Organization</Label>
              <select className="ed-in" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)}>
                <option value="">Select your organization…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.slug}>{o.display_name}</option>
                ))}
              </select>
            </div>
            <button className="ed-btn ed-btn-primary" style={{ width: "100%" }}
              disabled={busy || !email || !pw}>
              {busy ? "Submitting…" : "Request access"}
            </button>
            <p style={{ fontSize: 13, color: T.inkSoft, marginTop: 14, marginBottom: 0, textAlign: "center" }}>
              Already have an account? <Link to="/login" style={{ color: T.teal, fontWeight: 600 }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
