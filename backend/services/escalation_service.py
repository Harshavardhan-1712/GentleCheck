from datetime import timedelta

import database as db
from services import care_service as care


def evaluate(c):
    """Deterministic rule: overdue only after due_at + grace. At most one escalation per due check-in (UNIQUE kind+ref)."""
    s = c.execute("SELECT due_at FROM state WHERE id=1").fetchone()
    grace = timedelta(minutes=care.get_consent(c)["grace_minutes"])
    n = db.now(c)
    if n > db.parse(s["due_at"]) + grace:
        cur = c.execute("INSERT OR IGNORE INTO escalations(kind,ref,ts) VALUES('overdue',?,?)", (s["due_at"], db.iso(n)))
        if cur.rowcount:
            care.add_event(c, "followup", "followup_created")
            return True
    return False


def request_help(c):
    if c.execute("SELECT 1 FROM escalations WHERE kind='help' AND resolved_at IS NULL").fetchone():
        return {"created": False}
    ts = db.iso(db.now(c))
    c.execute("INSERT INTO escalations(kind,ref,ts) VALUES('help',?,?)", (ts, ts))
    care.add_event(c, "help", "help_requested")
    return {"created": True}


def advance(c, minutes=None, to_overdue=False):
    if to_overdue:
        s = c.execute("SELECT due_at FROM state WHERE id=1").fetchone()
        target = db.parse(s["due_at"]) + timedelta(minutes=care.get_consent(c)["grace_minutes"], seconds=60)
        minutes = max(0, -(-int((target - db.now(c)).total_seconds()) // 60))
    c.execute("UPDATE state SET demo_offset_minutes = demo_offset_minutes + ? WHERE id=1", (minutes,))
    created = evaluate(c)
    off = c.execute("SELECT demo_offset_minutes FROM state WHERE id=1").fetchone()[0]
    return {"demo_offset_minutes": off, "advanced_minutes": minutes, "escalation_created": created}
