from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from fastapi import HTTPException, status
from pwdlib import PasswordHash
from app.core.config import settings


password_hash = PasswordHash.recommended()


def get_password_hash(password: str) -> str:
    """Trasforma la password in chiaro in un hash crittografico non reversibile."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se la password inserita al login corrisponde all'hash salvato nel DB."""
    return password_hash.verify(plain_password, hashed_password)


def _create_token(subject: str | Any,type: str, expires_delta: timedelta | None = None) -> str:
    """Genera una stringa JWT firmata contenente l'ID utente e la data di scadenza."""
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(subject),
        "type": type,
        "exp": expire         
    }
    
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def create_access_token(subject: str | Any) -> str:
    """Genera un token di accesso JWT con scadenza breve (default 7 giorni)."""
    return _create_token(subject,type="access", expires_delta= timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

def create_refresh_token(subject: str | Any) -> str:
    """Genera un token di refresh JWT con scadenza più lunga (default 30 giorni)."""
    return _create_token(subject,type="refresh", expires_delta= timedelta(days=30))

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")