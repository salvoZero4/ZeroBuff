from fastapi import APIRouter, Request, status

from app.api.dependencies import currentUserDep, sessionDep
from app.core.limiter import limiter
from app.schemas import (
    AuthOutput,
    ChangePassword,
    TokenRefreshInput,
    TokenRefreshOutput,
    UserLoginInput,
    UserRegisterInput,
)
from app.services.auth_service import (
    change_password,
    login_user,
    refresh_token,
    register_user,
)

router = APIRouter(
    prefix="/v1/auth",
    tags=["Authentication"],
)


@router.post(
    "/register", response_model=AuthOutput, status_code=status.HTTP_201_CREATED
)
@limiter.limit("5/minute")
def register(request: Request, user: UserRegisterInput, session: sessionDep):
    """Creation of a new user account. Returns an access token and a refresh token."""
    return register_user(user, session=session)


@router.post("/login", response_model=AuthOutput)
@limiter.limit("3/minute")
def login(request: Request, user: UserLoginInput, session: sessionDep):
    """Login a user and return an access token and a refresh token."""
    return login_user(user, session=session)


@router.post("/refresh", response_model=TokenRefreshOutput)
@limiter.limit("1/minute")
def refresh_access_token(
    request: Request, token: TokenRefreshInput, session: sessionDep
):
    """Refresh the access token using a valid refresh token. Returns a new access token."""
    return refresh_token(token, session=session)


@router.post("/change-password", response_model=dict)
@limiter.limit("2/minute")
def change_password_endpoint(
    request: Request,
    change_password_payload: ChangePassword,
    session: sessionDep,
    current_user: currentUserDep,
):
    """Change the password of the currently authenticated user."""
    change_password(current_user, change_password_payload.new_password, session=session)
    return {"message": "Password changed successfully"}


# TODO: Implement password reset functionality with email verification and token expiration.
