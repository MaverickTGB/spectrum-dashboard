import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";

/* ————————————————————— Spectrum Board —————————————————————
   Internal task board (admins + managers). Tables: boards, board_groups,
   board_items, board_activity, board_item_owners. People via board_people() RPC.
Owners are many-to-many; board_items.owner_id is legacy and no longer read.
   No PHI: item names and notes must never contain resident identifiers. */

/* ---------- brand (sampled from logo) ---------- */
const BRAND = { navy: "#282880", plum: "#783860", crimson: "#A83038", gold: "#C8A028", green: "#387838", sky: "#3888B8" };
const RING = [BRAND.navy, BRAND.plum, BRAND.crimson, BRAND.gold, BRAND.green, BRAND.sky];
const SIDE = { bg: "#101C2E", active: "#2F3949", text: "#C7D0DE", muted: "#7C8797" };
const T = {
  ink: "#132A2E", ink2: "#5C7276", ink3: "#8FA3A7", paper: "#FFFFFF", mist: "#F2F6F7", line: "#DCE7E9",
  accent: "#1B2A47", accentSoft: "#E4EEFF",
};
const STATUS = {
  "Not started": { dot: "#7C8797", bg: "#E9EEF1", fg: "#3B4A52" },
  "Working on it": { dot: BRAND.gold, bg: "#FBF1D3", fg: "#7A5A0B" },
  "Stuck": { dot: BRAND.crimson, bg: "#F8DEDF", fg: "#7E1F25" },
  "Done": { dot: BRAND.green, bg: "#DEEFDD", fg: "#255A26" },
};
const PRIORITY = {
  High: { bg: "#F8DEDF", fg: "#8F2A31" }, Medium: { bg: "#FBF1D3", fg: "#7A5A0B" }, Low: { bg: "#DDEBF6", fg: "#24598A" },
};
const AVATAR_COLORS = [BRAND.navy, BRAND.plum, BRAND.crimson, BRAND.gold, BRAND.green, BRAND.sky];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap');
  .sb, .sb * { box-sizing: border-box; }
  .sb { font-family: 'Archivo', system-ui, sans-serif; color: ${T.ink}; background: ${T.paper}; min-height: 100vh; display: flex; }
  .sb input, .sb select, .sb button, .sb textarea { font: inherit; color: inherit; }
  .sb button { background: none; border: 0; padding: 0; cursor: pointer; }
  .sb input[type=date]::-webkit-calendar-picker-indicator { opacity: .4; }
  .sb-row { display: grid; align-items: center; height: 48px; border-bottom: 1px solid ${T.line}; font-size: 13px; transition: background 120ms; }
  .sb-row:hover { background: #FAFBFC; }
  .sb-row .sb-actions { opacity: 0; transition: opacity 120ms; }
  .sb-row:hover .sb-actions { opacity: 1; }
  .sb-hd { display: grid; align-items: center; height: 36px; border-bottom: 1px solid ${T.line}; font-size: 12px; font-weight: 500; color: ${T.ink3}; position: sticky; top: 104px; background: ${T.paper}; z-index: 5; }
  .sb-hd button { display: flex; align-items: center; gap: 4px; padding: 0 8px; text-align: left; color: inherit; }
  .sb-hd button:hover { color: ${T.ink}; }
  .sb-hd button .sb-sort { opacity: 0; }
  .sb-hd button:hover .sb-sort { opacity: .6; }
  .sb-hd button .sb-sort.on { opacity: 1; }
  .sb-pill { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 4px 12px 4px 8px; font-size: 13px; font-weight: 500; white-space: nowrap; }
  .sb-pill:hover { filter: brightness(.96); }
  .sb-menu { position: absolute; top: 100%; left: 0; z-index: 30; margin-top: 4px; min-width: 190px; background: #fff; border: 1px solid ${T.line}; border-radius: 12px; padding: 6px; box-shadow: 0 12px 32px rgba(17,17,17,.12); }
  .sb-menu button { display: flex; width: 100%; align-items: center; gap: 10px; border-radius: 8px; padding: 8px 12px; font-size: 14px; text-align: left; }
  .sb-menu button:hover { background: ${T.mist}; }
  .sb-cell-input { width: 100%; border: 0; background: transparent; border-radius: 6px; padding: 4px 6px; outline: none; }
  .sb-cell-input:hover { background: ${T.mist}; }
  .sb-cell-input:focus { background: #fff; box-shadow: 0 0 0 2px ${T.accent}; }
  .sb-icon-btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; padding: 6px; color: ${T.ink2}; }
  .sb-icon-btn:hover { background: ${T.line}; }
  .sb-tab { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid ${T.line}; color: ${T.ink2}; background: #fff; }
  .sb-tab.on { background: ${T.accent}; color: #fff; border-color: ${T.accent}; }
  .sb-card { cursor: grab; border-radius: 10px; background: #fff; padding: 12px; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
  .sb-card:active { cursor: grabbing; }
  .sb-mcard { display: flex; width: 100%; align-items: stretch; overflow: hidden; border-radius: 12px; background: #fff; border: 1px solid ${T.line}; text-align: left; }
  .sb-link { display: flex; width: 100%; align-items: center; gap: 10px; border-radius: 8px; padding: 8px 12px; font-size: 14px; text-align: left; color: ${SIDE.text}; text-decoration: none; }
  .sb-link.on { background: ${SIDE.active}; color: #fff; font-weight: 600; }
  .sb-link:hover { color: #fff; }
  .sb-fade { animation: sbfade 160ms ease-out; }
  @keyframes sbfade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .sb-new { animation: sbnew 420ms cubic-bezier(.2,.9,.3,1.2); }
  @keyframes sbnew { 0% { opacity: 0; transform: translateX(-12px); background: ${T.accentSoft}; } 60% { background: ${T.accentSoft}; } 100% { opacity: 1; transform: none; } }
  .sb-pop { animation: sbpop 480ms cubic-bezier(.2,.9,.3,1.3); }
  @keyframes sbpop { 0% { transform: scale(.94) translateY(6px); box-shadow: 0 0 0 0 rgba(27,42,71,.0); } 40% { transform: scale(1.04) translateY(-3px); box-shadow: 0 14px 28px rgba(27,42,71,.18); } 100% { transform: none; box-shadow: 0 1px 3px rgba(15,23,42,.08); } }
  .sb-done { animation: sbdone 600ms ease-out; }
  @keyframes sbdone { 0% { background: #DEEFDD; } 100% { background: transparent; } }
  .sb-col.over { background: #E9EEF1; box-shadow: inset 0 0 0 2px var(--col); }
  .sb-bar { transition: width 600ms cubic-bezier(.2,.8,.2,1); }
  .sb-bar.full { background: linear-gradient(90deg, ${RING.join(",")}) !important; background-size: 200% 100% !important; animation: sbshimmer 1.6s ease-in-out 1; }
  @keyframes sbshimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }
  .sb-tick { display: inline-block; animation: sbtick 500ms cubic-bezier(.2,.9,.3,1.4); }
  @keyframes sbtick { 0% { transform: translateY(8px) scale(.8); opacity: 0; } 100% { transform: none; opacity: 1; } }
  .sb-check { animation: sbcheck 500ms cubic-bezier(.2,.9,.3,1.5); }
  @keyframes sbcheck { 0% { transform: scale(0) rotate(-30deg); } 100% { transform: none; } }
  .sb-banner { animation: sbbanner 3.2s ease-in-out forwards; }
  @keyframes sbbanner { 0% { opacity: 0; transform: translate(-50%, 16px) scale(.96); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -8px); } }
  @media (prefers-reduced-motion: reduce) { .sb *, .sb *::before, .sb *::after { animation: none !important; transition: none !important; } }
`;

/* ---------- tiny icon set (inline SVG, 1.8 stroke) ---------- */
const Ic = ({ d, size = 16, sw = 1.8, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const I = {
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  search: ["M21 21l-4.3-4.3", "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"],
  chevD: ["m6 9 6 6 6-6"],
  chevR: ["m9 18 6-6-6-6"],
  sort: ["m21 16-4 4-4-4", "M17 20V4", "m3 8 4-4 4 4", "M7 4v16"],
  open: ["M18 8 22 12 18 16", "M2 12h20"],
  copy: ["M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6"],
  cal: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
  table: ["M3 5h18v14H3z", "M3 10h18", "M3 15h18", "M9 5v14"],
  kanban: ["M6 5v11", "M12 5v6", "M18 5v14"],
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  brief: ["M4 7h16v13H4z", "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  inbox: ["M22 12h-6l-2 3h-4l-2-3H2", "M5 5h14l3 7v7H2v-7z"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10 21a2 2 0 0 0 4 0"],
  back: ["M19 12H5", "m12 19-7-7 7-7"],
};

/* ---------- helpers ---------- */
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
const isOverdue = (d, s) => !!d && s !== "Done" && d < todayISO();
const initials = (p) => {
  const n = p?.full_name || p?.email || "?";
  const parts = n.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
};
const firstName = (p) => (p?.full_name || p?.email || "").split(/[\s@]/)[0];
const colorFor = (id) => { let h = 0; for (const c of String(id || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; };
const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`;
};

/* ---------- celebration ---------- */
const DONE_LINES = ["Done. Nicely handled.", "One less thing.", "That's the way.", "Cleared.", "Off the list.", "Good work."];
const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Canvas confetti in the six brand colours. fire(x, y, power) — power 1 = item, 3 = group complete. */
function useConfetti() {
  const ref = useRef(null);
  const parts = useRef([]);
  const raf = useRef(0);
  const tick = useCallback(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = window.innerWidth; c.height = window.innerHeight;
    ctx.clearRect(0, 0, c.width, c.height);
    const now = performance.now();
    parts.current = parts.current.filter((p) => now - p.t0 < p.life);
    for (const p of parts.current) {
      const age = (now - p.t0) / 1000;
      p.vy += 900 * (1 / 60); p.x += p.vx / 60; p.y += p.vy / 60; p.rot += p.vr / 60;
      const fade = 1 - Math.max(0, (now - p.t0 - p.life * 0.6) / (p.life * 0.4));
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      void age;
    }
    if (parts.current.length) raf.current = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  }, []);
  const fire = useCallback((x, y, power = 1) => {
    if (reducedMotion()) return;
    const n = Math.round(28 * power);
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (power > 2 ? Math.PI * 1.4 : Math.PI * 0.9);
      const v = 260 + Math.random() * 380 * Math.min(power, 2);
      parts.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vr: (Math.random() - 0.5) * 14, rot: Math.random() * Math.PI,
        s: 6 + Math.random() * 6, color: RING[i % RING.length], shape: i % 3 === 0 ? 1 : 0, t0: now, life: 1400 + Math.random() * 800 });
    }
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(tick);
  }, [tick]);
  const canvas = <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 60 }} />;
  return { fire, canvas };
}

/* ---------- atoms ---------- */
function Avatar({ person, size = 26 }) {
  return (
    <span title={person?.full_name || person?.email || "Unassigned"} style={{
      display: "inline-flex", flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%",
      width: size, height: size, background: person ? colorFor(person.user_id) : T.line, color: person ? "#fff" : T.ink3,
      fontSize: size * 0.38, fontWeight: 600, letterSpacing: 0.3,
    }}>{person ? initials(person) : "–"}</span>
  );
}

function Popover({ open, onClose, children, align = "left" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className="sb-menu sb-fade" style={align === "right" ? { left: "auto", right: 0 } : undefined}>{children}</div>;
}

function StatusPill({ value, onChange, wide }) {
  const [open, setOpen] = useState(false);
  const c = STATUS[value] || STATUS["Not started"];
  return (
    <div style={{ position: "relative" }}>
      <button className="sb-pill" onClick={() => setOpen(!open)} style={{ background: c.bg, color: c.fg, width: wide ? "100%" : undefined }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />{value}
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {Object.keys(STATUS).map((s) => (
          <button key={s} onClick={() => { onChange(s); setOpen(false); }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS[s].dot }} />
            <span>{s}</span>
            {s === value && <Ic d={I.check} size={14} style={{ marginLeft: "auto", color: T.ink3 }} />}
          </button>
        ))}
      </Popover>
    </div>
  );
}

function OwnersPicker({ value, people, onToggle, showNames = true, max = 3 }) {
  const [open, setOpen] = useState(false);
  const chosen = people.filter((x) => value.includes(x.user_id));
  const extra = chosen.length - max;
  const label = chosen.length === 0 ? "Unassigned"
    : chosen.length === 1 ? firstName(chosen[0])
    : `${firstName(chosen[0])} +${chosen.length - 1}`;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "2px 8px 2px 0" }}>
        {chosen.length === 0 ? <Avatar /> : (
          <span style={{ display: "flex", flexShrink: 0 }}>
            {chosen.slice(0, max).map((p, i) => (
              <span key={p.user_id} style={{ marginLeft: i ? -8 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}><Avatar person={p} /></span>
            ))}
            {extra > 0 && (
              <span style={{ marginLeft: -8, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: T.line, color: T.ink2, fontSize: 11, fontWeight: 700, boxShadow: "0 0 0 2px #fff" }}>+{extra}</span>
            )}
          </span>
        )}
        {showNames && <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: chosen.length ? T.ink : T.ink3 }}>{label}</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {people.map((x) => {
          const on = value.includes(x.user_id);
          return (
            <button key={x.user_id} onClick={() => onToggle(x.user_id, !on)}>
              <Avatar person={x} size={22} /> <span>{x.full_name || x.email}</span>
              {on && <Ic d={I.check} size={14} style={{ marginLeft: "auto", color: T.ink3 }} />}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ borderTop: `1px solid ${T.line}`, margin: "4px 0" }} />
            <button onClick={() => { value.forEach((u) => onToggle(u, false)); setOpen(false); }} style={{ color: T.ink2 }}><Avatar size={22} /> Clear all</button>
          </>
        )}
      </Popover>
    </div>
  );
}

function PriorityPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const c = PRIORITY[value] || PRIORITY.Medium;
  return (
    <div style={{ position: "relative" }}>
      <button className="sb-pill" onClick={() => setOpen(!open)} style={{ background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600, padding: "4px 10px" }}>{value}</button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {Object.keys(PRIORITY).map((k) => <button key={k} onClick={() => { onChange(k); setOpen(false); }}>{k}</button>)}
      </Popover>
    </div>
  );
}

function CompanyPicker({ value, companies, onChange, onCreate }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const c = companies.find((x) => x.id === value);
  const submit = async () => { const n = name.trim(); if (!n) return; await onCreate(n); setName(""); setAdding(false); setOpen(false); };
  return (
    <div style={{ position: "relative" }}>
      <button className="sb-pill" onClick={() => setOpen(!open)} style={c ? { background: c.color + "1F", color: c.color, fontWeight: 600 } : { background: "transparent", color: T.ink3, fontWeight: 400 }}>
        {c && <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />}{c ? c.name : "Company"}
      </button>
      <Popover open={open} onClose={() => { setOpen(false); setAdding(false); }}>
        {companies.map((x) => (
          <button key={x.id} onClick={() => { onChange(x.id); setOpen(false); }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: x.color }} /><span>{x.name}</span>
            {x.id === value && <Ic d={I.check} size={14} style={{ marginLeft: "auto", color: T.ink3 }} />}
          </button>
        ))}
        {value && <button onClick={() => { onChange(null); setOpen(false); }} style={{ color: T.ink2 }}><span style={{ width: 10 }} />None</button>}
        <div style={{ borderTop: `1px solid ${T.line}`, margin: "4px 0" }} />
        {adding ? (
          <div style={{ display: "flex", gap: 6, padding: "4px 6px" }}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }}
              style={{ flex: 1, border: 0, borderRadius: 6, padding: "6px 8px", fontSize: 13, background: T.mist, outline: "none" }} />
            <button onClick={submit} style={{ borderRadius: 6, padding: "0 10px", fontSize: 13, fontWeight: 600, color: "#fff", background: T.accent, width: "auto" }}>Add</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ color: T.accent, fontWeight: 600 }}><Ic d={I.plus} size={14} /> Add company…</button>
        )}
      </Popover>
    </div>
  );
}

