from app.schemas.user import UserResponse, UserNewInfo
from app.models.user import User, UserProfile
from sqlmodel import Session, select
from fastapi import HTTPException, status

def update_info(new_info: UserNewInfo, current_user: User, session: Session) -> UserResponse:
    if new_info.username is not None:
        current_user.username = new_info.username
    if new_info.email is not None:
        current_user.email = new_info.email
    current_user_data = session.exec(select(UserProfile).where(UserProfile.user_id == current_user.id)).first()
    if current_user_data is None:
        current_user_data = UserProfile(user_id=current_user.id)
        session.add(current_user_data)
    if new_info.sex is not None:
        current_user_data.sex = new_info.sex
    if new_info.date_of_birth is not None:
        current_user_data.date_of_birth = new_info.date_of_birth
    if new_info.height_cm is not None:
        current_user_data.height_cm = new_info.height_cm
    try:
        session.add(current_user)
        session.add(current_user_data)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error occurred while updating user information")
    session.refresh(current_user)
    session.refresh(current_user_data)
    return UserResponse(id=current_user.id, username=current_user.username, email=current_user.email,sex=current_user_data.sex, date_of_birth=current_user_data.date_of_birth, height_cm=current_user_data.height_cm)