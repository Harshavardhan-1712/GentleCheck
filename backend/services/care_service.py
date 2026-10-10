from datetime import timedelta

import database as db


def add_event(c, category, code, routine_id=None):
    c.execute("INSERT INTO events(ts,category,code,routine_id) VALUES(?,?,?,?)", (db.iso(db.now(c)), category, code, routine_id))


# ---------- consent ----------
def get_consent(c):
    r = c.execute("SELECT * FROM consent WHERE id=1").fetchone()
    return {"share_checkins": bool(r["share_checkins"]), "share_routines": bool(r["share_routines"]),
            "grace_minutes": r["grace_minutes"], "contact_name": r["contact_name"], "updated_at": r["updated_at"]}


def update_consent(c, data: dict):
    cur, changed = get_consent(c), False
    for k, code in (("share_checkins", "consent_checkins"), ("share_routines", "consent_routines")):
        v = data.get(k)
        if v is not None and v != cur[k]:
            c.execute(f"UPDATE consent SET {k}=? WHERE id=1", (int(v),))  # k is from a fixed tuple
            add_event(c, "consent", code + ("_on" if v else "_off"))
            changed = True
    g = data.get("grace_minutes")
    if g is not None and g != cur["grace_minutes"]:
        c.execute("UPDATE consent SET grace_minutes=? WHERE id=1", (g,))
        add_event(c, "consent", "grace_changed")
        changed = True
    if changed:
        c.execute("UPDATE consent SET updated_at=? WHERE id=1", (db.iso(db.now(c)),))
    return get_consent(c)


# ---------- check-ins ----------
def resolve_open(c):
    n = db.iso(db.now(c))
    cur = c.execute("UPDATE escalations SET resolved_at=? WHERE resolved_at IS NULL", (n,))
    if cur.rowcount:
        add_event(c, "followup", "followup_resolved")
    return bool(cur.rowcount)


def checkin(c):
    n = db.now(c)
    ts = db.iso(n)
    cur = c.execute("INSERT INTO checkins(ts) VALUES(?)", (ts,))
    add_event(c, "checkin", "checkin_done")
    resolved = resolve_open(c)
    c.execute("UPDATE state SET due_at=? WHERE id=1", (db.iso(n + timedelta(hours=24)),))
    return {"id": cur.lastrowid, "ts": ts, "resolved_followup": resolved}


# ---------- routines ----------
def _routine(r, n, role):
    st = r["status"]
    if st == "snoozed" and r["snoozed_until"] and db.parse(r["snoozed_until"]) <= n:
        st = "pending"  # snooze elapsed
    d = {"id": r["id"], "kind": r["kind"], "title_en": r["title_en"], "title_te": r["title_te"], "scheduled": r["scheduled"],
         "status": st, "snoozed_until": r["snoozed_until"] if st == "snoozed" else None, "share": bool(r["share"]),
         "family_created": bool(r["family_created"])}
    if role == "parent":  # user-entered details (e.g. medication notes) are never sent to family
        d["detail"] = r["detail"]
    return d


def list_routines(c, role):
    if role == "family" and not get_consent(c)["share_routines"]:
        return []
    n = db.now(c)
    rows = c.execute("SELECT * FROM routines ORDER BY scheduled, id").fetchall()
    return [_routine(r, n, role) for r in rows if role == "parent" or r["share"]]


def add_routine(c, title, scheduled):
    if not get_consent(c)["share_routines"]:
        raise PermissionError("routine sharing is disabled")
    cur = c.execute(
        "INSERT INTO routines(kind,title_en,title_te,scheduled,share,family_created) VALUES('custom',?,?,?,1,1)",
        (title, title, scheduled),
    )
    add_event(c, "routine", "routine_added", cur.lastrowid)
    return _routine(_get_routine(c, cur.lastrowid), db.now(c), "family")


def update_family_routine(c, rid, title, scheduled):
    r = _get_routine(c, rid)
    if not r["family_created"]:
        raise PermissionError("only family-added reminders can be edited")
    if not get_consent(c)["share_routines"]:
        raise PermissionError("routine sharing is disabled")
    c.execute("UPDATE routines SET title_en=?,title_te=?,scheduled=? WHERE id=?", (title, title, scheduled, rid))
    add_event(c, "routine", "routine_updated", rid)
    return _routine(_get_routine(c, rid), db.now(c), "family")