function EditableText({ value, onChange, style }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (editing) return (
    <input autoFocus className="sb-cell-input" value={v} onChange={(e) => setV(e.target.value)} style={style}
      onBlur={() => { setEditing(false); const t = v.trim(); if (t && t !== value) onChange(t); else setV(value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { setV(value); setEditing(false); } }} />
  );
  return (
    <button onClick={() => setEditing(true)} className="sb-cell-input" title="Click to edit"
      style={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...style }}>{value}</button>
  );
}

const SpectrumRing = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    {RING.map((c, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return <circle key={c} cx={20 + Math.cos(a) * 13} cy={20 + Math.sin(a) * 13} r={5.5} fill={c} />; })}
  </svg>
);

/* ---------- data layer ---------- */
async function loadAll() {
  const [{ data: boards, error: e1 }, { data: people, error: e2 }, { data: facilities, error: e3 }] = await Promise.all([
    supabase.from("boards").select("id, name").is("archived_at", null).order("id").limit(1),
    supabase.rpc("board_people"),
    supabase.from("facilities").select("id, name, code").order("name"),
  ]);
  if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
  const { data: companies } = await supabase.from("board_companies").select("*").eq("archived", false).order("position").order("name");
  const board = boards?.[0];
  if (!board) return { board: null, groups: [], items: [], people: people || [], facilities: facilities || [], companies: companies || [], activity: [], owners: [] };
  const [{ data: groups, error: e4 }, { data: items, error: e5 }] = await Promise.all([
    supabase.from("board_groups").select("*").eq("board_id", board.id).order("position").order("id"),
    supabase.from("board_items").select("*").eq("board_id", board.id).order("position").order("id"),
  ]);
  if (e4) throw e4; if (e5) throw e5;
  const ids = (items || []).map((i) => i.id);
  let activity = [];
  let owners = [];
  if (ids.length) {
    const [{ data: act }, { data: own }] = await Promise.all([
      supabase.from("board_activity").select("*").in("item_id", ids).order("created_at", { ascending: false }).limit(60),
      supabase.from("board_item_owners").select("item_id, user_id").in("item_id", ids),
    ]);
    activity = act || [];
    owners = own || [];
  }
  return { board, groups: groups || [], items: items || [], people: people || [], facilities: facilities || [], companies: companies || [], activity, owners };
}

