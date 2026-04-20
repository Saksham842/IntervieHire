# InterviewerOS v2 🚀

**Autonomous Adaptive Technical Interview Platform**  
AI-powered interviewer with dynamic difficulty scaling, custom question support, and a professional enterprise UI.

---

## What's New in v2

| Feature | v1 | v2 |
|---|---|---|
| Question modes | Auto-generate only | ✅ Auto-generate OR custom questions |
| Question validation | ❌ | ✅ AI validates custom questions vs JD |
| Voice for questions | ❌ | ✅ Add custom questions by voice |
| Multi-step setup | ❌ | ✅ 3-step wizard (Company → Questions → Candidate) |
| Scoring detail | Score only | ✅ Score + per-topic notes |
| Hint tracking | ❌ | ✅ Flagged in UI and report |
| Wrapup report | Basic | ✅ STRONG HIRE / HIRE / CONSIDER / NO HIRE |
| Docker | ❌ | ✅ Dockerfile + docker-compose |
| Live question queue | ❌ | ✅ Sidebar shows custom question progress |
| Progress bar | ❌ | ✅ Real-time progress indicator |

---

## Architecture

```
Browser (Frontend)
  └── static/index.html
      ├── 3-step Setup Wizard (Company → Questions → Candidate)
      ├── Interview Screen (Chat + Sidebar + Scores)
      ├── Wrapup Report (Scores + Recommendation + Full Report)
      ├── Web Speech API (STT voice input)
      └── speechSynthesis (TTS output)

FastAPI Backend (main.py)
  ├── POST /api/session/start     Bootstrap session
  ├── POST /api/session/answer    Evaluate + next question
  ├── GET  /api/session/summary   Final scores
  ├── DELETE /api/session/{id}    End session
  └── POST /api/questions/validate  Validate custom questions

InterviewerOS Agent (agent.py)
  ├── bootstrap()       Parse JD, init state, opening question
  ├── process_answer()  Evaluate, adapt difficulty, next question
  └── validate_questions()  Check question quality vs JD

Claude claude-sonnet-4-20250514 (Anthropic API)
  └── Full conversation history injected each turn
```

---

## Quick Start

### Option A — Python (local)

```bash
# 1. Clone / unzip
cd interviewer_os_v2

# 2. Virtual environment
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install
pip install -r requirements.txt

# 4. API key
cp .env.example .env
# Edit .env → set ANTHROPIC_API_KEY

# 5. Run
python main.py

# 6. Open
open http://localhost:8000
```

### Option B — Docker

```bash
cp .env.example .env
# Edit .env → set ANTHROPIC_API_KEY

docker compose up --build
# → http://localhost:8000
```

---

## Question Modes

### 🤖 Auto-Generate (default)
The AI extracts competencies from your JD and generates questions starting at Medium difficulty.  
The adaptive engine scales up/down based on each answer.

### 📋 Custom Questions
You provide the interview questions. The agent:
1. Uses your questions in order.
2. Adds adaptive follow-up questions based on candidate answers.
3. Returns to your queue after follow-ups.
4. Validates your questions against the JD before the interview starts.

---

## Scoring Rubric

| Score | Level | Meaning |
|---|---|---|
| 9-10 | Exceptional | Architectural thinking, edge cases, proactive trade-off analysis |
| 7-8  | Strong | Correct answer with good depth, minor gaps |
| 5-6  | Adequate | Mostly correct, lacks depth |
| 3-4  | Weak | Partial understanding, significant gaps |
| 1-2  | Poor | Fundamental misunderstanding |
| 0    | No answer | Skipped or unable to answer |

---

## API Reference

### `POST /api/session/start`
```json
{
  "job_description": "...",
  "candidate_name": "Arjun Sharma",
  "company_name": "Axiom Systems",
  "role_title": "Senior Backend Engineer",
  "custom_questions": ["Q1", "Q2"],  // [] for auto-generate
  "max_questions": 8
}
```

### `POST /api/session/answer`
```json
{ "session_id": "uuid", "candidate_answer": "..." }
```
Returns: `{ interviewer_speech, current_level, score_this_turn, hint_given, is_complete, updated_state }`

### `POST /api/questions/validate`
```json
{ "job_description": "...", "questions": ["Q1", "Q2"] }
```
Returns: per-question relevance scores, difficulty estimates, missing competency suggestions.

---

## Production Deployment

### Railway / Render
1. Push repo to GitHub.
2. Connect to Railway or Render.
3. Set env var: `ANTHROPIC_API_KEY`.
4. Deploy. Done.

### Self-hosted (Nginx reverse proxy)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> ⚠️ HTTPS is required for Web Speech API (voice) in production.  
> Use Certbot/Let's Encrypt or any SSL provider.

### Session Storage (scale beyond 1 server)
Replace the in-memory `sessions: dict` in `main.py` with Redis:
```python
import redis, pickle
r = redis.from_url(os.getenv("REDIS_URL"))
r.setex(session_id, 3600, pickle.dumps(agent))   # 1hr TTL
```

---

## File Structure

```
interviewer_os_v2/
├── agent.py           ← Core AI agent + adaptive engine
├── main.py            ← FastAPI backend
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── static/
    └── index.html     ← Full frontend (setup + interview + wrapup)
```
