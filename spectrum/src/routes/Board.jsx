#!/usr/bin/env python3
"""
board_notify.py — Spectrum board status digest.

Emails a fixed internal recipient list whenever board items move to
"Working on it", "Stuck" or "Done", together with the current list of
active (not-Done) items.

Design notes
------------
* Reads credentials from a .env FILE, not the environment. Task Scheduler
  launches a bare process with no inherited $env: variables, so anything
  depending on a console session silently sends nothing.
* Watermark lives in public.board_notify_log. Each send records the newest
  board_activity.created_at it covered; the next run reads strictly newer
  rows. Nothing is emailed twice, and there is a durable record of what
  left the building.
* Recipients are validated against ALLOWED_DOMAIN in code. A row in a
  table or a stray .env edit cannot point this at an outside address.
* No PHI by design: item names and notes are user-typed, and the board
  carries a "no resident names or MRNs" instruction. That instruction is
  the only thing standing between a careless title and a disclosure, which
  is why the domain guard is not configurable.

Usage
-----
    python board_notify.py --dry-run     # print the email, send nothing
    python board_notify.py --send        # send and record
    python board_notify.py --send --force-window 720   # ignore watermark,
                                                       # look back 12h

Exit codes: 0 nothing to do / sent OK, 1 configuration error, 2 send failed.
"""

import argparse
import html
import json
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ENV_PATH = Path(r"C:\Tools\qapi\.env")
ALLOWED_DOMAIN = "spectrumhealthok.com"
RECIPIENTS = [
    "mclark@spectrumhealthok.com",
    "matt@spectrumhealthok.com",
    "sraju@spectrumhealthok.com",
]
WATCH_STATUSES = ["Working on it", "Stuck", "Done"]
BOOTSTRAP_MINUTES = 60          # first ever run looks back this far, no further
GRAPH = "https://graph.microsoft.com/v1.0"

STATUS_COLOR = {
    "Not started": "#7C8797",
    "Working on it": "#C8A028",
    "Stuck": "#A83038",
    "Done": "#387838",
}


# ----------------------------------------------------------------- config

def load_env(path: Path) -> dict:
    if not path.exists():
        sys.exit(f"[config] {path} not found.")
    out = {}
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def require(env: dict, *keys) -> list:
    missing = [k for k in keys if not env.get(k)]
    if missing:
        sys.exit(f"[config] missing from {ENV_PATH}: {', '.join(missing)}")
    return [env[k] for k in keys]


def check_recipients() -> list:
    bad = [r for r in RECIPIENTS if not r.lower().endswith("@" + ALLOWED_DOMAIN)]
    if bad:
        sys.exit(f"[guard] refusing to send to non-internal address: {', '.join(bad)}")
    return RECIPIENTS


# --------------------------------------------------------------- supabase

class Db:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def get(self, table: str, query: str = "") -> list:
        r = requests.get(f"{self.url}/rest/v1/{table}?{query}", headers=self.h, timeout=30)
        r.raise_for_status()
        return r.json()

    def insert(self, table: str, row: dict) -> None:
        r = requests.post(f"{self.url}/rest/v1/{table}", headers=self.h,
                          data=json.dumps(row), timeout=30)
        r.raise_for_status()


def watermark(db: Db, force_window: int | None) -> datetime:
    if force_window:
        return datetime.now(timezone.utc) - timedelta(minutes=force_window)
    rows = db.get("board_notify_log", "select=watermark&order=watermark.desc&limit=1")
    if rows:
        return datetime.fromisoformat(rows[0]["watermark"].replace("Z", "+00:00"))
    # First run: do not dredge up the entire history of the board.
    return datetime.now(timezone.utc) - timedelta(minutes=BOOTSTRAP_MINUTES)


def fetch(db: Db, since: datetime):
    statuses = ",".join(f'"{s}"' for s in WATCH_STATUSES)
    changes = db.get("board_activity", urllib.parse.urlencode({
        "select": "id,item_id,actor_id,new_value,old_value,created_at",
        "kind": "eq.status",
        "created_at": f"gt.{since.isoformat()}",
        "new_value": f"in.({statuses})",
        "order": "created_at.asc",
    }, safe='(),"'))

    items = db.get("board_items",
                   "select=id,name,status,due_date,group_id,board_groups(name,color)"
                   "&order=position.asc")
    owners = db.get("board_item_owners", "select=item_id,user_id")
    people = db.get("profiles", "select=user_id,full_name,email")
    return changes, items, owners, people


# ------------------------------------------------------------------ email

def name_of(people: list, uid) -> str:
    for p in people:
        if p["user_id"] == uid:
            return p.get("full_name") or (p.get("email") or "").split("@")[0]
    return "someone"


def owners_of(owners: list, people: list, item_id) -> str:
    ids = [o["user_id"] for o in owners if o["item_id"] == item_id]
    names = [name_of(people, u) for u in ids]
    return ", ".join(names) if names else "Unassigned"


