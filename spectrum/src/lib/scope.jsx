import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";
import { useAuth } from "./auth.jsx";

/* Client-view scope.
   Spectrum admins see every facility by default. Selecting an organisation
   narrows every tab to that client's buildings and hides Spectrum-internal
   panels, so the dashboard can be screen-shared during a client meeting.

   NOTE: this is a presentation control, not a security boundary. RLS still
   allows an admin session to read the whole portfolio, so the network
   responses contain every facility. For a hard boundary, present from a
   partner login instead. */

const KEY = "spectrum.orgScope";

const T = {
  ink: "#132A2E", inkSoft: "#5C7276", teal: "#0E7C86", tealSoft: "#E4F1F2",
  amber: "#B07C1F", hairline: "#DCE7E9", panel: "#FFFFFF",
};

const ScopeCtx = createContext({
  isAdmin: false, orgs: [], orgId: null, setOrgId: () => {}, scoped: false, orgName: null,
});

export function ScopeProvider({ children }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgIdState] = useState(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      return v ? Number(v) : null;
    } catch { return null; }
  });

  const setOrgId = (v) => {
    const n = v == null || v === "" ? null : Number(v);
    setOrgIdState(n);
    try {
      if (n == null) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, String(n));
    } catch { /* private browsing */ }
  };

  useEffect(() => {
    if (!isAdmin) { setOrgs([]); return; }
    let alive = true;
    supabase.from("organizations")
      .select("id, display_name, slug, partner_login")
      .order("display_name")
      .then(({ data }) => { if (alive) setOrgs(data || []); });
    return () => { alive = false; };
  }, [isAdmin]);

  // Partner accounts are already scoped by RLS — never double-scope them.
  const effectiveOrgId = isAdmin ? orgId : null;
  const orgName = useMemo(
    () => orgs.find((o) => o.id === effectiveOrgId)?.display_name || null,
    [orgs, effectiveOrgId]
  );

  const value = useMemo(() => ({
    isAdmin, orgs, orgId: effectiveOrgId, setOrgId,
    scoped: effectiveOrgId != null, orgName,
  }), [isAdmin, orgs, effectiveOrgId, orgName]);

  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}

export const useScope = () => useContext(ScopeCtx);

/* Header dropdown. Renders nothing for non-admins. */
export function ScopeSelector() {
  const { isAdmin, orgs, orgId, setOrgId } = useScope();
  if (!isAdmin || !orgs.length) return null;
  const scoped = orgId != null;
  return (
    <select
      value={orgId ?? ""}
      onChange={(e) => setOrgId(e.target.value)}
      className="ed-ui"
      title="Limit the dashboard to one client's facilities"
      style={{
        fontSize: 13, padding: "9px 14px", borderRadius: 99,
       border: `1px solid ${scoped ? T.teal : T.hairline}`,
        background: scoped ? T.tealSoft : "transparent",
        color: scoped ? T.teal : T.ink,
        fontWeight: 600, cursor: "pointer", marginRight: 4, maxWidth: 230,
      }}
    >
      <option value="">All facilities · Spectrum internal</option>
      {orgs.filter((o) => o.slug !== "spectrum").map((o) => (
        <option key={o.id} value={o.id}>{o.display_name}</option>
      ))}
    </select>
  );
}

/* Loud banner so you never present scoped-out data by accident —
   or, worse, forget to scope in. */
export function ScopeBanner() {
  const { scoped, orgName, setOrgId } = useScope();
  if (!scoped) return null;
  return (
    <div
      className="ed-ui"
      style={{
    background: T.teal, color: "#FFF", padding: "9px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, fontSize: 13, fontWeight: 600, letterSpacing: "0.01em",
      }}
    >
      <span>
        Client view — showing {orgName} only. Spectrum-internal panels are hidden.
      </span>
      <button
        onClick={() => setOrgId(null)}
        className="ed-ui"
        style={{
          fontSize: 12, padding: "5px 14px", borderRadius: 99, cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.55)", background: "transparent",
          color: "#FFF", fontWeight: 600, whiteSpace: "nowrap",
        }}
      >
        Back to all facilities
      </button>
    </div>
  );
}

/* ————————————————————— Scoping the loaded month ————————————————————— */
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const shortDay = (iso) => { const [, m, d] = iso.split("-"); return `${MONTHS_SHORT[+m - 1]} ${+d}`; };

/* Returns a new month-data object narrowed to one org.
   Portfolio KPIs are recomputed from the narrowed set — otherwise the
   headline would still read 1,600 census while the table shows three
   buildings. Liaison data is Spectrum-internal and is dropped entirely. */
export function applyScope(data, orgId) {
  if (!data || orgId == null) return data;

  const facilities = data.facilities.filter((f) => f.org_id === orgId);
  const names = new Set(facilities.map((f) => f.name));
  const rta = (data.rta || []).filter((r) => names.has(r.name));

  const byDate = {};
  facilities.forEach((f) => {
    (f.trendDates || []).forEach((d, i) => {
      byDate[d] = (byDate[d] || 0) + (f.trend?.[i] || 0);
    });
  });
  const portfolioTrend = Object.keys(byDate).sort()
    .map((d) => ({ d: shortDay(d), census: Math.round(byDate[d]) }));

  const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);
  const totalCensus = sum(facilities, "census");
  const hasGrowth = facilities.some((f) => f.building != null);
  const totalBuilding = hasGrowth ? sum(facilities, "building") : null;
  const totalOpportunity = hasGrowth ? sum(facilities, "nonSpec") : null;
  const captureRate = totalBuilding ? Math.round((totalCensus / totalBuilding) * 1000) / 10 : null;
  const totalSnf = sum(facilities, "snf");
  const totalLtc = sum(facilities, "ltc");

  return {
    ...data,
    facilities,
    portfolioTrend,
    rta,
    liaisons: [],
    hasLiaison: false,
    hasGrowth,
    mixData: [
      { type: "SNF", count: Math.round(totalSnf) },
      { type: "LTC", count: Math.round(totalLtc) },
    ],
    kpis: {
      totalCensus, totalBuilding, totalOpportunity, captureRate,
      liaisonNotes: null, liaisonHrs: null,
    },
  };
}
