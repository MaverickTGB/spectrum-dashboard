import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";

/* ————————————————————— Spectrum Board —————————————————————
   Internal task board (admins + managers). Tables: boards, board_groups,
   board_items, board_activity. Owner picker via board_people() RPC.
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

function OwnerPicker({ value, people, onChange, showName = true }) {
  const [open, setOpen] = useState(false);
  const p = people.find((x) => x.user_id === value);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "2px 8px 2px 0" }}>
        <Avatar person={p} />
        {showName && <span style={{ fontSize: 13, fontWeight: 600, color: p ? T.ink : T.ink3 }}>{p ? firstName(p) : "Unassigned"}</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {people.map((x) => (
          <button key={x.user_id} onClick={() => { onChange(x.user_id); setOpen(false); }}>
            <Avatar person={x} size={22} /> <span>{x.full_name || x.email}</span>
            {x.user_id === value && <Ic d={I.check} size={14} style={{ marginLeft: "auto", color: T.ink3 }} />}
          </button>
        ))}
        <button onClick={() => { onChange(null); setOpen(false); }} style={{ color: T.ink2 }}><Avatar size={22} /> Unassigned</button>
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
  const board = boards?.[0];
  if (!board) return { board: null, groups: [], items: [], people: people || [], facilities: facilities || [], activity: [] };
  const [{ data: groups, error: e4 }, { data: items, error: e5 }] = await Promise.all([
    supabase.from("board_groups").select("*").eq("board_id", board.id).order("position").order("id"),
    supabase.from("board_items").select("*").eq("board_id", board.id).order("position").order("id"),
  ]);
  if (e4) throw e4; if (e5) throw e5;
  const ids = (items || []).map((i) => i.id);
  let activity = [];
  if (ids.length) {
    const { data } = await supabase.from("board_activity").select("*").in("item_id", ids).order("created_at", { ascending: false }).limit(60);
    activity = data || [];
  }
  return { board, groups: groups || [], items: items || [], people: people || [], facilities: facilities || [], activity };
}

/* ---------- main ---------- */
export default function Board() {
  const { profile } = useAuth();
  const me = profile?.user_id;
  const [state, setState] = useState({ board: null, groups: [], items: [], people: [], facilities: [], activity: [] });
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
  const [seenAt, setSeenAt] = useState(null);
  const { board, groups, items, people, facilities, activity } = state;

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

  const update = async (id, patch) => {
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
      .insert({ board_id: board.id, group_id, name, owner_id: me, status: "Not started", priority: "Medium", position })
      .select().single();
    if (error) return fail(error);
    setItems((xs) => [...xs, data]); setToast("Item added"); setSelected(data.id);
  };
  const duplicate = async (it) => {
    const { id, created_at, updated_at, completed_at, created_by, ...rest } = it;
    const { data, error } = await supabase.from("board_items").insert({ ...rest, name: it.name + " (copy)", status: "Not started" }).select().single();
    if (error) return fail(error);
    setItems((xs) => [...xs, data]); setToast("Duplicated");
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
  const groupOf = (it) => groups.find((g) => g.id === it.group_id) || { name: "", color: T.ink3 };
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    let xs = q ? items.filter((i) => [i.name, facilityOf(i.facility_id)?.name, personOf(i.owner_id)?.full_name, i.status, i.notes].join(" ").toLowerCase().includes(q)) : items;
    if (sort) {
      const val = (i) => sort.key === "owner" ? (personOf(i.owner_id)?.full_name || "") : sort.key === "facility" ? (facilityOf(i.facility_id)?.name || "") : sort.key === "due" ? (i.due_date || "9") : String(i[sort.key] ?? "");
      xs = [...xs].sort((a, b) => val(a).localeCompare(val(b)) * sort.dir);
    }
    return xs;
  }, [items, query, sort, people, facilities]); // eslint-disable-line react-hooks/exhaustive-deps
  const progress = (gid) => { const g = items.filter((i) => i.group_id === gid); return g.length ? Math.round((g.filter((i) => i.status === "Done").length / g.length) * 100) : 0; };
  const sel = items.find((i) => i.id === selected);
  const myWork = items.filter((i) => i.owner_id === me && i.status !== "Done").sort((a, b) => (a.due_date || "9").localeCompare(b.due_date || "9"));
  const inboxRows = activity.filter((a) => a.actor_id !== me || a.kind === "comment");
  const unread = inboxRows.filter((a) => !seenAt || a.created_at > seenAt).length;
  const describe = (a) => {
    const it = items.find((i) => i.id === a.item_id);
    const who = a.actor_id ? firstName(personOf(a.actor_id)) || "Someone" : "System";
    const text = {
      created: "added this item", status: `moved it to ${a.new_value}`,
      owner: a.new_value ? `assigned it to ${firstName(personOf(a.new_value)) || "someone"}` : "unassigned it",
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
          {!mobile && <p style={{ margin: 0, fontSize: 13, color: T.ink2 }}>{items.filter((i) => i.status !== "Done").length} open · {people.length} people</p>}
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
              <div style={{ height: "100%", width: `${pct}%`, background: g.color, borderRadius: 999, transition: "width 200ms" }} />
            </div>
            {pct}% done
          </div>
        )}
      </div>
    );
  };

  /* ----- table view ----- */
  const COLS = [["name", "Item", "minmax(260px,1.8fr)"], ["owner", "Owner", "150px"], ["status", "Status", "160px"], ["due", "Due", "120px"], ["facility", "Facility", "170px"], ["priority", "Priority", "110px"]];
  const gridCols = "40px " + COLS.map((c) => c[2]).join(" ") + " 110px";

  const TableView = (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 32 }}>
      {groups.map((g) => (
        <section key={g.id} onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (drag) { update(drag, { group_id: g.id }); setDrag(null); setToast(`Moved to ${g.name}`); } }}>
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
                <div key={it.id} className="sb-row" draggable onDragStart={() => setDrag(it.id)}
                  style={{ gridTemplateColumns: gridCols, background: selected === it.id ? T.accentSoft : undefined }}>
                  <div style={{ display: "flex", justifyContent: "center" }}><span style={{ height: 20, width: 3, borderRadius: 999, background: g.color, opacity: it.status === "Done" ? 0.35 : 1 }} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 8, fontWeight: 600, minWidth: 0, textDecoration: it.status === "Done" ? "line-through" : "none", color: it.status === "Done" ? T.ink3 : T.ink }}>
                    <EditableText value={it.name} onChange={(v) => update(it.id, { name: v })} />
                    {it.notes && <span title="Has notes" style={{ width: 6, height: 6, borderRadius: "50%", background: T.ink3, flexShrink: 0 }} />}
                  </div>
                  <div style={{ padding: "0 8px" }}><OwnerPicker value={it.owner_id} people={people} onChange={(v) => update(it.id, { owner_id: v })} /></div>
                  <div style={{ padding: "0 8px" }}><StatusPill value={it.status} onChange={(v) => update(it.id, { status: v })} /></div>
                  <div style={{ padding: "0 8px" }}>
                    <input type="date" className="sb-cell-input" value={it.due_date || ""} onChange={(e) => update(it.id, { due_date: e.target.value || null })}
                      style={{ fontSize: 13, color: isOverdue(it.due_date, it.status) ? BRAND.crimson : T.ink, fontWeight: isOverdue(it.due_date, it.status) ? 600 : 400 }} />
                  </div>
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
        <div key={s} style={{ width: 288, flexShrink: 0, borderRadius: 12, background: T.mist, padding: "0 8px 8px", borderTop: `4px solid ${STATUS[s].dot}` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (drag) { update(drag, { status: s }); setDrag(null); setToast(`Marked ${s}`); } }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 6px", marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS[s].dot }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: T.ink3 }}>{visible.filter((i) => i.status === s).length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.filter((i) => i.status === s).map((it) => {
              const g = groupOf(it);
              return (
                <div key={it.id} className="sb-card" draggable onDragStart={() => setDrag(it.id)} onClick={() => setSelected(it.id)} style={{ borderLeft: `4px solid ${g.color}` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{it.name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: T.ink3 }}>{g.name}</p>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink2 }}>
                    <Avatar person={personOf(it.owner_id)} size={22} />
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
    <button className="sb-mcard" onClick={() => setSelected(it.id)}>
      <div style={{ width: 4, flexShrink: 0, background: groupOf(it).color }} />
      <div style={{ minWidth: 0, flex: 1, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{it.name}</p>
          <span style={{ marginTop: 4, width: 10, height: 10, flexShrink: 0, borderRadius: "50%", background: STATUS[it.status]?.dot }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink2 }}>
          <Avatar person={personOf(it.owner_id)} size={20} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub || facilityOf(it.facility_id)?.name || groupOf(it).name}</span>
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
            ["Owner", <OwnerPicker value={sel.owner_id} people={people} onChange={(v) => update(sel.id, { owner_id: v })} />],
            ["Due", <input type="date" value={sel.due_date || ""} onChange={(e) => update(sel.id, { due_date: e.target.value || null })} style={{ border: 0, borderRadius: 6, padding: "4px 8px", fontSize: 13, background: T.mist }} />],
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
              <button onClick={() => { update(sel.id, { status: "Done" }); setToast("Marked Done"); }}
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
          const label = { created: "created this", status: `→ ${a.new_value}`, owner: "changed owner", due: a.new_value ? `due ${fmtDate(a.new_value)}` : "cleared due date", moved: "moved to another group", renamed: `renamed from “${a.old_value}”`, comment: a.body }[a.kind] || a.kind;
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
