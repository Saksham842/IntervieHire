from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Header, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import json
import logging
import os
import shutil
import tempfile

from app.database import get_db
from app.models.applicant import Applicant, InterviewStatus
from app.models.job import Job, JobStatus
from app.models.user import User
from app.models.organisation import Organisation
from app.config import settings
from app.utils.google_calendar import create_calendar_event, update_calendar_event
from app.utils.google_drive import upload_recording
from app.utils.email_sender import send_ical_invitation_email
from app.routers.invites import _rate_limit

from google_auth_oauthlib.flow import Flow

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/oauth/connect")
def oauth_connect(user_id: str):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth client credentials are not configured globally.")
        
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/drive.file"],
        autogenerate_code_verifier=False,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        state=user_id
    )
    return RedirectResponse(authorization_url)

@router.get("/oauth2callback")
def oauth2callback(code: str, state: str, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth client credentials are not configured globally.")
        
    user_id = state
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/drive.file"],
        autogenerate_code_verifier=False,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    try:
        user_uuid = UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID in state.")
        
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.google_refresh_token = credentials.refresh_token
    user.google_client_id = settings.GOOGLE_CLIENT_ID
    user.google_client_secret = settings.GOOGLE_CLIENT_SECRET
    db.commit()
    
    return HTMLResponse(content="""
    <html>
        <head>
            <title>Connection Successful</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background-color: #0b0f19; color: #f3f4f6; text-align: center; padding: 100px 20px; }
                .container { max-width: 500px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
                h1 { color: #10b981; }
                p { font-size: 18px; color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Google Calendar Connected!</h1>
                <p>Your calendar has been successfully connected to IntervieHire.</p>
                <p>You can close this tab now.</p>
            </div>
        </body>
    </html>
    """)

@router.get("/schedule/{token}")
def get_public_schedule_info(token: str, request: Request, db: Session = Depends(get_db)):
    # Unauthenticated PII lookup — throttle per-IP to blunt token probing/scraping.
    _rate_limit(request, limit=60, window=60.0)
    applicant = db.query(Applicant).filter(Applicant.scheduling_token == token).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Invalid or expired scheduling token.")
        
    job = db.query(Job).filter(Job.id == applicant.job_id).first()
    job_title = job.role_name or job.title if job else "General Position"
    
    stage = "Resume"
    scheduled_at = None
    if applicant.functional_status is not None:
        stage = "Functional Interview"
        scheduled_at = applicant.functional_scheduled_at
    elif applicant.screening_status is not None:
        stage = "Recruiter Screening"
        scheduled_at = applicant.screening_scheduled_at
        
    return {
        "candidate_name": applicant.name,
        "email": applicant.email,
        "job_title": job_title,
        "stage": stage,
        "scheduled_at": scheduled_at.isoformat() if scheduled_at else None
    }

@router.get("/interview-session/{session_id}")
def get_public_interview_session_info(session_id: UUID, request: Request, db: Session = Depends(get_db)):
    # Unauthenticated PII lookup by applicant id — throttle per-IP against enumeration.
    _rate_limit(request, limit=60, window=60.0)
    applicant = db.query(Applicant).filter(Applicant.id == session_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    job = db.query(Job).filter(Job.id == applicant.job_id).first()
    job_title = job.role_name or job.title if job else "General Position"
    
    stage = "Resume"
    scheduled_at = None
    if applicant.functional_status is not None:
        stage = "Functional Interview"
        scheduled_at = applicant.functional_scheduled_at
    elif applicant.screening_status is not None:
        stage = "Recruiter Screening"
        scheduled_at = applicant.screening_scheduled_at
        
    return {
        "candidate_name": applicant.name,
        "email": applicant.email,
        "job_title": job_title,
        "stage": stage,
        "scheduled_at": scheduled_at.isoformat() if scheduled_at else None
    }

@router.get("/confirm/{token}", response_class=HTMLResponse)
def confirm_interview_slot(token: str, request: Request, db: Session = Depends(get_db)):
    # Unauthenticated state-changing token endpoint — throttle per-IP.
    _rate_limit(request, limit=30, window=60.0)
    applicant = db.query(Applicant).filter(Applicant.scheduling_token == token).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Invalid or expired scheduling token.")
        
    job = db.query(Job).filter(Job.id == applicant.job_id).first()
    job_title = job.role_name or job.title if job else "General Position"
    recruiter_id = job.created_by_id if job else None
    
    # Resolve organizer name and email from Organisation
    from app.models.organisation import Organisation
    organizer_name = "IntervieHire Host"
    organizer_email = settings.SMTP_FROM or "hr@interviehire.com"
    if job and job.organisation_id:
        org = db.query(Organisation).filter(Organisation.id == job.organisation_id).first()
        if org:
            if org.org_name:
                organizer_name = org.org_name
            if org.contact_email:
                organizer_email = org.contact_email

    stage = "Interview"
    proposed_time = None
    if applicant.functional_status is not None:
        stage = "Functional Interview"
        if not applicant.functional_scheduled_at:
            # Set default timer to 1 PM next day
            now = datetime.utcnow()
            applicant.functional_scheduled_at = (now + timedelta(days=1)).replace(hour=13, minute=0, second=0, microsecond=0)
        proposed_time = applicant.functional_scheduled_at
        applicant.functional_status = InterviewStatus.scheduled
        try:
            from app.utils.ai_sync import sync_applicant_to_ai
            sync_applicant_to_ai(db, applicant)
        except Exception as sync_err:
            logger.error(f"Failed to sync applicant to AI database: {sync_err}")
    elif applicant.screening_status is not None:
        stage = "Recruiter Screening"
        if not applicant.screening_scheduled_at:
            # Set default timer to 1 PM next day
            now = datetime.utcnow()
            applicant.screening_scheduled_at = (now + timedelta(days=1)).replace(hour=13, minute=0, second=0, microsecond=0)
        proposed_time = applicant.screening_scheduled_at
        applicant.screening_status = InterviewStatus.scheduled
        
    if not proposed_time:
        raise HTTPException(status_code=400, detail="No proposed time is set for the interview.")

    # Reset sequence to 0 on initial confirm
    applicant.calendar_sequence = 0

    # Create google calendar event
    summary = f"{stage} - {applicant.name}"
    desc = f"Interview scheduled for the {job_title} role at IntervieHire."
    
    try:
        event_id = create_calendar_event(
            summary=summary,
            description=desc,
            candidate_email=applicant.email,
            start_time=proposed_time,
            recruiter_id=recruiter_id,
            db=db
        )
        applicant.calendar_event_id = event_id
    except Exception as cal_err:
        logger.error(f"Failed to create Google Calendar event: {cal_err}")
        
    db.commit()
    db.refresh(applicant)
    
    # Send custom MIME/iCalendar confirmation email
    reschedule_link = f"{settings.FRONTEND_URL}/reschedule.html?token={applicant.scheduling_token}"
    _job_qs = f"&jobId={applicant.job_id}" if applicant.job_id else ""
    interview_link = f"{settings.INTERVIEW_ROOM_URL.rstrip('/')}/interviewcandidateroom?sessionId={applicant.id}{_job_qs}"
    uid = f"interview-{stage.lower().replace(' ', '-')}-{applicant.id}@interviehire.com"
    
    try:
        send_ical_invitation_email(
            candidate_name=applicant.name,
            candidate_email=applicant.email,
            job_title=job_title,
            stage_name=stage,
            start_time=proposed_time,
            duration_minutes=30,
            uid=uid,
            sequence=0,
            organizer_email=organizer_email,
            reschedule_link=reschedule_link,
            interview_link=interview_link,
            organizer_name=organizer_name
        )
    except Exception as mail_err:
        logger.error(f"Failed to send confirmation email: {mail_err}")
        
    time_str = proposed_time.strftime("%B %d, %Y at %I:%M %p UTC")
    
    return f"""
    <html>
        <head>
            <title>Interview Confirmed</title>
            <style>
                body {{
                    font-family: 'Segoe UI', sans-serif;
                    background-color: #0b0f19;
                    color: #f3f4f6;
                    text-align: center;
                    padding: 80px 20px;
                    margin: 0;
                }}
                .container {{
                    max-width: 500px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 40px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                }}
                h1 {{ color: #38bdf8; margin-bottom: 20px; }}
                p {{ font-size: 16px; line-height: 1.6; color: #94a3b8; }}
                .time {{
                    font-size: 18px;
                    font-weight: bold;
                    color: #f3f4f6;
                    background: rgba(56, 189, 248, 0.05);
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border: 1px solid rgba(56, 189, 248, 0.2);
                }}
                .btn {{
                    display: inline-block;
                    background-color: #38bdf8;
                    color: #0f172a;
                    text-decoration: none;
                    padding: 12px 30px;
                    font-weight: bold;
                    border-radius: 8px;
                    margin-top: 20px;
                }}
                .btn:hover {{ background-color: #7dd3fc; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Interview Confirmed!</h1>
                <p>Thank you. Your {stage} has been scheduled for the following time:</p>
                <div class="time">{time_str}</div>
                <p>A calendar invitation has been sent to your email with details and the join link.</p>
                <a href="{interview_link}" class="btn">Go to Interview Room</a>
            </div>
        </body>
    </html>
    """

@router.post("/reschedule/{token}")
def public_reschedule_interview(
    token: str,
    request: Request,
    new_time: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    # Unauthenticated state-changing token endpoint — throttle per-IP.
    _rate_limit(request, limit=30, window=60.0)
    applicant = db.query(Applicant).filter(Applicant.scheduling_token == token).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Invalid or expired scheduling token.")
        
    try:
        parsed_time = datetime.fromisoformat(new_time.replace('Z', '+00:00'))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ISO datetime format.")
        
    job = db.query(Job).filter(Job.id == applicant.job_id).first()
    job_title = job.role_name or job.title if job else "General Position"
    recruiter_id = job.created_by_id if job else None

    # Resolve organizer name and email from Organisation
    from app.models.organisation import Organisation
    organizer_name = "IntervieHire Host"
    organizer_email = settings.SMTP_FROM or "hr@interviehire.com"
    if job and job.organisation_id:
        org = db.query(Organisation).filter(Organisation.id == job.organisation_id).first()
        if org:
            if org.org_name:
                organizer_name = org.org_name
            if org.contact_email:
                organizer_email = org.contact_email

    stage = "Interview"
    if applicant.functional_status is not None:
        stage = "Functional Interview"
        applicant.functional_scheduled_at = parsed_time
        applicant.functional_status = InterviewStatus.scheduled
        try:
            from app.utils.ai_sync import sync_applicant_to_ai
            sync_applicant_to_ai(db, applicant)
        except Exception as sync_err:
            logger.error(f"Failed to sync rescheduled applicant to AI database: {sync_err}")
    elif applicant.screening_status is not None:
        stage = "Recruiter Screening"
        applicant.screening_scheduled_at = parsed_time
        applicant.screening_status = InterviewStatus.scheduled
    
    # Increment sequence counter for updates
    applicant.calendar_sequence = (applicant.calendar_sequence or 0) + 1
    
    if applicant.calendar_event_id:
        try:
            update_calendar_event(
                applicant.calendar_event_id,
                parsed_time,
                recruiter_id=recruiter_id,
                db=db
            )
        except Exception as cal_err:
            logger.error(f"Failed to update Google Calendar event: {cal_err}")
        
    db.commit()
    db.refresh(applicant)
    
    reschedule_link = f"{settings.FRONTEND_URL}/reschedule.html?token={applicant.scheduling_token}"
    _job_qs = f"&jobId={applicant.job_id}" if applicant.job_id else ""
    interview_link = f"{settings.INTERVIEW_ROOM_URL.rstrip('/')}/interviewcandidateroom?sessionId={applicant.id}{_job_qs}"
    uid = f"interview-{stage.lower().replace(' ', '-')}-{applicant.id}@interviehire.com"

    try:
        send_ical_invitation_email(
            candidate_name=applicant.name,
            candidate_email=applicant.email,
            job_title=job_title,
            stage_name=stage,
            start_time=parsed_time,
            duration_minutes=30,
            uid=uid,
            sequence=applicant.calendar_sequence,
            organizer_email=organizer_email,
            reschedule_link=reschedule_link,
            interview_link=interview_link,
            organizer_name=organizer_name
        )
    except Exception as mail_err:
        logger.error(f"Failed to send rescheduled confirmation email: {mail_err}")
    
    return {"status": "success", "new_scheduled_time": parsed_time.isoformat()}


@router.get("/careers/{subdomain}")
def public_careers(subdomain: str, db: Session = Depends(get_db)):
    org = db.query(Organisation).filter(Organisation.career_subdomain == subdomain).first()
    if not org:
        raise HTTPException(status_code=404, detail="Career page not found")
    jobs = (
        db.query(Job)
        .filter(
            Job.organisation_id == org.id,
            Job.is_job_listed == True,
            Job.status == JobStatus.published,
        )
        .all()
    )
    return {
        "organisation": {
            "org_name": org.org_name,
            "logo_url": org.logo_url,
            "career_intro": org.career_intro,
            "career_subdomain": org.career_subdomain,
        },
        "jobs": [
            {
                "id": str(j.id),
                "title": j.title or j.role_name,
                "role_name": j.role_name,
                "location": j.location,
                "job_type": j.job_type,
                "experience_band": j.experience_band,
                "description": j.description,
            }
            for j in jobs
        ],
    }


@router.post("/interview-session/{session_id}/recording")
def upload_interview_recording(
    session_id: str,
    file: UploadFile = File(...),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
    db: Session = Depends(get_db),
):
    # Server-to-server call from the engine only (carries large binary uploads, no
    # candidate-facing auth otherwise) — gate it with the shared webhook secret.
    if settings.WEBHOOK_SECRET and x_webhook_secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid webhook secret.")

    # A real scheduled interview's session id IS the applicant's UUID (see
    # ai_sync.sync_applicant_to_ai); demo/test-room sessions use the engine's
    # default Prisma CUID instead, which has no matching Applicant row.
    applicant = None
    try:
        applicant_uuid = UUID(session_id)
        applicant = db.query(Applicant).filter(Applicant.id == applicant_uuid).first()
    except ValueError:
        pass
    job = db.query(Job).filter(Job.id == applicant.job_id).first() if applicant else None
    job_title = (job.role_name or job.title) if job else "Interview"
    candidate_name = applicant.name if applicant else str(session_id)
    filename = f"{candidate_name} - {job_title} - {session_id}.webm"

    tmp = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        result = upload_recording(
            tmp.name,
            filename,
            mime_type=file.content_type or "video/webm",
            recruiter_id=job.created_by_id if job else None,
            db=db,
        )
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    if not result:
        return {"ok": False, "simulated": True}
    return {"ok": True, "driveFileId": result["id"], "driveUrl": result["webViewLink"]}


# Maps the engine's aviral-eval recommendation onto the fit vocabulary the dashboard
# already renders (`report-page.js` renderScreeningPane, `deep-analysis.js` screeningBlock
# + funnel dots all key off exactly these three strings).
_RECOMMENDATION_TO_FIT_LABEL = {
    "strong_proceed": "Good fit",
    "proceed": "Good fit",
    "hold": "Moderate fit",
    "needs_human_review": "Moderate fit",
    "reject": "Poor fit",
}


@router.post("/interview-session/{session_id}/screening-outcome")
def screening_outcome(
    session_id: UUID,
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
    db: Session = Depends(get_db),
):
    """Called (server-to-server, from the engine) right after a recruiter-screening
    interview is scored. Reads the ALREADY-PERSISTED evaluation off the shared engine
    session (never trusts anything the browser claims), records the real screening
    verdict onto the applicant, and — only on a fit — auto-provisions + emails the
    functional-interview invite via the existing, unmodified invite flow."""
    if settings.WEBHOOK_SECRET and x_webhook_secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid webhook secret.")

    applicant = db.query(Applicant).filter(Applicant.id == session_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")

    # Idempotent replay: this applicant already advanced to functional (either via this
    # same call earlier, or a recruiter manually moved them) — never re-provision, which
    # would reset an in-progress/completed functional session. Hand back the existing link.
    if applicant.functional_status is not None:
        from app.models.interview_invite import InterviewInvite
        from app.routers.invites import build_invite_link

        invite = (
            db.query(InterviewInvite)
            .filter(InterviewInvite.applicant_id == applicant.id, InterviewInvite.stage == "functional")
            .order_by(InterviewInvite.created_at.desc())
            .first()
        )
        return {
            "fits": True,
            "alreadyAdvanced": True,
            "link": build_invite_link(invite.token) if invite else None,
        }

    from app.models.ai_integration import InterviewSession as EngineSession

    engine_session = db.query(EngineSession).filter(EngineSession.id == str(session_id)).first()
    if not engine_session or not engine_session.evaluation:
        raise HTTPException(status_code=409, detail="Screening evaluation is not ready yet.")

    evaluation = engine_session.evaluation or {}
    recommendation = evaluation.get("recommendation")
    overall_score = evaluation.get("overallScore")
    fit_label = _RECOMMENDATION_TO_FIT_LABEL.get(recommendation, "Moderate fit")

    applicant.screening_status = InterviewStatus.completed
    if overall_score is not None:
        try:
            applicant.screening_score = float(overall_score)
        except (TypeError, ValueError):
            pass
    applicant.recruiter_screening = fit_label
    applicant.recruiter_screening_score = applicant.screening_score
    if not applicant.attempted_at:
        applicant.attempted_at = datetime.now(timezone.utc)
    db.commit()

    if fit_label != "Good fit":
        return {"fits": False, "fitLabel": fit_label}

    from app.routers.invites import _provision_invite_for_applicant

    result = _provision_invite_for_applicant(db, applicant, stage="functional", send=True)
    return {"fits": True, "link": result["link"], "sent": result["sent"]}

