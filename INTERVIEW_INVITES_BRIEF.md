# Implementation Brief — Per-Candidate Interview Links + Mailer

**For:** the coding agent working in the IntervieHire backend.
**Goal:** every candidate gets a unique, unguessable interview link by email. Opening the link drops them into a Lina interview session bound to that token.

---

## Context

IntervieHire runs AI-led interviews via an avatar interviewer (**Lina**). Backend stack already in place: **FastAPI + SQLAlchemy + PostgreSQL + WebSockets**. There is an existing interview/session layer that Lina runs through, and an existing B2B cold-email pipeline (founder inbox rotation, spintax). **Do not reuse the cold-email pipeline for this** — see Mailer rules below.

A reference implementation already exists at `interview_invites.py`. Treat it as the intended shape, but **wire it into the real codebase** — discover the actual modules rather than assuming names.

---

## First: discover these in the codebase before writing anything

- The SQLAlchemy declarative `Base` and the session dependency (`get_db` or equivalent).
- The Alembic setup (or however migrations are run). New tables need a migration, not just a model.
- The existing **interview session** entrypoint — how a session/Lina is started today, and what identifier it keys on. The token must hand off to *that*.
- The existing **WebSocket** handler for the interview. It needs to accept and validate the same token.
- How SMTP / transactional email config is stored (env vars, settings object). Reuse it; don't invent a second config.
- The app's router registration so the new route is mounted correctly.

State what you found before implementing. If any of the above doesn't exist, flag it — don't silently stub it.

---

## What to build

### 1. Model — `interview_invites` table

| column | type | notes |
|---|---|---|
| `id` | UUID (PK) | internal, `uuid4` default |
| `token` | string, unique, indexed | **public** id in the URL; separate from `id` so links can be revoked/rotated |
| `candidate_email` | string, indexed, not null | |
| `candidate_name` | string | |
| `role` | string | role being interviewed for |
| `status` | enum: `pending / started / completed / expired` | default `pending` |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | default +7 days |
| `started_at` | timestamptz | set on first open |
| `completed_at` | timestamptz | set when Lina session finishes |

Ship an Alembic migration for it.

### 2. Token + link

- `token = uuid4().hex` (32-char, unguessable, clean URL).
- Public link: `https://app.interviehire.com/i/{token}` — **path-based**. Base URL must be config-driven, not hardcoded.
- `create_invite(db, email, name, role, ttl_days=7) -> (invite, link)`.

### 3. Route — `GET /i/{token}`

Resolve the token and guard:

- not found → **404**
- `status == completed` → **410** ("already completed")
- past `expires_at` → set `expired`, **410**
- `status == pending` → flip to `started`, set `started_at`
- re-opens of an already-`started` invite are **allowed** (candidate reconnects after a drop)

On success, hand off to the existing interview session keyed on `token`, and make sure the front end / WS can pick it up.

### 4. WebSocket binding

The interview WS (e.g. `/ws/interview/{token}`) must validate the token against `interview_invites` the same way the route does — reject unknown/expired/completed tokens. On session completion, set `status = completed` and `completed_at`.

### 5. Mailer (transactional)

- Send from a dedicated transactional sender (e.g. `interviews@interviehire.com`), **not** the founder inboxes used for cold outreach.
- Plain-text **and** HTML alternative. HTML uses the brand: Poppins, coral CTA `#F5542E`, ink text `#17171F`.
- Body: greeting, the role, the unique link, the expiry date, one line of instructions (quiet spot, camera + mic on). No scheduling step.
- `send_invite_email(invite, link, **smtp_config)`.
- `invite_candidates(db, [{email,name,role}, ...], **smtp)` for batch sends; returns `[{email, token, link}]`.

---

## Decisions already made (don't relitigate)

- Path-based token, not query param.
- Separate `token` from internal `id`.
- `uuid4` random token (not `uuid5`-from-email) — derived-from-email is guessable.
- Transactional sender, isolated from the cold-email reputation pool.

## Open decision — pick the default, flag it in the PR

Link lifecycle:
- **(A) single-use** — one candidate, dies on completion, 7-day expiry. *(current default)*
- **(B) slot-based** — valid for a time window, re-enterable until window closes.

Implement **A** unless the codebase already implies B. Either way, isolate the lifecycle check in one function so switching is a one-line change.

---

## Constraints

- No secrets in code — SMTP creds and base URL come from existing config/env.
- New table = new Alembic migration.
- Tokens must be unguessable; add basic rate-limiting on `GET /i/{token}` if the app has a limiter.
- Match the codebase's existing style, session handling, and error-response conventions — don't introduce a new pattern.

## Definition of done

1. Migration applies cleanly; `interview_invites` exists.
2. `create_invite` returns a working link.
3. Opening the link starts a Lina session bound to the token; reused/expired/completed links return the right errors.
4. WS validates the same token and marks completion.
5. A test candidate receives the email (text + HTML) from the transactional sender with their unique link.
6. Cold-email pipeline is untouched.
