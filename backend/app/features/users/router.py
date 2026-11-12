from fastapi import APIRouter

from app.db.session import sessionDep
from app.features.auth.dependencies import currentUserDep
from app.features.users.schemas import UserNewInfo, UserResponse
from app.features.users.service import get_current_user, update_info

router = APIRouter(
    prefix="/v1/users",
    tags=["Users"],
)


@router.get("/me", response_model=UserResponse)
def return_current_user(current_user: currentUserDep, session: sessionDep):
    return get_current_user(current_user, session)


@router.patch("/me", response_model=UserResponse)
def update_user_info(
    new_info: UserNewInfo, current_user: currentUserDep, session: sessionDep
):
    return update_info(new_info, current_user, session)