/* ---------- main ---------- */
export default function Board() {
  const { profile } = useAuth();
  const me = profile?.user_id;
  const [state, setState] = useState({ board: null, groups: [], items: [], people: [], facilities: [], companies: [], activity: [], owners: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [view, setView] = useState("table");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [tab, setTab] = useState("board");
  const [toast, setToast] = useState("");
  const [drag, setDrag] = useState(null);
  const [sort, setSort] = useState(null);
  const [over, setOver] = useState(null);
  const [seenAt, setSeenAt] = useState(null);
  const [flash, setFlash] = useState({}); // id -> css class for one-shot animations
  const [banner, setBanner] = useState(null); // { text, color }
  const lastPointer = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const { fire, canvas } = useConfetti();
  const { board, groups, items, people, facilities, companies, activity, owners } = state;
  useEffect(() => {
    const h = (e) => { const p = e.touches ? e.touches[0] : e; if (p) lastPointer.current = { x: p.clientX, y: p.clientY }; };
    window.addEventListener("pointerdown", h, true); window.addEventListener("dragend", h, true);
    return () => { window.removeEventListener("pointerdown", h, true); window.removeEventListener("dragend", h, true); };
  }, []);
  const pulse = (id, cls, ms = 700) => { setFlash((f) => ({ ...f, [id]: cls })); setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[id]; return n; }), ms); };

  const refresh = useCallback(async () => {
    try { setState(await loadAll()); setErr(""); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!me) return;
    supabase.from("board_inbox_seen").select("seen_at").eq("user_id", me).maybeSingle().then(({ data }) => setSeenAt(data?.seen_at || null));
  }, [me]);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 720);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 1800); return () => clearTimeout(t); }, [toast]);

  /* ----- writes (optimistic, then reconcile) ----- */
  const setItems = (fn) => setState((s) => ({ ...s, items: fn(s.items) }));
  const setGroups = (fn) => setState((s) => ({ ...s, groups: fn(s.groups) }));
  const fail = (e) => { setErr(e.message || String(e)); refresh(); };

  const ORDER = Object.keys(STATUS);
  const update = async (id, patch) => {
    const before = items.find((x) => x.id === id);
    if (before && patch.status && patch.status !== before.status) {
      const fwd = ORDER.indexOf(patch.status) > ORDER.indexOf(before.status);
      const { x, y } = lastPointer.current;
      if (patch.status === "Done") {
        const g = groups.find((gg) => gg.id === before.group_id);
        const siblings = items.filter((i) => i.group_id === before.group_id);
        const allDone = siblings.every((i) => i.id === id || i.status === "Done");
        pulse(id, "sb-done", 900);
        if (allDone && siblings.length > 1) {
          fire(window.innerWidth / 2, window.innerHeight * 0.35, 3);
          setBanner({ text: `${g?.name || "Group"} — complete`, color: g?.color || T.accent });
          setTimeout(() => setBanner(null), 3300);
          pulse(`g${before.group_id}`, "full", 2200);
        } else {
          fire(x, y, 1);
          setToast(DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)]);
        }
      } else if (fwd) {
        pulse(id, "sb-pop", 600);
      } else if (patch.status === "Stuck") {
        pulse(id, "sb-pop", 600);
      }
    }
    if (before && patch.group_id && patch.group_id !== before.group_id) pulse(id, "sb-pop", 600);
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("board_items").update(patch).eq("id", id);
    if (error) fail(error); else refreshActivity();
  };
  const refreshActivity = async () => {
    const ids = items.map((i) => i.id); if (!ids.length) return;
    const { data } = await supabase.from("board_activity").select("*").in("item_id", ids).order("created_at", { ascending: false }).limit(60);
    if (data) setState((s) => ({ ...s, activity: data }));
  };
  const addItem = async (group_id, name = "New item") => {
    const position = items.filter((i) => i.group_id === group_id).length;
    const { data, error } = await supabase.from("board_items")
      .insert({ board_id: board.id, group_id, name, status: "Not started", priority: "Medium", position })
      .select().single();
    if (error) return fail(error);
    setItems((xs) => [...xs, data]); setToast("Added"); pulse(data.id, "sb-new", 500);
    if (me) {
      const row = { item_id: data.id, user_id: me };
      const { error: eo } = await supabase.from("board_item_owners").insert(row);
      if (!eo) setState((s) => ({ ...s, owners: [...s.owners, row] }));
    }
  };
  const duplicate = async (it) => {
    const { id, created_at, updated_at, completed_at, created_by, ...rest } = it;
    const { data, error } = await supabase.from("board_items").insert({ ...rest, name: it.name + " (copy)", status: "Not started" }).select().single();
    if (error) return fail(error);
    setItems((xs) => [...xs, data]); setToast("Duplicated");
    const carry = ownerIds(it.id).map((u) => ({ item_id: data.id, user_id: u }));
    if (carry.length) {
      const { error: eo } = await supabase.from("board_item_owners").insert(carry);
      if (!eo) setState((s) => ({ ...s, owners: [...s.owners, ...carry] }));
    }
  };
  const remove = async (it) => {
    if (!window.confirm(`Delete "${it.name}"?`)) return;
    setItems((xs) => xs.filter((x) => x.id !== it.id)); setSelected(null);
    const { error } = await supabase.from("board_items").delete().eq("id", it.id);
    if (error) fail(error); else setToast("Deleted");
  };
  const toggleGroup = async (g) => {
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, collapsed: !x.collapsed } : x)));
    await supabase.from("board_groups").update({ collapsed: !g.collapsed }).eq("id", g.id);
  };
  const renameGroup = async (g, name) => {
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, name } : x)));
    const { error } = await supabase.from("board_groups").update({ name }).eq("id", g.id);
    if (error) fail(error);
  };
  const addGroup = async () => {
    const name = window.prompt("Group name");
    if (!name) return;
    const color = RING[groups.length % RING.length];
    const { data, error } = await supabase.from("board_groups").insert({ board_id: board.id, name, color, position: groups.length }).select().single();
    if (error) return fail(error);
    setGroups((gs) => [...gs, data]);
  };
  const createCompany = async (name) => {
    const color = RING[companies.length % RING.length];
    const { data, error } = await supabase.from("board_companies").insert({ name, color, position: companies.length }).select().single();
    if (error) return fail(error);
    setState((s) => ({ ...s, companies: [...s.companies, data] }));
    return data;
  };
  const ownerIds = (itemId) => owners.filter((o) => o.item_id === itemId).map((o) => o.user_id);
  const toggleOwner = async (itemId, userId, on) => {
    setState((s) => ({
      ...s,
      owners: on ? [...s.owners, { item_id: itemId, user_id: userId }]
                 : s.owners.filter((o) => !(o.item_id === itemId && o.user_id === userId)),
    }));
    const { error } = on
      ? await supabase.from("board_item_owners").insert({ item_id: itemId, user_id: userId })
      : await supabase.from("board_item_owners").delete().eq("item_id", itemId).eq("user_id", userId);
    if (error) fail(error); else refreshActivity();
  };
  const markInboxSeen = async () => {
    if (!me) return;
    const seen_at = new Date().toISOString();
    setSeenAt(seen_at);
    await supabase.from("board_inbox_seen").upsert({ user_id: me, seen_at });
  };
  const toggleSort = (key) => setSort((s) => (!s || s.key !== key) ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null);

  /* ----- derived ----- */
  const personOf = (id) => people.find((p) => p.user_id === id);
  const facilityOf = (id) => facilities.find((f) => f.id === id);
  const companyOf = (id) => companies.find((c) => c.id === id);
  const ownerNames = (itemId) => ownerIds(itemId).map((u) => personOf(u)?.full_name || personOf(u)?.email || "").join(" ");
  const groupOf = (it) => groups.find((g) => g.id === it.group_id) || { name: "", color: T.ink3 };
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    let xs = q ? items.filter((i) => [i.name, facilityOf(i.facility_id)?.name, companyOf(i.company_id)?.name, ownerNames(i.id), i.status, i.notes].join(" ").toLowerCase().includes(q)) : items;
    if (sort) {
      const val = (i) => sort.key === "owner" ? ownerNames(i.id) : sort.key === "facility" ? (facilityOf(i.facility_id)?.name || "") : sort.key === "company" ? (companyOf(i.company_id)?.name || "") : sort.key === "due" ? (i.due_date || "9") : String(i[sort.key] ?? "");
      xs = [...xs].sort((a, b) => val(a).localeCompare(val(b)) * sort.dir);
    }
    return xs;
  }, [items, query, sort, people, facilities, owners]); // eslint-disable-line react-hooks/exhaustive-deps
  const progress = (gid) => { const g = items.filter((i) => i.group_id === gid); return g.length ? Math.round((g.filter((i) => i.status === "Done").length / g.length) * 100) : 0; };
  const sel = items.find((i) => i.id === selected);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const doneWeek = items.filter((i) => i.status === "Done" && i.completed_at && i.completed_at > weekAgo).length;
  const myWork = items.filter((i) => ownerIds(i.id).includes(me) && i.status !== "Done").sort((a, b) => (a.due_date || "9").localeCompare(b.due_date || "9"));
  const inboxRows = activity.filter((a) => a.actor_id !== me || a.kind === "comment");
  const unread = inboxRows.filter((a) => !seenAt || a.created_at > seenAt).length;
  const describe = (a) => {
    const it = items.find((i) => i.id === a.item_id);
    const who = a.actor_id ? firstName(personOf(a.actor_id)) || "Someone" : "System";
    const text = {
      created: "added this item", status: `moved it to ${a.new_value}`,
      owner: a.new_value ? `assigned it to ${firstName(personOf(a.new_value)) || "someone"}` : "unassigned it",
      owner_added: `added ${firstName(personOf(a.new_value)) || "someone"} as an owner`,
      owner_removed: `removed ${firstName(personOf(a.old_value)) || "someone"} as an owner`,
      due: a.new_value ? `set the due date to ${fmtDate(a.new_value)}` : "cleared the due date",
      moved: `moved it to ${groups.find((g) => String(g.id) === a.new_value)?.name || "another group"}`,
      renamed: `renamed it from “${a.old_value}”`, comment: a.body,
    }[a.kind] || a.kind;
    return { who, text, item: it?.name || "(deleted item)" };
  };

  /* ----- header ----- */
  const Header = (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: T.paper, borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: mobile ? "12px 16px 0" : "12px 32px 0" }}>
        {mobile && <a href="/" className="sb-icon-btn" aria-label="Back to dashboard"><Ic d={I.back} size={20} /></a>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: T.accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{board?.name || "Spectrum board"}</h1>
          {!mobile && <p style={{ margin: 0, fontSize: 13, color: T.ink2 }}>{items.filter((i) => i.status !== "Done").length} open · <span key={doneWeek} className="sb-tick" style={{ fontWeight: 700, color: BRAND.green }}>{doneWeek} done this week</span></p>}
        </div>
        {!mobile && <div style={{ display: "flex" }}>{people.map((p, i) => <span key={p.user_id} style={{ marginLeft: i ? -8 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}><Avatar person={p} size={28} /></span>)}</div>}
        <button className="sb-icon-btn" style={{ position: "relative" }} onClick={() => { setTab("inbox"); setView("inbox"); }} aria-label="Inbox">
          <Ic d={I.bell} size={20} />
          {unread > 0 && <span style={{ position: "absolute", right: 4, top: 4, width: 8, height: 8, borderRadius: "50%", background: BRAND.crimson }} />}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: mobile ? "10px 16px" : "10px 32px" }}>
        {!mobile && (
          <div style={{ display: "flex", gap: 8 }}>
            {[["table", I.table, "Table"], ["kanban", I.kanban, "Kanban"], ["mywork", I.brief, "My work"], ["inbox", I.inbox, "Inbox"]].map(([k, d, label]) => (
              <button key={k} className={`sb-tab ${view === k ? "on" : ""}`} onClick={() => setView(k)}>
                <Ic d={d} size={15} /> {label}{k === "inbox" && unread > 0 && <span style={{ marginLeft: 2, fontSize: 11, background: BRAND.crimson, color: "#fff", borderRadius: 999, padding: "0 6px" }}>{unread}</span>}
              </button>
            ))}
          </div>
        )}
        <div style={{ position: "relative", flex: 1, minWidth: 150, maxWidth: 320 }}>
          <Ic d={I.search} size={15} style={{ position: "absolute", left: 10, top: 9, color: T.ink3 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
            style={{ width: "100%", border: 0, borderRadius: 8, padding: "7px 8px 7px 32px", fontSize: 13, background: T.mist, outline: "none" }} />
        </div>
        {board && groups.length > 0 && (
          <button onClick={() => addItem(groups[0].id)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#fff", background: T.accent }}>
            <Ic d={I.plus} size={15} /> New item
          </button>
        )}
      </div>
    </header>
  );

  /* ----- group header ----- */
  const GroupHead = ({ g }) => {
    const pct = progress(g.id);
    const n = items.filter((i) => i.group_id === g.id).length;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0 8px" }}>
        <button className="sb-icon-btn" onClick={() => toggleGroup(g)} style={{ padding: 2, color: T.ink3 }}>
          <Ic d={g.collapsed ? I.chevR : I.chevD} size={18} />
        </button>
        <span style={{ width: 6, height: 20, borderRadius: 999, background: g.color }} />
        <EditableText value={g.name} onChange={(v) => renameGroup(g, v)} style={{ fontSize: 15, fontWeight: 700, color: g.color, width: "auto", maxWidth: 420 }} />
        <span style={{ fontSize: 13, color: T.ink3 }}>{n}</span>
        {!mobile && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: T.ink2, fontVariantNumeric: "tabular-nums" }}>
            <div style={{ width: 96, height: 4, borderRadius: 999, background: T.line, overflow: "hidden" }}>
              <div className={`sb-bar ${pct === 100 && n > 0 ? "full" : ""} ${flash[`g${g.id}`] || ""}`} style={{ height: "100%", width: `${pct}%`, background: g.color, borderRadius: 999 }} />
            </div>
            <span key={pct} className="sb-tick" style={{ minWidth: 60, textAlign: "right" }}>{pct === 100 && n > 0 ? "Complete" : `${pct}% done`}</span>
          </div>
        )}
      </div>
    );
  };

  /* ----- table view ----- */
  const COLS = [["name", "Item", "minmax(260px,1.8fr)"], ["owner", "Owners", "180px"], ["status", "Status", "160px"], ["due", "Due", "120px"], ["company", "Company", "140px"], ["facility", "Facility", "170px"], ["priority", "Priority", "110px"]];
  const gridCols = "40px " + COLS.map((c) => c[2]).join(" ") + " 110px";

  const TableView = (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 32 }}>
      {groups.map((g) => (
        <section key={g.id} onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { lastPointer.current = { x: e.clientX, y: e.clientY }; if (drag) { update(drag, { group_id: g.id }); setDrag(null); setToast(`Moved to ${g.name}`); } }}>
          <GroupHead g={g} />
          {!g.collapsed && (
            <div style={{ overflowX: "auto" }}>
              <div className="sb-hd" style={{ gridTemplateColumns: gridCols }}>
                <div />
                {COLS.map(([k, label]) => (
                  <button key={k} onClick={() => toggleSort(k)}>{label} <Ic d={I.sort} size={12} style={{ opacity: 0 }} /><span className={`sb-sort ${sort?.key === k ? "on" : ""}`} style={{ marginLeft: -16, display: "inline-flex" }}><Ic d={I.sort} size={12} /></span></button>
                ))}
                <div />
              </div>
              {visible.filter((i) => i.group_id === g.id).map((it) => (
                <div key={it.id} className={`sb-row ${flash[it.id] || ""}`} draggable onDragStart={() => setDrag(it.id)}
                  style={{ gridTemplateColumns: gridCols, background: selected === it.id ? T.accentSoft : undefined }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {it.status === "Done" ? <span className="sb-check" style={{ color: BRAND.green, display: "inline-flex" }}><Ic d={I.check} size={16} sw={2.6} /></span>
                      : <span style={{ height: 20, width: 3, borderRadius: 999, background: g.color }} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 8, fontWeight: 600, minWidth: 0, textDecoration: it.status === "Done" ? "line-through" : "none", color: it.status === "Done" ? T.ink3 : T.ink }}>
                    <EditableText value={it.name} onChange={(v) => update(it.id, { name: v })} />
                    {it.notes && <span title="Has notes" style={{ width: 6, height: 6, borderRadius: "50%", background: T.ink3, flexShrink: 0 }} />}
                  </div>
                  <div style={{ padding: "0 8px" }}><OwnersPicker value={ownerIds(it.id)} people={people} onToggle={(u, on) => toggleOwner(it.id, u, on)} max={2} /></div>
                  <div style={{ padding: "0 8px" }}><StatusPill value={it.status} onChange={(v) => update(it.id, { status: v })} /></div>
                  <div style={{ padding: "0 8px" }}>
                    <input type="date" className="sb-cell-input" value={it.due_date || ""} onChange={(e) => update(it.id, { due_date: e.target.value || null })}
                      style={{ fontSize: 13, color: isOverdue(it.due_date, it.status) ? BRAND.crimson : T.ink, fontWeight: isOverdue(it.due_date, it.status) ? 600 : 400 }} />
                  </div>
                  <div style={{ padding: "0 8px" }}><CompanyPicker value={it.company_id} companies={companies} onChange={(v) => update(it.id, { company_id: v })} onCreate={createCompany} /></div>
                  <div style={{ padding: "0 8px" }}>
                    <select className="sb-cell-input" value={it.facility_id || ""} onChange={(e) => update(it.id, { facility_id: e.target.value ? Number(e.target.value) : null })} style={{ fontSize: 13 }}>
                      <option value="">—</option>
                      {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div style={{ padding: "0 8px" }}><PriorityPicker value={it.priority} onChange={(v) => update(it.id, { priority: v })} /></div>
                  <div className="sb-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 2, paddingRight: 12 }}>
                    <button className="sb-icon-btn" title="Open" onClick={() => setSelected(it.id)}><Ic d={I.open} size={15} /></button>
                    <button className="sb-icon-btn" title="Duplicate" onClick={() => duplicate(it)}><Ic d={I.copy} size={15} /></button>
                    <button className="sb-icon-btn" title="Delete" onClick={() => remove(it)}><Ic d={I.trash} size={15} /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addItem(g.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", fontSize: 13, color: T.ink3 }}>
                <Ic d={I.plus} size={14} /> Add item
              </button>
            </div>
          )}
        </section>
      ))}
      <button onClick={addGroup} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.ink2 }}>
        <Ic d={I.plus} size={14} /> Add group
      </button>
    </div>
  );

  /* ----- kanban view ----- */
  const KanbanView = (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "24px 32px" }}>
      {Object.keys(STATUS).map((s) => (
        <div key={s} className={`sb-col ${over === s ? "over" : ""}`} style={{ "--col": STATUS[s].dot, width: 288, flexShrink: 0, borderRadius: 12, background: T.mist, padding: "0 8px 8px", borderTop: `4px solid ${STATUS[s].dot}`, transition: "background 120ms" }}
          onDragOver={(e) => { e.preventDefault(); if (over !== s) setOver(s); }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => { setOver(null); lastPointer.current = { x: e.clientX, y: e.clientY }; if (drag) { update(drag, { status: s }); setDrag(null); } }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 6px", marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS[s].dot }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: T.ink3 }}>{visible.filter((i) => i.status === s).length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.filter((i) => i.status === s).map((it) => {
              const g = groupOf(it);
              return (
                <div key={it.id} className={`sb-card ${flash[it.id] || ""}`} draggable onDragStart={() => setDrag(it.id)} onClick={() => setSelected(it.id)} style={{ borderLeft: `4px solid ${g.color}` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{it.name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: T.ink3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {companyOf(it.company_id) && <span style={{ borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 600, background: companyOf(it.company_id).color + "1F", color: companyOf(it.company_id).color }}>{companyOf(it.company_id).name}</span>}
                    <span>{facilityOf(it.facility_id)?.name || g.name}</span>
                  </p>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink2 }}>
                    <span style={{ display: "flex", flexShrink: 0 }}>
                      {ownerIds(it.id).length === 0 && <Avatar size={22} />}
                      {ownerIds(it.id).slice(0, 3).map((u, i) => (
                        <span key={u} style={{ marginLeft: i ? -7 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}><Avatar person={personOf(u)} size={22} /></span>
                      ))}
                    </span>
                    {it.due_date && <span style={{ display: "flex", alignItems: "center", gap: 4, ...(isOverdue(it.due_date, it.status) ? { color: BRAND.crimson, fontWeight: 600 } : {}) }}><Ic d={I.cal} size={12} /> {fmtDate(it.due_date)}</span>}
                    <span style={{ marginLeft: "auto", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600, background: PRIORITY[it.priority]?.bg, color: PRIORITY[it.priority]?.fg }}>{it.priority}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  /* ----- cards (mobile + my work) ----- */
  const Card = ({ it, sub }) => (
    <button className={`sb-mcard ${flash[it.id] || ""}`} onClick={() => setSelected(it.id)}>
      <div style={{ width: 4, flexShrink: 0, background: groupOf(it).color }} />
      <div style={{ minWidth: 0, flex: 1, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{it.name}</p>
          <span style={{ marginTop: 4, width: 10, height: 10, flexShrink: 0, borderRadius: "50%", background: STATUS[it.status]?.dot }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink2 }}>
          <span style={{ display: "flex", flexShrink: 0 }}>
            {ownerIds(it.id).length === 0 && <Avatar size={20} />}
            {ownerIds(it.id).slice(0, 3).map((u, i) => (
              <span key={u} style={{ marginLeft: i ? -6 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}><Avatar person={personOf(u)} size={20} /></span>
            ))}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub || [companyOf(it.company_id)?.name, facilityOf(it.facility_id)?.name].filter(Boolean).join(" · ") || groupOf(it).name}</span>
          {it.due_date && <span style={{ marginLeft: "auto", flexShrink: 0, ...(isOverdue(it.due_date, it.status) ? { color: BRAND.crimson, fontWeight: 600 } : {}) }}>{fmtDate(it.due_date)}</span>}
        </div>
      </div>
    </button>
  );

  const MobileBoard = (
    <div style={{ padding: "12px 16px 96px", display: "flex", flexDirection: "column", gap: 24 }}>
      {groups.map((g) => (
        <section key={g.id}>
          <GroupHead g={g} />
          {!g.collapsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visible.filter((i) => i.group_id === g.id).map((it) => <Card key={it.id} it={it} />)}
              <button onClick={() => addItem(g.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px", fontSize: 13, fontWeight: 500, color: T.accent }}><Ic d={I.plus} size={15} /> Add item</button>
            </div>
          )}
        </section>
      ))}
    </div>
  );

  const MyWork = (
    <div style={{ padding: mobile ? "16px 16px 96px" : "24px 32px", display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>Assigned to you</h2>
      {myWork.length === 0 && <p style={{ margin: 0, fontSize: 13, color: T.ink3 }}>Nothing open. Enjoy it while it lasts.</p>}
      {myWork.map((it) => <Card key={it.id} it={it} sub={groupOf(it).name} />)}
    </div>
  );

  const InboxView = (
    <div style={{ padding: mobile ? "16px 16px 96px" : "24px 32px", display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Updates</h2>
        {unread > 0 && <button onClick={markInboxSeen} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: T.accent }}>Mark all read</button>}
      </div>
      {inboxRows.length === 0 && <p style={{ margin: 0, fontSize: 13, color: T.ink3 }}>No activity from the team yet.</p>}
      {inboxRows.map((a) => {
        const d = describe(a); const isNew = !seenAt || a.created_at > seenAt;
        return (
          <button key={a.id} onClick={() => setSelected(a.item_id)} style={{ display: "flex", gap: 12, borderRadius: 12, background: isNew ? T.accentSoft : "#fff", padding: 12, border: `1px solid ${T.line}`, textAlign: "left" }}>
            <Avatar person={personOf(a.actor_id)} />
            <div style={{ minWidth: 0, fontSize: 13 }}>
              <p style={{ margin: 0 }}><span style={{ fontWeight: 600 }}>{d.who}</span> {d.text}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: T.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.item} · {timeAgo(a.created_at)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const MobileNav = (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, display: "flex", background: "#fff", borderTop: `1px solid ${T.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {[["board", I.grid, "Board"], ["mywork", I.brief, "My work"], ["inbox", I.inbox, "Inbox"]].map(([k, d, label]) => (
        <button key={k} onClick={() => setTab(k)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", fontSize: 11, fontWeight: 500, color: tab === k ? T.accent : T.ink3, position: "relative" }}>
          <Ic d={d} size={22} sw={tab === k ? 2.4 : 1.8} /> {label}
          {k === "inbox" && unread > 0 && <span style={{ position: "absolute", top: 6, left: "calc(50% + 8px)", width: 8, height: 8, borderRadius: "50%", background: BRAND.crimson }} />}
        </button>
      ))}
    </nav>
  );

  /* ----- detail panel / sheet ----- */
  const Detail = sel && (
    <>
      <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,.25)" }} />
      <div className="sb-fade" style={{ position: "fixed", zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff", boxShadow: "0 -8px 40px rgba(17,17,17,.15)",
        ...(mobile ? { left: 0, right: 0, bottom: 0, maxHeight: "85vh", borderRadius: "16px 16px 0 0" } : { top: 0, bottom: 0, right: 0, width: 440 }) }}>
        <div style={{ height: 4, background: groupOf(sel).color }} />
        {mobile && <div style={{ margin: "8px auto 0", height: 4, width: 40, borderRadius: 999, background: T.line }} />}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "16px 20px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: T.ink3 }}>{groupOf(sel).name}</p>
            <EditableText value={sel.name} onChange={(v) => update(sel.id, { name: v })} style={{ marginLeft: -6, fontSize: 18, fontWeight: 600, whiteSpace: "normal" }} />
          </div>
          <button className="sb-icon-btn" onClick={() => setSelected(null)}><Ic d={I.x} size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["Status", <StatusPill value={sel.status} onChange={(v) => update(sel.id, { status: v })} />],
            ["Owners", <OwnersPicker value={ownerIds(sel.id)} people={people} onToggle={(u, on) => toggleOwner(sel.id, u, on)} />],
            ["Due", <input type="date" value={sel.due_date || ""} onChange={(e) => update(sel.id, { due_date: e.target.value || null })} style={{ border: 0, borderRadius: 6, padding: "4px 8px", fontSize: 13, background: T.mist }} />],
            ["Company", <CompanyPicker value={sel.company_id} companies={companies} onChange={(v) => update(sel.id, { company_id: v })} onCreate={createCompany} />],
            ["Facility", <select value={sel.facility_id || ""} onChange={(e) => update(sel.id, { facility_id: e.target.value ? Number(e.target.value) : null })} style={{ border: 0, borderRadius: 6, padding: "4px 8px", fontSize: 13, background: T.mist, maxWidth: "100%" }}>
              <option value="">—</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>],
            ["Priority", <PriorityPicker value={sel.priority} onChange={(v) => update(sel.id, { priority: v })} />],
          ].map(([label, ctl]) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: T.ink2 }}>{label}</span><div>{ctl}</div>
            </div>
          ))}
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: T.ink2 }}>Notes <span style={{ color: T.ink3 }}>· no resident names or MRNs</span></p>
            <Notes value={sel.notes || ""} onSave={(v) => update(sel.id, { notes: v || null })} />
          </div>
          <Comments itemId={sel.id} activity={activity} me={me} personOf={personOf} onPosted={refreshActivity} />
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            {sel.status !== "Done" && (
              <button onClick={() => update(sel.id, { status: "Done" })}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, color: "#fff", background: BRAND.green }}>
                <Ic d={I.check} size={16} /> Mark done
              </button>
            )}
            <button onClick={() => remove(sel)} className="sb-icon-btn" title="Delete" style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "0 12px" }}><Ic d={I.trash} size={16} /></button>
          </div>
        </div>
      </div>
    </>
  );

  /* ----- sidebar ----- */
  const Sidebar = (
    <aside style={{ position: "sticky", top: 0, height: "100vh", width: 240, flexShrink: 0, display: "flex", flexDirection: "column", padding: "16px 12px", background: SIDE.bg, color: SIDE.text }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10, borderRadius: 12, background: "#fff", padding: "10px 12px" }}>
        <SpectrumRing size={34} />
        <div style={{ lineHeight: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: 1, color: "#0F172A" }}>SPECTRUM</p>
          <p style={{ margin: "2px 0 0", fontSize: 9, fontStyle: "italic", letterSpacing: 1.5, color: "#334155" }}>HEALTHCARE SOLUTIONS</p>
        </div>
      </div>
      {[["Workspace", [["table", "Table"], ["kanban", "Kanban"]]], ["You", [["mywork", "My work"], ["inbox", "Inbox"]]]].map(([sec, links]) => (
        <div key={sec} style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 6px", padding: "0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: SIDE.muted }}>{sec}</p>
          {links.map(([k, l]) => (
            <button key={k} className={`sb-link ${view === k ? "on" : ""}`} onClick={() => setView(k)}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: view === k ? "#fff" : SIDE.muted }} /> {l}
              {k === "inbox" && unread > 0 && <span style={{ marginLeft: "auto", fontSize: 11, background: BRAND.crimson, color: "#fff", borderRadius: 999, padding: "0 6px" }}>{unread}</span>}
            </button>
          ))}
        </div>
      ))}
      <div style={{ marginTop: "auto", padding: "0 12px", fontSize: 12, color: SIDE.muted }}>
        <a href="/" className="sb-link" style={{ padding: "8px 0", color: SIDE.text }}><Ic d={I.back} size={14} /> Back to dashboard</a>
        <p style={{ margin: "8px 0 0" }}>{profile?.full_name || profile?.email}</p>
      </div>
    </aside>
  );

  /* ----- render ----- */
  const body = loading ? <p style={{ padding: 32, color: T.ink3, fontSize: 13 }}>Loading board…</p>
    : !board ? <p style={{ padding: 32, color: T.ink3, fontSize: 13 }}>No board yet. Ask an admin to create one.</p>
    : mobile ? (tab === "board" ? MobileBoard : tab === "mywork" ? MyWork : InboxView)
    : view === "table" ? TableView : view === "kanban" ? KanbanView : view === "mywork" ? MyWork : InboxView;

  return (
    <div className="sb">
      <style>{css}</style>
      {!mobile && Sidebar}
      <div style={{ minWidth: 0, flex: 1 }}>
        {Header}
        {err && <div style={{ margin: "12px 32px 0", padding: "10px 14px", borderRadius: 8, background: "#F8DEDF", color: "#7E1F25", fontSize: 13 }}>{err}</div>}
        {body}
        {mobile && MobileNav}
        {Detail}
        {canvas}
        {banner && (
          <div className="sb-banner" style={{ position: "fixed", left: "50%", top: mobile ? 96 : 120, zIndex: 55, display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 16, background: "#fff", boxShadow: "0 18px 48px rgba(17,17,17,.22)", borderLeft: `6px solid ${banner.color}` }}>
            <SpectrumRing size={30} />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.ink }}>{banner.text}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: T.ink2 }}>Every item in this group is done.</p>
            </div>
          </div>
        )}
        {toast && <div className="sb-fade" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 50, borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#fff", background: T.accent, bottom: mobile ? 76 : 24 }}>{toast}</div>}
      </div>
    </div>
  );
}

/* ---------- notes (saves on blur, not per keystroke) ---------- */
function Notes({ value, onSave }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea value={v} rows={4} placeholder="Add context for the team" onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onSave(v); }}
      style={{ width: "100%", border: 0, borderRadius: 8, padding: 10, fontSize: 13, background: T.mist, outline: "none", resize: "vertical" }} />
  );
}

/* ---------- comments (board_activity kind='comment') ---------- */
function Comments({ itemId, activity, me, personOf, onPosted }) {
  const [text, setText] = useState("");
  const rows = activity.filter((a) => a.item_id === itemId).slice(0, 20);
  const post = async () => {
    const body = text.trim(); if (!body) return;
    const { error } = await supabase.from("board_activity").insert({ item_id: itemId, actor_id: me, kind: "comment", body });
    if (!error) { setText(""); onPosted(); }
  };
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 13, color: T.ink2 }}>Activity</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") post(); }} placeholder="Write a comment…"
          style={{ flex: 1, border: 0, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.mist, outline: "none" }} />
        <button onClick={post} style={{ borderRadius: 8, padding: "0 12px", fontSize: 13, fontWeight: 600, color: "#fff", background: T.accent }}>Post</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((a) => {
          const p = personOf(a.actor_id);
          const label = { created: "created this", status: `→ ${a.new_value}`, owner: "changed owner", owner_added: `+ ${firstName(personOf(a.new_value)) || "someone"}`, owner_removed: `− ${firstName(personOf(a.old_value)) || "someone"}`, due: a.new_value ? `due ${fmtDate(a.new_value)}` : "cleared due date", moved: "moved to another group", renamed: `renamed from “${a.old_value}”`, comment: a.body }[a.kind] || a.kind;
          return (
            <div key={a.id} style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
              <Avatar person={p} size={20} />
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{p ? firstName(p) : "System"}</span> <span style={{ color: a.kind === "comment" ? T.ink : T.ink2 }}>{label}</span>
                <span style={{ color: T.ink3 }}> · {timeAgo(a.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
