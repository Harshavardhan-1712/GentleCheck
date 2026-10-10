"""SQLite schema and fictional demo seed data."""
SCHEMA = """
CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1), demo_offset_minutes INTEGER NOT NULL DEFAULT 0, due_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consent(id INTEGER PRIMARY KEY CHECK(id=1), share_checkins INTEGER NOT NULL, share_routines INTEGER NOT NULL,
  grace_minutes INTEGER NOT NULL, contact_name TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checkins(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS routines(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, title_en TEXT NOT NULL, title_te TEXT NOT NULL,
  detail TEXT, scheduled TEXT NOT NULL, share INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending', snoozed_until TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, category TEXT NOT NULL, code TEXT NOT NULL,
  routine_id INTEGER REFERENCES routines(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS escalations(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ref TEXT NOT NULL, ts TEXT NOT NULL,
  resolved_at TEXT, UNIQUE(kind, ref));
"""
TABLES = ["escalations", "events", "routines", "checkins", "consent", "state"]
DEMO_CONTACT = "Priya (demo family contact)"
# kind, title_en, title_te, user-entered detail, scheduled
DEMO_ROUTINES = [
    ("medication", "Morning medication", "ఉదయం మందులు", "Take the tablet from the blue box with breakfast (my own note).", "08:30"),
    ("meal", "Eat breakfast", "అల్పాహారం తినండి", None, "08:00"),
    ("hydration", "Drink a glass of water", "ఒక గ్లాసు నీళ్లు తాగండి", None, "10:00"),
    ("movement", "Gentle walk in the garden", "తోటలో కొంచెం నడక", None, "17:00"),
    ("call", "Call family", "కుటుంబానికి ఫోన్ చేయండి", None, "19:00"),
    ("custom", "Water the tulsi plant", "తులసి మొక్కకు నీళ్లు పోయండి", None, "07:00"),
]
