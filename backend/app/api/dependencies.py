from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.security import decode_token
from app.db import get_session
from app.models.user import User

scheme = HTTPBearer()
# Common dependency to get a database session for API endpoints
sessionDep = Annotated[Session, Depends(get_session)]
tokenDep = Annotated[HTTPAuthorizationCredentials, Depends(scheme)]


# Middleware per ottenere l'utente corrente e verificare il token di accesso
def get_current_user(session: sessionDep, token: tokenDep) -> User:

    tokenStr = token.credentials
    payload = decode_token(tokenStr)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_id = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


currentUserDep = Annotated[User, Depends(get_current_user)]
