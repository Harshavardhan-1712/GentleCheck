# GentleCheck
**Independence for them. Peace of mind for you.**

Privacy-first daily care companion for older adults living independently. The parent checks in and completes routines; an authorized family member sees only what the parent consents to share. No sensors, cameras, wearables, GPS, continuous monitoring or AI diagnosis. A missed check-in is **not** proof of an emergency.

## Features
- Parent mode: "I'm doing okay" check-in, 6 demo routines (medication, meal, hydration, movement, family call, custom) with complete/snooze, "I need help", sharing summary.
- Family mode: last check-in, next due + status, routine status, activity timeline, follow-up notifications, consent status, demo clock controls, grace period; add, edit and remove reminders created in family mode while routine sharing is enabled.
- Settings: English/Telugu, parent-controlled consent (check-ins, routines, per routine), grace period, demo reset with confirmation.
- FastAPI + SQLite (persistent), deterministic escalation (max one per due check-in), consent enforced in backend responses.
- **The Parent/Family switch is a demo mechanism, not authentication or production authorization.** Family-facing API calls are just `?role=family`; family-created reminder management is likewise demo-only.
- Notifications are **simulated**. Nothing is sent by SMS, email or phone. Medication text only repeats what the user typed; the app never suggests medicines or doses.

## Prerequisites (Windows)
Python 3.10+ and Node.js 18+ (`python --version`, `node --version`).

## Setup (PowerShell)
Backend:
```powershell
cd gentlecheck\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Frontend (second terminal):
```powershell
cd gentlecheck\frontend
npm install
npm run dev
```
- App: http://localhost:5173
- Health: http://localhost:8000/api/health
- Swagger: http://localhost:8000/docs

Tests / build: `cd backend; pytest` and `cd frontend; npm run build`.
Optional config: see `.env.example`. Set `FRONTEND_ORIGINS` on the backend to a comma-separated list of exact frontend origins. The default allows the local Vite origins and `https://gentle-check.vercel.app`; origins must not include a trailing slash. CORS credentials are disabled. For local development, leave this variable unset or include the localhost entries when setting it. On Vercel, set `VITE_API_URL` to the deployed FastAPI base URL; configure `FRONTEND_ORIGINS` in the FastAPI host environment to include `https://gentle-check.vercel.app`.

## Demo walkthrough
1. Parent mode → **I'm doing okay**. Switch to Family → check-in and timeline appear.
2. Parent → complete/snooze a routine → visible in Family timeline.
3. Settings → turn off "Check-ins" → Family shows nothing about check-ins (enforced in backend). Turn off a single routine → hidden from Family.
4. Family → **Trigger overdue scenario** → status Overdue, one follow-up event, one clearly labelled simulated notification. Pressing it again creates no duplicate.
5. Parent → **I'm doing okay** → follow-up resolved.
6. Parent → **I need help** → help event + simulated notification (help is an explicit request, so it is not blocked by check-in sharing).
7. Switch language to తెలుగు anywhere. Settings → Reset demo data.

## Voice assistant (Parent mode)
A calm, optional voice layer on top of the existing buttons. Every voice action calls the same `api.ts` functions/endpoints as the touch controls (`/api/checkins`, `/api/routines`, `/api/routines/{id}/complete|snooze`, `/api/help`, `/api/dashboard`). Success is spoken **only after the server responds OK**; failures are shown and spoken with a Retry button.

**Browser compatibility** (Web Speech API, no paid services or API keys):
| Feature | Chrome / Edge (desktop, Android) | Safari | Firefox |
|---|---|---|---|
| Speech recognition | Yes (`en-IN`; `te-IN` where the browser supports it) | Partial | No |
| Speech synthesis | Yes (needs an installed voice for the language) | Yes | Yes |

Telugu recognition and Telugu voices are **not guaranteed** in every browser/OS. If unavailable, the assistant says so and you can use the text box (replies are still shown as Telugu text) or the touch controls.

**Microphone permissions:** the mic starts only when you tap the microphone button, listens for one command (auto-stops after ~10 s) and shows "Listening…". If permission is denied or no mic exists, a localized message appears and text input keeps working. Use `http://localhost` or HTTPS.

**Commands** (English / తెలుగు; typing works too):
| Intent | English | Telugu |
|---|---|---|
| Check in | "I'm doing okay", "Check in" | "నేను బాగానే ఉన్నాను" |
| Today's reminders | "What should I do today?", "Read my reminders" | "ఈ రోజు నేను ఏం చేయాలి", "నా రిమైండర్లు చదవండి" |
| Complete | "Mark my meal reminder complete" | "భోజనం పూర్తయింది" |
| Snooze 30 min | "Remind me later" (+ routine name) | "తర్వాత గుర్తు చేయండి" |
| Help | "I need help" | "నాకు సహాయం కావాలి" |
| Stop / Repeat | "Stop speaking" / "Repeat that" | "ఆపండి" / "మళ్లీ చెప్పండి" |
| Language | "Change language" (then say English or Telugu) | "భాష మార్చండి" |
| Commands | "What can I say?" | "నేను ఏమి చెప్పగలను" |

If a routine name is missing or ambiguous (e.g. "complete" alone), the assistant lists the options and asks you to say a name or number; it never guesses. Matching is deterministic keyword rules in `src/voiceCommands.ts` (no AI service). Voice cannot reset data or change sharing consent. "I need help" runs immediately through the existing help workflow and shows the real backend status; the notification is still **simulated**.

**Privacy limits:** no always-on listening; this app never records, uploads or stores audio or transcripts (the chat log lives only in memory). **However**, in Chrome/Edge the browser's built-in recognizer may send audio to the browser vendor's speech service; GentleCheck does not control that. Use the text box if that is unacceptable. No medical advice or dosage suggestions: medication reminders only repeat the note the user typed (read aloud in English only).

**Voice demo:** (1) tap the mic → say "I'm doing okay" → hear the confirmation after the save; (2) say "What should I do today?"; (3) say "I need help" → see the "Backend status" line; (4) switch to Family mode to see the results. For Telugu, choose తెలుగు and repeat, or type the Telugu phrases if recognition isn't supported.

Tests: `cd frontend; npm run test:voice` (command matching, English and Telugu).

## Design notes
- Timestamps are UTC internally (`...Z`) and displayed in the browser's local time. The demo clock is real UTC + a stored minute offset.
- First check-in is due 2 h after seed; each check-in sets the next due 24 h later. Overdue = now > due + grace.
- Family API never returns routine detail notes, and hides check-in data, routine data and related timeline events when not consented.
- Routine statuses are not reset daily in this MVP.

## Troubleshooting
- `Activate.ps1 cannot be loaded`: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- "Cannot reach the GentleCheck server": backend isn't running on port 8000 or `VITE_API_URL` differs.
- CORS error: add the frontend's exact origin to the backend's comma-separated `FRONTEND_ORIGINS`.
- Port busy: use `--port 8001` and set `VITE_API_URL=http://localhost:8001`, plus the matching frontend origin in `FRONTEND_ORIGINS`.
- Stale data: Settings → Reset demo data, or delete `backend/gentlecheck.db`.

## Limitations / future work
No real authentication, secure family invitations, production authorization, rate limiting or HTTPS deployment hardening. No real notification provider. One parent and one family contact. Telugu strings should be reviewed by a native speaker. No daily routine reset; no frontend tests.
