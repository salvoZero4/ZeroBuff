from typing import Annotated
from uuid import UUID
from sqlmodel import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.db import get_session
from app.models.user import User
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")
#Common dependency to get a database session for API endpoints
sessionDep = Annotated[Session, Depends(get_session)]
tokenDep = Annotated[str, Depends(oauth2_scheme)]

#Middleware per ottenere l'utente corrente e verificare il token di accesso
def get_current_user(sessionDep, token: tokenDep) -> User:

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token", headers={"WWW-Authenticate": "Bearer"})
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token", headers={"WWW-Authenticate": "Bearer"})
    try:
        user_id = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token", headers={"WWW-Authenticate": "Bearer"})
    user = sessionDep.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found", headers={"WWW-Authenticate": "Bearer"})
    return user

currentUserDep = Annotated[User, Depends(get_current_user)]