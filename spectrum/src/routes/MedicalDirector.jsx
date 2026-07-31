import React from "react";
import { Link } from "react-router-dom";

const T = {
  mist: "#F2F6F7",
  panel: "#FFFFFF",
  ink: "#132A2E",
  inkSoft: "#5C7276",
  teal: "#0E7C86",
  hairline: "#DCE7E9",
};

const wrapStyle = {
  minHeight: "100vh",
  background: T.mist,
  color: T.ink,
  fontFamily: "Archivo, system-ui, sans-serif",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  background: T.panel,
  borderBottom: "1px solid " + T.hairline,
  padding: "14px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const eyebrowStyle = {
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: T.teal,
  fontWeight: 800,
};

const titleStyle = { fontSize: 22, fontWeight: 800, margin: "3px 0 0", lineHeight: 1.1 };

const btnStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#FFFFFF",
  background: T.teal,
  padding: "9px 16px",
  borderRadius: 99,
  textDecoration: "none",
};

const backStyle = { fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: "none" };

const frameStyle = { flex: 1, width: "100%", border: 0, display: "block", minHeight: 600 };

export default function MedicalDirector() {
  return (
    <div style={wrapStyle}>
      <header style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Admin tools</div>
          <h1 style={titleStyle}>Medical Director Time Record</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/mdtimerecord.html" target="_blank" rel="noreferrer" style={btnStyle}>Open full screen</a>
          <Link to="/" style={backStyle}>Back to dashboard</Link>
        </div>
      </header>
      <iframe src="/mdtimerecord.html" title="Medical Director Time Record" style={frameStyle} />
    </div>
  );
}
