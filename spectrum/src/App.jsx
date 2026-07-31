import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import { Loading } from "./ui.jsx";
import Login from "./routes/Login.jsx";
import RequestAccess from "./routes/RequestAccess.jsx";
import Executive from "./routes/Executive.jsx";
import Admin from "./routes/Admin.jsx";
import MedicalDirector from "./routes/MedicalDirector.jsx";

function Protected({ children, adminOnly = false }) {
  const { session, profile, loading, isAdmin, isApproved } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isApproved && !isAdmin) return <PendingScreen status={profile?.status} />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function PendingScreen({ status }) {
  const msg = status === "rejected"
    ? "Your access request was not approved. Contact your administrator."
    : status === "suspended"
    ? "Your account has been suspended. Contact your administrator."
    : "Your account is pending approval. You'll get access once an administrator approves it.";
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F2F6F7", color: "#132A2E", fontFamily: "Archivo, system-ui, sans-serif",
      padding: 24, textAlign: "center",
    }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>Access pending</h1>
        <p style={{ fontSize: 14, color: "#5C7276", lineHeight: 1.5 }}>{msg}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/request-access" element={<RequestAccess />} />
        <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
        <Route path="/admin/md-time" element={<Protected adminOnly><MedicalDirector /></Protected>} />
        <Route path="/" element={<Protected><Executive /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
