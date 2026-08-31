from fastapi import APIRouter, Request
from app.schemas import UserRegisterInput, UserRegisterOutput, UserLoginInput, UserLoginOutput, TokenRefreshInput, TokenRefreshOutput
from app.services.auth_service import register_user, login_user, refresh_token
from app.api.dependencies import sessionDep
from app.core.limiter import limiter

router = APIRouter(
    prefix="/v1/auth",
    tags=["Authentication"],   
)


@router.post("/register", response_model=UserRegisterOutput)
@limiter.limit("5/minute")  
def register(request: Request,user: UserRegisterInput, session: sessionDep):
    return register_user(user, session=session)

@router.post("/login", response_model=UserLoginOutput)
@limiter.limit("3/minute") 
def login(request: Request,user: UserLoginInput, session: sessionDep):
    return login_user(user, session=session)


@router.post("/refresh", response_model=TokenRefreshOutput)
@limiter.limit("1/minute")
def refresh_access_token(request: Request, token: TokenRefreshInput):
    return refresh_token(token)