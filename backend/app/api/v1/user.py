from fastapi import APIRouter, Depends
from app.api.dependencies import currentUserDep, sessionDep
from app.schemas.user import UserResponse, UserNewInfo
from app.services.user_service import update_info

router = APIRouter(
    prefix="/v1/users",
    tags=["Users"],
)

@router.get("/me", response_model=UserResponse)
def get_current_user(current_user: currentUserDep):
    return current_user

#TODO: Implement endpoint for updating user information
@router.patch("/me", response_model=UserResponse)
def update_user_info(new_info: UserNewInfo,current_user: currentUserDep, session: sessionDep) :
    return update_info(new_info, current_user, session)