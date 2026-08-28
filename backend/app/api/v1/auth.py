from fastapi import APIRouter
from app.schemas import UserRegisterInput, UserRegisterOutput, UserLoginInput, UserLoginOutput
from app.services.auth_service import register_user, login_user
from app.api.dependencies import sessionDep


router = APIRouter(
    prefix="/v1/auth",
    tags=["Authentication"],   
)


@router.post("/register", response_model=UserRegisterOutput)
def register(user: UserRegisterInput, session: sessionDep):
    return register_user(user, session=session)

@router.post("/login", response_model=UserLoginOutput)
def login(user: UserLoginInput, session: sessionDep):
    return login_user(user, session=session)

