from typing import Annotated
from fastapi import APIRouter, Request, Depends
from app.schemas import UserRegisterInput, AuthOutput, UserLoginInput, TokenRefreshInput, TokenRefreshOutput, ChangePassword
from app.services.auth_service import register_user, login_user, refresh_token, change_password
from app.api.dependencies import sessionDep, currentUserDep
from app.models.user import User
from app.core.limiter import limiter

router = APIRouter(
    prefix="/v1/auth",
    tags=["Authentication"],   
)



@router.post("/register", response_model=AuthOutput)
@limiter.limit("5/minute")  
def register(request: Request,user: UserRegisterInput, session: sessionDep):
    return register_user(user, session=session)

@router.post("/login", response_model=AuthOutput)
@limiter.limit("3/minute") 
def login(request: Request,user: UserLoginInput, session: sessionDep):
    return login_user(user, session=session)


@router.post("/refresh", response_model=TokenRefreshOutput)
@limiter.limit("1/minute")
def refresh_access_token(request: Request, token: TokenRefreshInput):
    return refresh_token(token)

@router.post("/change-password", response_model=dict)
@limiter.limit("2/minute")
def change_password_endpoint(request: Request, new_password: ChangePassword, session: sessionDep, current_user: Annotated[User, Depends(currentUserDep)]):
    change_password(current_user, new_password, session=session)
    return {"message": "Password changed successfully"}

#TODO: Implement password reset functionality with email verification and token expiration.
