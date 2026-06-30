from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.job import Job, JobCollaborator
from app.schemas import ChangePasswordIn, ChangeEmailIn, DeleteAccountIn
from app.utils.auth import get_current_user, get_password_hash, verify_password

router = APIRouter()


@router.put("/password")
def change_password(
    data: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Operate only on the authenticated caller — never a hardcoded account.
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Always require the current password (uses the same bcrypt scheme as login).
    if not user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="No password is set for this account; use account recovery instead.",
        )
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/password")
def change_password_post(
    data: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return change_password(data, current_user, db)


@router.put("/email")
def change_email(
    data: ChangeEmailIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.hashed_password:
        raise HTTPException(status_code=400, detail="No password is set for this account; use account recovery instead.")
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_email = str(data.new_email).strip().lower()
    if new_email == (user.email or "").lower():
        return {"message": "Email unchanged", "email": user.email}
    # Enforce the unique-email constraint with a friendly error instead of a 500.
    # Case-insensitive: stored emails aren't normalised (signup/login keep their case),
    # so compare lower-to-lower to catch e.g. an existing "Test@x.com" vs "test@x.com".
    existing = db.query(User).filter(func.lower(User.email) == new_email, User.id != user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="That email is already in use by another account")

    user.email = new_email
    db.commit()
    return {"message": "Email updated successfully", "email": user.email}


@router.post("/email")
def change_email_post(
    data: ChangeEmailIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return change_email(data, current_user, db)


@router.delete("/account")
def delete_account(
    data: DeleteAccountIn,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.hashed_password:
        raise HTTPException(status_code=400, detail="No password is set for this account; use account recovery instead.")
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # FK-safe teardown: job_collaborators.user_id is NOT NULL (delete those rows),
    # jobs.created_by_id is nullable (null it so the org keeps the job).
    db.query(JobCollaborator).filter(JobCollaborator.user_id == user.id).delete(synchronize_session=False)
    db.query(Job).filter(Job.created_by_id == user.id).update({Job.created_by_id: None}, synchronize_session=False)
    db.delete(user)
    db.commit()

    # Clear the auth cookies so the now-deleted session can't linger.
    response.delete_cookie(key="token", path="/")
    response.delete_cookie(key="active_org_id", path="/")
    return {"message": "Account deleted"}
