import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import models

FMT = "%Y-%m-%dT%H:%M:%SZ"


def db_path() -> str:
    return os.environ.get("GENTLECHECK_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "gentlecheck.db"))


@contextmanager
def connect():
    c = sqlite3.connect(db_path())
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def iso(dt: datetime) -> str:
    return dt.strftime(FMT)


def parse(s: str) -> datetime:
    return datetime.strptime(s, FMT).replace(tzinfo=timezone.utc)


def now(c) -> datetime:
    """Demo clock = real UTC time + stored offset (minutes)."""
    off = c.execute("SELECT demo_offset_minutes FROM state WHERE id=1").fetchone()[0]
    return datetime.now(timezone.utc).replace(microsecond=0) + timedelta(minutes=off)


def seed(c):
    t = datetime.now(timezone.utc).replace(microsecond=0)
    c.execute("INSERT INTO state(id,demo_offset_minutes,due_at) VALUES(1,0,?)", (iso(t + timedelta(hours=2)),))
    c.execute("INSERT INTO consent VALUES(1,1,1,30,?,?)", (models.DEMO_CONTACT, iso(t)))
    for kind, en, te, detail, sched in models.DEMO_ROUTINES:
        c.execute("INSERT INTO routines(kind,title_en,title_te,detail,scheduled) VALUES(?,?,?,?,?)", (kind, en, te, detail, sched))


def init_db():
    with connect() as c:
        c.executescript(models.SCHEMA)
        if c.execute("SELECT COUNT(*) FROM state").fetchone()[0] == 0:
            seed(c)


def reset():
    with connect() as c:
        for t in models.TABLES:
            c.execute(f"DELETE FROM {t}")  # fixed table names, not user input
        c.execute("DELETE FROM sqlite_sequence")
        seed(c)