def build(changes: list, items: list, owners: list, people: list) -> tuple:
    by_id = {i["id"]: i for i in items}
    active = [i for i in items if i["status"] != "Done"]

    moved = len(changes)
    subject = f"Spectrum board — {moved} update{'s' if moved != 1 else ''}"

    def esc(s):
        return html.escape(str(s or ""))

    rows = []
    for c in changes:
        it = by_id.get(c["item_id"])
        if not it:
            continue          # item deleted since the change
        colour = STATUS_COLOR.get(c["new_value"], "#5C7276")
        when = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))
        rows.append(
            f'<tr>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #DCE7E9">{esc(it["name"])}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #DCE7E9;color:{colour};font-weight:600">'
            f'{esc(c["new_value"])}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #DCE7E9;color:#5C7276">'
            f'{esc(owners_of(owners, people, it["id"]))}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #DCE7E9;color:#8FA3A7;white-space:nowrap">'
            f'{when.astimezone().strftime("%-I:%M %p") if hasattr(when, "astimezone") else ""}</td>'
            f'</tr>'
        )

    open_rows = []
    for it in sorted(active, key=lambda x: (x.get("due_date") or "9999-99-99")):
        colour = STATUS_COLOR.get(it["status"], "#5C7276")
        grp = (it.get("board_groups") or {}).get("name", "")
        due = it.get("due_date") or "—"
        open_rows.append(
            f'<tr>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #F2F6F7">{esc(it["name"])}</td>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #F2F6F7;color:{colour}">{esc(it["status"])}</td>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #F2F6F7;color:#5C7276">'
            f'{esc(owners_of(owners, people, it["id"]))}</td>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #F2F6F7;color:#5C7276">{esc(grp)}</td>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #F2F6F7;color:#8FA3A7;white-space:nowrap">{esc(due)}</td>'
            f'</tr>'
        )

    body = f"""<div style="font-family:Segoe UI,Arial,sans-serif;color:#132A2E;max-width:760px">
  <h2 style="margin:0 0 4px;font-size:18px;color:#1B2A47">Spectrum board</h2>
  <p style="margin:0 0 18px;font-size:13px;color:#5C7276">
    {moved} status change{'s' if moved != 1 else ''} · {len(active)} item{'s' if len(active) != 1 else ''} still open
  </p>

  <h3 style="margin:0 0 6px;font-size:14px">What moved</h3>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <tr style="text-align:left;color:#8FA3A7;font-size:12px">
      <th style="padding:0 12px 6px">Item</th><th style="padding:0 12px 6px">Moved to</th>
      <th style="padding:0 12px 6px">Owners</th><th style="padding:0 12px 6px">When</th>
    </tr>
    {''.join(rows)}
  </table>

  <h3 style="margin:24px 0 6px;font-size:14px">Everything still open</h3>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <tr style="text-align:left;color:#8FA3A7;font-size:12px">
      <th style="padding:0 12px 6px">Item</th><th style="padding:0 12px 6px">Status</th>
      <th style="padding:0 12px 6px">Owners</th><th style="padding:0 12px 6px">Group</th>
      <th style="padding:0 12px 6px">Due</th>
    </tr>
    {''.join(open_rows) or '<tr><td style="padding:8px 12px;color:#8FA3A7">Nothing open.</td></tr>'}
  </table>

  <p style="margin:24px 0 0;font-size:11px;color:#8FA3A7">
    Automated from myspectrumdashboard.com. No resident-identifiable information should appear
    in item titles; if it does, correct it on the board and tell Matt.
  </p>
</div>"""
    return subject, body


# ------------------------------------------------------------------ graph

def send(env: dict, to: list, subject: str, body: str) -> None:
    tenant, client, secret, sender = require(
        env, "QAPI_GRAPH_TENANT", "QAPI_GRAPH_CLIENT", "QAPI_GRAPH_SECRET", "QAPI_GRAPH_SENDER")

    tok = requests.post(
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        data={"client_id": client, "client_secret": secret,
              "scope": "https://graph.microsoft.com/.default",
              "grant_type": "client_credentials"}, timeout=30)
    if tok.status_code != 200:
        sys.exit(f"[graph] token failed: {tok.status_code} {tok.text}")
    access = tok.json()["access_token"]

    r = requests.post(
        f"{GRAPH}/users/{sender}/sendMail",
        headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
        data=json.dumps({
            "message": {
                "subject": subject,
                "body": {"contentType": "HTML", "content": body},
                "toRecipients": [{"emailAddress": {"address": a}} for a in to],
            },
            "saveToSentItems": True,
        }), timeout=60)
    if r.status_code not in (200, 202):
        sys.exit(f"[graph] sendMail failed: {r.status_code} {r.text}")


# ------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description="Spectrum board status digest")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true", help="print, send nothing, record nothing")
    g.add_argument("--send", action="store_true", help="send and record")
    ap.add_argument("--force-window", type=int, metavar="MIN",
                    help="ignore the watermark and look back MIN minutes")
    a = ap.parse_args()

    env = load_env(ENV_PATH)
    url, key = require(env, "SUPABASE_URL", "SUPABASE_SERVICE_KEY")
    to = check_recipients()

    db = Db(url, key)
    since = watermark(db, a.force_window)
    changes, items, owners, people = fetch(db, since)

    if not changes:
        print(f"[ok] nothing since {since.isoformat()} — no mail sent.")
        return 0

    subject, body = build(changes, items, owners, people)
    newest = max(c["created_at"] for c in changes)

    if a.dry_run:
        print(f"[dry-run] since {since.isoformat()}")
        print(f"[dry-run] {len(changes)} change(s), watermark would advance to {newest}")
        print(f"[dry-run] to: {', '.join(to)}")
        print(f"[dry-run] subject: {subject}\n")
        print(body)
        return 0

    try:
        send(env, to, subject, body)
    except SystemExit:
        db.insert("board_notify_log", {
            "watermark": since.isoformat(), "change_count": len(changes),
            "recipients": to, "subject": subject, "ok": False, "detail": "send failed",
        })
        raise

    db.insert("board_notify_log", {
        "watermark": newest, "change_count": len(changes),
        "recipients": to, "subject": subject, "ok": True,
    })
    print(f"[sent] {len(changes)} change(s) to {len(to)} recipients; watermark now {newest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
