"""
InterviewerOS v2 — FastAPI Backend
Production-ready with CORS, health checks, session management, and question validation.
"""

import os
import uuid
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from agent import InterviewerOS
from dotenv import load_dotenv
load_dotenv()
# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("InterviewerOS")

# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="InterviewerOS",
    description="Autonomous Adaptive Technical Interview Agent",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Session Store (swap for Redis in production) ───────────────────────────────

sessions: dict[str, InterviewerOS] = {}

def get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY environment variable not set.")
    return key

def get_session(session_id: str) -> InterviewerOS:
    agent = sessions.get(session_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return agent


# ── Request / Response Models ──────────────────────────────────────────────────

class StartRequest(BaseModel):
    job_description: str = Field(..., min_length=50)
    candidate_name: Optional[str] = "Candidate"
    company_name: Optional[str] = ""
    role_title: Optional[str] = ""
    custom_questions: Optional[list[str]] = []
    max_questions: Optional[int] = Field(default=10, ge=3, le=30)

class StartResponse(BaseModel):
    session_id: str
    interviewer_speech: str
    current_level: str
    internal_monologue: str
    is_complete: bool
    question_mode: str
    total_questions: int

class AnswerRequest(BaseModel):
    session_id: str
    candidate_answer: str = Field(..., min_length=1)

class AnswerResponse(BaseModel):
    interviewer_speech: str
    current_level: str
    score_this_turn: Optional[int]
    hint_given: bool
    internal_monologue: str
    is_complete: bool
    updated_state: dict
    questions_asked: int
    max_questions: int

class ValidateQuestionsRequest(BaseModel):
    job_description: str
    questions: list[str] = Field(..., min_length=1)

class SummaryResponse(BaseModel):
    candidate_name: str
    role_title: str
    company_name: str
    competency_scores: dict
    questions_asked: int
    final_difficulty: str
    question_mode: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse("static/index.html")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "active_sessions": len(sessions),
    }

@app.post("/api/session/start", response_model=StartResponse, tags=["Session"])
async def start_session(req: StartRequest):
    """
    Bootstrap a new interview session.
    - If custom_questions is provided and non-empty → CUSTOM mode (use company questions).
    - Otherwise → AUTO mode (generate from JD).
    """
    agent = InterviewerOS(api_key=get_api_key())
    session_id = str(uuid.uuid4())

    result = agent.bootstrap(
        job_description=req.job_description,
        candidate_name=req.candidate_name or "Candidate",
        company_name=req.company_name or "",
        role_title=req.role_title or "",
        custom_questions=req.custom_questions or [],
        max_questions=req.max_questions or 10,
    )

    sessions[session_id] = agent
    log.info(f"Session started: {session_id} | Mode: {agent.question_mode} | Candidate: {agent.candidate_name}")

    return StartResponse(
        session_id=session_id,
        interviewer_speech=result.get("interviewer_speech", ""),
        current_level=result.get("current_level", "Proficient"),
        internal_monologue=result.get("internal_monologue", ""),
        is_complete=result.get("is_complete", False),
        question_mode=agent.question_mode,
        total_questions=agent.max_questions,
    )


@app.post("/api/session/answer", response_model=AnswerResponse, tags=["Session"])
async def submit_answer(req: AnswerRequest):
    """Evaluate candidate answer and return the next question or final report."""
    agent = get_session(req.session_id)
    result = agent.process_answer(req.candidate_answer)

    if result.get("is_complete"):
        log.info(f"Session complete: {req.session_id}")

    return AnswerResponse(
        interviewer_speech=result.get("interviewer_speech", ""),
        current_level=result.get("current_level", "Proficient"),
        score_this_turn=result.get("score_this_turn"),
        hint_given=result.get("hint_given", False),
        internal_monologue=result.get("internal_monologue", ""),
        is_complete=result.get("is_complete", False),
        updated_state=result.get("updated_state", {}),
        questions_asked=agent.state.questions_asked,
        max_questions=agent.max_questions,
    )


@app.get("/api/session/summary/{session_id}", response_model=SummaryResponse, tags=["Session"])
async def get_summary(session_id: str):
    """Get the final competency scores and session summary."""
    agent = get_session(session_id)
    return agent.get_session_summary()


@app.delete("/api/session/{session_id}", tags=["Session"])
async def end_session(session_id: str):
    """Manually end and clean up a session."""
    sessions.pop(session_id, None)
    log.info(f"Session ended: {session_id}")
    return {"message": "Session terminated successfully."}


@app.post("/api/questions/validate", tags=["Questions"])
async def validate_questions(req: ValidateQuestionsRequest):
    """
    Validate company-provided questions against the JD.
    Returns relevance scores, difficulty estimates, and missing competency suggestions.
    """
    agent = InterviewerOS(api_key=get_api_key())
    result = agent.validate_questions(req.questions, req.job_description)
    return result


# ── Error Handlers ─────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    log.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


# ── Static + Entry Point ───────────────────────────────────────────────────────

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("ENV", "production") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=debug)
