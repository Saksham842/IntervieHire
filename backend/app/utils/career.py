"""Career-page subdomain provisioning.

The public career page is addressed by `organisations.career_subdomain`
(GET /api/public/careers/<slug>). The slug is system-managed — recruiters never
type it — so we derive a stable, URL-safe slug from the org name on creation and
guarantee it is unique across all organisations.
"""
import re
import uuid

from sqlalchemy.orm import Session

from app.models.organisation import Organisation


def slugify(name: str) -> str:
    """Lowercase, hyphenate, strip to [a-z0-9-]. Empty input → '' (caller falls back)."""
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return slug


def unique_career_subdomain(db: Session, org_name: str, org_id=None) -> str:
    """Return a career subdomain slug unique among all organisations.

    Slugs the org name (falling back to a short id fragment when the name yields
    nothing usable), then appends -2, -3, … until no other org owns it. `org_id`
    is excluded from the collision check so re-provisioning an existing org keeps
    its own slug.
    """
    base = slugify(org_name) or f"org-{str(org_id or uuid.uuid4())[:8]}"

    candidate = base
    n = 1
    while True:
        q = db.query(Organisation).filter(Organisation.career_subdomain == candidate)
        if org_id is not None:
            q = q.filter(Organisation.id != org_id)
        if q.first() is None:
            return candidate
        n += 1
        candidate = f"{base}-{n}"
