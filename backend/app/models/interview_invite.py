from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class InviteStatus(str, enum.Enum):
    pending = "pending"
    started = "started"
    completed = "completed"
    expired = "expired"


class InterviewInvite(Base):
    """A unique, unguessable per-candidate interview link (`/i/{token}`).

    `token` is the PUBLIC id placed in the URL; it is intentionally separate
    from the internal `id` so a link can be revoked/rotated without changing the
    row's identity. The invite is bound to an `applicant` (and its `job`) so the
    completed interview's score still flows back onto that candidate's pipeline
    card; `applicant_id` is nullable so standalone invites can be added later.

    Lifecycle (single-use, isolated in `routers/invites.py`): pending -> started
    on first open (re-enterable while started so a candidate can reconnect after
    a drop) -> completed when the Lina session finishes; -> expired past
    `expires_at`.
    """

    __tablename__ = "interview_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Public, unguessable URL id — uuid4().hex (32 hex chars). Unique + indexed.
    token = Column(String, unique=True, index=True, nullable=False)

    applicant_id = Column(UUID(as_uuid=True), ForeignKey("applicants.id"), nullable=True, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True, index=True)

    candidate_email = Column(String, index=True, nullable=False)
    candidate_name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    # Which pipeline stage this invite runs: 'screening' | 'functional'.
    stage = Column(String, nullable=True)

    status = Column(Enum(InviteStatus), nullable=False, default=InviteStatus.pending)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
