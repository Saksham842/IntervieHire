# IntervieHire — MVP

An AI-driven hiring platform: recruiters author rubric-grade interview blueprints, a **live AI avatar** runs the interview under full proctoring, and candidates are scored against the recruiter's own rubric into a structured evaluation report.

This MVP folder stitches three pieces into one working product. The recruiter dashboard drives everything; clicking **Test Interview** on a job launches the candidate pipeline (**system test → gaze calibration → live avatar interview with proctoring**) built from the IntervieHire 2.0 interview engine.

This repo stitches three pieces into one working MVP:

| Component | Dir | Role |
|-----------|-----|------|
| **Recruiter dashboard** | [`dashboard/`](dashboard/) | The product surface — job pipelines, the **Interview Blueprint Studio** (authors questions + graded rubrics), and **Deep Analysis** (post-interview candidate intelligence). Leads the contract. |
| **AI interview engine** | [`interview-engine/`](interview-engine/) | Fastify API (`:4000`) + candidate interview room (Next.js) + the **Aviral evaluation engine** (`apps/api/src/aviral-eval/`). Runs the interview and scores it with DeepSeek. |
| **Backend** | [`backend/`](backend/) | FastAPI (`:8000`) over Supabase Postgres — jobs, applicants, auth, and the bridge that feeds blueprints to the engine and serves reports back. |

## How it fits together

```
Recruiter (dashboard :3000)
   │  authors blueprint + rubric in the Blueprint Studio
   ▼
FastAPI backend (:8000)  ──persists──►  Supabase Postgres
   │  on schedule: syncs the job's questions + rubric into the engine's tables
   ▼
Candidate interview room (interview-engine web)
   │  text/voice answers  →  Fastify engine (:4000)
   ▼
Aviral evaluation engine + DeepSeek
   │  grades each answer against the recruiter's rubric → CandidateReport
   ▼
Supabase  ──►  FastAPI serves the report  ──►  Deep Analysis renders it
```

The dashboard, engine, and backend integrate through a **shared Supabase database** — the FastAPI backend mirrors the engine's tables, so a blueprint authored in the dashboard reaches the interview, and the resulting `CandidateReport` flows straight back to Deep Analysis.

### Evaluation

Scoring uses the **Aviral evaluation engine** (`interview-engine/apps/api/src/aviral-eval/`): for each answer it builds a rubric-grounded prompt, asks DeepSeek to grade it, validates the result, and aggregates a canonical `CandidateReport` (overall score, recommendation, per-dimension skill scores, per-question breakdown, red flags). Without a `DEEPSEEK_API_KEY` it falls back to a deterministic evaluator, so an interview still runs and scores with **zero API keys**.

## Quick start

Each component has its own `.env.example` — copy it to `.env` (or `.env.local` for the dashboard) and fill in the values. The three services share one Supabase database.

**1. Backend (FastAPI, `:8000`)**
```bash
cd backend
python -m venv venv && venv/Scripts/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # fill DATABASE_URL, SECRET_KEY
python -m uvicorn main:app --port 8000 --reload
```

**2. Interview engine (Fastify `:4000` + candidate web `:3001`)**
```bash
cd interview-engine
npm install
cp .env.example .env                                  # fill DATABASE_URL (+ DEEPSEEK_API_KEY for LLM scoring)
# candidate web env is in apps/web/.env.local — set NEXT_PUBLIC_AVATAR_URL there
npm run build -w packages/shared
npm run db:generate -w apps/api
npm run dev                                           # api :4000 + web :3001
```
A keyless **test interview** is available immediately at `/interview` (it seeds a demo session via `GET /api/interview/demo-session`). The candidate room runs the full pipeline: **pre-interview system test → 8-point gaze calibration → live avatar interview with proctoring** (gaze/face/object/tab/fullscreen) and per-answer rubric scoring.

**2b. Avatar service (Unreal Engine Pixel Streaming, `:80`)** — optional
The interview room embeds a live avatar via `NEXT_PUBLIC_AVATAR_URL` (set in `interview-engine/apps/web/.env.local`, default `http://localhost:80/?AutoConnect=true`). Point it at your Pixel Streaming instance. If it is unset or unreachable, the room shows a graceful "configure the avatar" panel — the interview, calibration, and proctoring still run.

**3. Dashboard (Next.js, `:3000`)**
```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
```
The dashboard runs on localStorage by default. Flip it to the live backend with `IHApi.setDataSource('api')` in the browser console (it then hydrates jobs, persists authored blueprints, and renders live reports in Deep Analysis).

## Notes

- **Secrets** live only in `.env` files, which are gitignored. Never commit real keys or database URLs.
- The recruiter dashboard is the source of truth for the `CandidateReport` shape; the engine and backend conform to it.
- The candidate room supports proctoring (gaze/face/object) and voice, but a typed text interview needs no paid voice keys.

## What was stitched (IntervieHire 2.0 → this MVP)

The candidate interview room is the IntervieHire 2.0 pipeline, integrated into the engine while preserving the dashboard's launch contract (`Test Interview` → FastAPI `POST /jobs/{id}/test-session` → opens `:3001/interview?sessionId=…`). Specifically:

- **Live avatar** — `apps/web/components/AvatarStreamFrame.tsx` (Pixel Streaming iframe) replaced the static placeholder image in `apps/web/app/interview/page.tsx`, wired to `NEXT_PUBLIC_AVATAR_URL`.
- **Improved gaze calibration** — `apps/web/hooks/useGazeCalibration.ts` now infers the neutral baseline from opposite dot-pairs (the 8-dot calibration never samples center), fixing a case where neutral defaulted to 0.
- **Engine-superior proctoring kept** — the engine's `useProctoring` (integrity scoring, session control), live transcription, schedule-lock, and rubric evaluation were retained; the 2.0 room's hardcoded-question / self-demo flow was **not** used, since this MVP uses the per-job blueprint via the dashboard.
- The engine's own candidate dashboard/landing was removed — the engine root (`/`) now redirects straight to `/interview`.
