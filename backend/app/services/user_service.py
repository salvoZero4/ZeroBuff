from app.schemas.user import UserResponse, UserNewInfo
from app.models.user import User
from sqlmodel import Session, select
from fastapi import HTTPException, status

def update_info(new_info: UserNewInfo, current_user: User, session: Session) -> UserResponse:
    if new_info.username is not None:
        current_user.username = new_info.username
    if new_info.email is not None:
        current_user.email = new_info.email

    try:
        session.add(current_user)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error occurred while updating user information")
    session.refresh(current_user)
    return UserResponse(id=current_user.id, username=current_user.username, email=current_user.email)