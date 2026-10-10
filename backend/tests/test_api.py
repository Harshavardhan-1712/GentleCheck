import pytest
from fastapi.testclient import TestClient

import database as db
from main import app


@pytest.fixture()
def client():
    db.init_db()
    with TestClient(app) as c:
        c.post("/api/demo/reset")
        yield c


def fam(c, path="dashboard"):
    return c.get(f"/api/{path}", params={"role": "family"}).json()


def test_health_and_seed(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    assert len(client.get("/api/routines").json()) == 6
    assert client.get("/api/dashboard").json()["last_checkin"] is None


@pytest.mark.parametrize("path", ["/api/dashboard?role=parent", "/api/routines?role=parent"])
@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://localhost:5174"])
def test_cors_preflight_for_read_endpoints(client, path, origin):
    response = client.options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "GET" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"]
    assert "access-control-allow-credentials" not in response.headers


def test_checkin_reaches_family(client):
    assert client.post("/api/checkins").status_code == 201
    d = fam(client)
    assert d["last_checkin"] and d["status"] == "upcoming"
    assert fam(client, "timeline")[0]["code"] == "checkin_done"


def test_routine_complete_snooze_and_404(client):
    assert client.post("/api/routines/1/complete").json()["status"] == "done"
    assert client.post("/api/routines/2/snooze", json={"minutes": 30}).json()["status"] == "snoozed"
    assert client.post("/api/routines/999/complete").status_code == 404
    assert client.post("/api/routines/2/snooze", json={"minutes": 1}).status_code == 422


def test_family_never_gets_details(client):
    assert all("detail" not in r for r in client.get("/api/routines", params={"role": "family"}).json())
    assert any(r["detail"] for r in client.get("/api/routines").json())


def test_add_custom_routine(client):
    response = client.post("/api/routines", json={"title": "Take a walk", "scheduled": "16:30"})

    assert response.status_code == 201
    assert response.json()["kind"] == "custom"
    assert response.json()["title_en"] == "Take a walk"
    assert response.json()["title_te"] == "Take a walk"
    assert response.json()["scheduled"] == "16:30"
    assert "detail" not in response.json()
    assert response.json()["id"] in [r["id"] for r in fam(client, "routines")]
    assert fam(client, "timeline")[0]["code"] == "routine_added"


def test_add_custom_routine_requires_sharing_consent(client):
    client.put("/api/consent", json={"share_routines": False})

    response = client.post("/api/routines", json={"title": "Take a walk", "scheduled": "16:30"})

    assert response.status_code == 403
    assert len(client.get("/api/routines").json()) == 6


@pytest.mark.parametrize("routine", [
    {"title": "  ", "scheduled": "16:30"},
    {"title": "Take a walk", "scheduled": "24:30"},
    {"title": "Take a walk", "scheduled": "4:30"},
])
def test_add_custom_routine_validates_input(client, routine):
    assert client.post("/api/routines", json=routine).status_code == 422


def test_consent_enforced_in_backend(client):
    client.post("/api/checkins")
    client.post("/api/routines/1/complete")
    assert client.put("/api/consent", json={"share_checkins": False, "share_routines": False}).status_code == 200
    d = fam(client)
    assert d["last_checkin"] is None and d["due_at"] is None and d["status"] is None
    assert fam(client, "routines") == []
    assert {e["category"] for e in fam(client, "timeline")} == {"consent"}
    assert client.get("/api/dashboard").json()["last_checkin"] is not None  # parent still sees it
    assert client.put("/api/consent", json={}).status_code == 422


def test_single_routine_sharing_off(client):
    client.put("/api/routines/1/sharing", json={"share": False})
    assert 1 not in [r["id"] for r in client.get("/api/routines", params={"role": "family"}).json()]


def test_overdue_single_escalation_and_resolution(client):
    r = client.post("/api/demo/advance-time", json={"minutes": 60}).json()
    assert r["escalation_created"] is False  # still within due + grace
    assert client.post("/api/demo/advance-time", json={"to_overdue": True}).json()["escalation_created"] is True
    assert client.post("/api/demo/advance-time", json={"minutes": 120}).json()["escalation_created"] is False
    d = fam(client)
    overdue = [n for n in d["notifications"] if n["kind"] == "overdue"]
    assert d["status"] == "overdue" and len(overdue) == 1 and overdue[0]["simulated"] is True
    client.post("/api/checkins")
    d = fam(client)
    assert d["status"] == "upcoming" and d["notifications"][0]["resolved_at"]


def test_grace_period_respected(client):
    client.put("/api/consent", json={"grace_minutes": 600})
    client.post("/api/demo/advance-time", json={"minutes": 240})
    assert client.get("/api/dashboard").json()["notifications"] == []


def test_help_request_and_no_duplicate(client):
    assert client.post("/api/help").json()["created"] is True
    assert client.post("/api/help").json()["created"] is False
    d = fam(client)
    assert d["help_open"] and d["notifications"][0]["kind"] == "help"


def test_advance_validation_and_reset(client):
    assert client.post("/api/demo/advance-time", json={}).status_code == 422
    client.post("/api/checkins")
    assert client.post("/api/demo/reset").json()["last_checkin"] is None
