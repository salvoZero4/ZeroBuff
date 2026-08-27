from fastapi import APIRouter, Depends
from app.db import get_session
from schemas import UserRegisterInput, UserRegisterOutput

router = APIRouter(
    prefix="v1/auth",
    tags=["Authentication"],
    dependencies=[Depends(get_session)],
)

@router.post("/register", response_model=UserRegisterOutput)
def register_user(user: UserRegisterInput) :
    # Logic to register a new user
    return {"message": "User registered successfully"}