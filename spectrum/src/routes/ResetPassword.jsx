import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { requestPasswordReset, setNewPassword } from "../lib/api.js";
import { T, fontStyles, Label, Banner } from "../ui.jsx";

const MIN_LEN = 12;

/* Password recovery.

   Dual-mode by design:
     - No session  → ask for an email address and send a recovery link.
     - Session     → the recovery link has been followed; collect a new password.

   Note on timing: the recovery link arrives with a token in the URL, and
   supabase-js exchanges it for a session during client init (detectSessionInUrl
   defaults to true). That exchange can finish BEFORE this component mounts, so
   we check getSession() as well as subscribing to onAuthStateChange — relying on
   the PASSWORD_RECOVERY event alone loses the race intermittently.

   This route must stay OUTSIDE <Protected>. A user with status='pending' still
   needs to be able to set a password. */

export default function ResetPassword() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [err, setErr] = useState(null);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data?.session) setHasSession(true);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
        setChecking(false);
      }
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const sendLink = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e2) {
      setErr(e2?.message || "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e?.preventDefault();
    setErr(null);

    if (pw.length < MIN_LEN) {
      setErr(`Use at least ${MIN_LEN} characters.`);
      return;
    }
    if (pw !== pw2) {
      setErr("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await setNewPassword(pw);
      setDone(true);
    } catch (e2) {
      setErr(e2?.message || "Could not update the password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  };

  const shell = (children) => (
    <div className="ed-ui" style={{
      minHeight: "100vh", background: T.mist, color: T.ink,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <style>{fontStyles}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
    </div>
  );

  if (checking) {
    return shell(
      <div className="ed-card" style={{ padding: 22, fontSize: 13.5, color: T.inkSoft }}>
        Checking your reset link…
      </div>
    );
  }

  /* ——— Password set successfully ——— */
  if (done) {
    return shell(
      <>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 18px" }}>Password updated</h1>
        <div className="ed-card" style={{ padding: 22 }}>
          <Banner tone="info">Your password has been changed.</Banner>
          <p style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 0 }}>
            You're signed in on this device. Any other devices where you were already
            signed in stay signed in — sign out there manually if that matters.
          </p>
          <button className="ed-btn ed-btn-primary" style={{ width: "100%" }}
            onClick={() => nav("/")}>
            Go to the dashboard
          </button>
        </div>
      </>
    );
  }

  /* ——— Recovery link followed: collect a new password ——— */
  if (hasSession) {
    return shell(
      <>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Set a new password</h1>
        <p style={{ fontSize: 13.5, color: T.inkSoft, margin: "0 0 18px" }}>
          At least {MIN_LEN} characters. Don't reuse a password from another system.
        </p>
        <form className="ed-card" style={{ padding: 22 }} onSubmit={savePassword}>
          {err && <Banner onClose={() => setErr(null)}>{err}</Banner>}
          <div style={{ marginBottom: 14 }}>
            <Label>New password</Label>
            <input className="ed-in" type="password" autoComplete="new-password"
              value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label>Confirm new password</Label>
            <input className="ed-in" type="password" autoComplete="new-password"
              value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <button className="ed-btn ed-btn-primary" style={{ width: "100%" }}
            disabled={busy || !pw || !pw2}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      </>
    );
  }

  /* ——— No session: request a recovery email ——— */
  return shell(
    <>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 18px" }}>Reset your password</h1>
      {sent ? (
        <div className="ed-card" style={{ padding: 22 }}>
          <Banner tone="info">If that address has an account, a reset link is on its way.</Banner>
          <p style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 0 }}>
            The link expires after a short time. Check spam if it doesn't arrive.
          </p>
          <button className="ed-btn ed-btn-primary" style={{ width: "100%" }}
            onClick={() => nav("/login")}>
            Back to sign in
          </button>
        </div>
      ) : (
        <form className="ed-card" style={{ padding: 22 }} onSubmit={sendLink}>
          {err && <Banner onClose={() => setErr(null)}>{err}</Banner>}
          <div style={{ marginBottom: 20 }}>
            <Label>Email</Label>
            <input className="ed-in" type="email" autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="ed-btn ed-btn-primary" style={{ width: "100%" }}
            disabled={busy || !email}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p style={{ fontSize: 13, color: T.inkSoft, marginTop: 14, marginBottom: 0, textAlign: "center" }}>
            Remembered it? <Link to="/login" style={{ color: T.teal, fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      )}
    </>
  );
}
