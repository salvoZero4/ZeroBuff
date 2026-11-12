from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.user import User, UserProfile
from app.features.users.schemas import UserNewInfo, UserResponse
from app.core.db_errors import commit_with_http_error_handling


def get_current_user(current_user: User, session: Session) -> UserResponse:
    user_data = session.exec(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).first()
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        sex=user_data.sex if user_data and user_data.sex is not None else None,
        date_of_birth=user_data.date_of_birth
        if user_data and user_data.date_of_birth is not None
        else None,
        height_cm=user_data.height_cm
        if user_data and user_data.height_cm is not None
        else None,
    )


def update_info(
    new_info: UserNewInfo, current_user: User, session: Session
) -> UserResponse:

    current_user_data = session.exec(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).first()
    if current_user_data is None:
        current_user_data = UserProfile(user_id=current_user.id)
        session.add(current_user_data)

    # Unwrap the new_info model to a dictionary, excluding None fields
    updated_data = {
        k: v
        for k, v in new_info.model_dump(exclude_unset=True).items()
        if v is not None
    }

    user_fields = {"username", "email"}

    # loop through a list of tuples containing the field name and value, and set the attribute on the appropriate model
    for field, value in updated_data.items():
        if field in user_fields:
            setattr(current_user, field, value)
        else:
            setattr(current_user_data, field, value)

    session.add(current_user)
    session.add(current_user_data)
    commit_with_http_error_handling(
        session, "Username or email already exists."
    )
    session.refresh(current_user)
    session.refresh(current_user_data)
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        sex=current_user_data.sex,
        date_of_birth=current_user_data.date_of_birth,
        height_cm=current_user_data.height_cm,
    )