def delete_family_routine(c, rid):
    r = _get_routine(c, rid)
    if not r["family_created"]:
        raise PermissionError("only family-added reminders can be deleted")
    c.execute("DELETE FROM events WHERE routine_id=?", (rid,))
    c.execute("DELETE FROM routines WHERE id=?", (rid,))


def _get_routine(c, rid):
    r = c.execute("SELECT * FROM routines WHERE id=?", (rid,)).fetchone()
    if not r:
        raise LookupError("routine")
    return r


def complete_routine(c, rid):
    _get_routine(c, rid)
    c.execute("UPDATE routines SET status='done', snoozed_until=NULL WHERE id=?", (rid,))
    add_event(c, "routine", "routine_done", rid)
    return _routine(_get_routine(c, rid), db.now(c), "parent")


def snooze_routine(c, rid, minutes):
    _get_routine(c, rid)
    c.execute("UPDATE routines SET status='snoozed', snoozed_until=? WHERE id=?", (db.iso(db.now(c) + timedelta(minutes=minutes)), rid))
    add_event(c, "routine", "routine_snoozed", rid)
    return _routine(_get_routine(c, rid), db.now(c), "parent")


def set_routine_share(c, rid, share):
    r = _get_routine(c, rid)
    if bool(r["share"]) != share:
        c.execute("UPDATE routines SET share=? WHERE id=?", (int(share), rid))
        add_event(c, "consent", "routine_sharing_" + ("on" if share else "off"), rid)
    return _routine(_get_routine(c, rid), db.now(c), "parent")


# ---------- timeline / notifications / dashboard ----------
def timeline(c, role, limit=40):
    cs = get_consent(c)
    rows = c.execute("SELECT e.*, r.title_en, r.title_te, r.share FROM events e LEFT JOIN routines r ON r.id=e.routine_id ORDER BY e.id DESC").fetchall()
    out = []
    for r in rows:
        cat = r["category"]
        if role == "family":
            if cat in ("checkin", "followup") and not cs["share_checkins"]:
                continue
            if cat == "routine" and not (cs["share_routines"] and r["share"]):
                continue
        hide_title = role == "family" and cat == "consent"  # don't reveal titles of routines that may be private
        out.append({"id": r["id"], "ts": r["ts"], "category": cat, "code": r["code"],
                    "title_en": None if hide_title else r["title_en"], "title_te": None if hide_title else r["title_te"]})
        if len(out) >= limit:
            break
    return out


def notifications(c, role):
    cs = get_consent(c)
    out = []
    for r in c.execute("SELECT * FROM escalations ORDER BY id DESC").fetchall():
        if role == "family" and r["kind"] == "overdue" and not cs["share_checkins"]:
            continue
        out.append({"id": r["id"], "kind": r["kind"], "ts": r["ts"], "resolved_at": r["resolved_at"],
                    "simulated": True, "contact": cs["contact_name"]})
    return out


def dashboard(c, role):
    n = db.now(c)
    cs = get_consent(c)
    s = c.execute("SELECT * FROM state WHERE id=1").fetchone()
    due = db.parse(s["due_at"])
    grace = timedelta(minutes=cs["grace_minutes"])
    status = "upcoming" if n < due else ("due" if n <= due + grace else "overdue")
    hide = role == "family" and not cs["share_checkins"]
    last = c.execute("SELECT ts FROM checkins ORDER BY id DESC LIMIT 1").fetchone()
    routines = list_routines(c, role)
    help_open = bool(c.execute("SELECT 1 FROM escalations WHERE kind='help' AND resolved_at IS NULL").fetchone())
    return {"role": role, "now": db.iso(n), "demo_offset_minutes": s["demo_offset_minutes"], "consent": cs,
            "checkins_shared": not hide, "routines_shared": cs["share_routines"] or role == "parent",
            "last_checkin": None if hide else (last["ts"] if last else None),
            "due_at": None if hide else s["due_at"], "status": None if hide else status,
            "help_open": help_open,
            "routine_counts": {k: sum(1 for r in routines if r["status"] == k) for k in ("done", "pending", "snoozed")},
            "notifications": notifications(c, role)}
