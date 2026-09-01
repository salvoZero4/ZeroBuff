from typing import Annotated
from fastapi import APIRouter, Depends
from app.api.dependencies import currentUserDep
from app.schemas.user import UserResponse
from app.models.user import User

router = APIRouter(
    prefix="/v1/users",
    tags=["Users"],
)

@router.get("/me", response_model=UserResponse)
def get_current_user(current_user: currentUserDep):
    return current_user