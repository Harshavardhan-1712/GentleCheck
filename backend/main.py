import os
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import database as db
import schemas
from services import care_service as care
from services import escalation_service as esc

Role = Literal["parent", "family"]


@asynccontextmanager
async def lifespan(app):
    db.init_db()
    yield


app = FastAPI(title="GentleCheck API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174").split(",")],
                   allow_methods=["*"], allow_headers=["*"], allow_credentials=False)


@app.exception_handler(LookupError)
async def not_found(_, __):
    return JSONResponse(status_code=404, content={"detail": "Not found"})


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/dashboard")
def dashboard(role: Role = "parent"):
    with db.connect() as c:
        esc.evaluate(c)
        return care.dashboard(c, role)


@app.get("/api/routines")
def routines(role: Role = "parent"):
    with db.connect() as c:
        return care.list_routines(c, role)


@app.post("/api/checkins", status_code=201)
def checkin():
    with db.connect() as c:
        esc.evaluate(c)  # record a missed follow-up before it gets resolved by this check-in
        return care.checkin(c)


@app.post("/api/routines", status_code=201)
def add_routine(body: schemas.RoutineIn):
    try:
        with db.connect() as c:
            return care.add_routine(c, body.title, body.scheduled)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


@app.post("/api/routines/{routine_id}/complete")
def complete(routine_id: int):
    with db.connect() as c:
        return care.complete_routine(c, routine_id)


@app.post("/api/routines/{routine_id}/snooze")
def snooze(routine_id: int, body: schemas.SnoozeIn = schemas.SnoozeIn()):
    with db.connect() as c:
        return care.snooze_routine(c, routine_id, body.minutes)


@app.put("/api/routines/{routine_id}/sharing")
def routine_sharing(routine_id: int, body: schemas.ShareIn):
    with db.connect() as c:
        return care.set_routine_share(c, routine_id, body.share)


@app.post("/api/help")
def help_request():
    with db.connect() as c:
        return esc.request_help(c)


@app.get("/api/timeline")
def timeline(role: Role = "parent"):
    with db.connect() as c:
        esc.evaluate(c)
        return care.timeline(c, role)


@app.get("/api/consent")
def get_consent():
    with db.connect() as c:
        return care.get_consent(c)


@app.put("/api/consent")
def put_consent(body: schemas.ConsentIn):
    with db.connect() as c:
        return care.update_consent(c, body.model_dump(exclude_none=True))


@app.post("/api/demo/advance-time")
def advance_time(body: schemas.AdvanceIn):
    with db.connect() as c:
        return esc.advance(c, body.minutes, body.to_overdue)


@app.post("/api/demo/reset")
def reset():
    db.reset()
    with db.connect() as c:
        return care.dashboard(c, "parent")
