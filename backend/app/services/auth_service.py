from fastapi import HTTPException, status
from sqlmodel import Session, or_, select

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas import (
    AuthOutput,
    TokenRefreshInput,
    TokenRefreshOutput,
    UserLoginInput,
    UserRegisterInput,
)


def register_user(user: UserRegisterInput, session: Session) -> AuthOutput:
    # verifica se l'username o l'email esistono già nel database
    query = select(User).where(
        or_(User.username == user.username, User.email == user.email)
    )
    existing_user = session.exec(query).first()
    if existing_user:
        if existing_user.username == user.username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Username already exists"
            )
        if existing_user.email == user.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already exists"
            )

    # crittografia la password e crea un nuovo utente nel database
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username, email=user.email, hashed_password=hashed_password
    )

    # fallback di sicurezza in caso di errore durante l'inserimento
    try:
        session.add(new_user)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred while registering user",
        )
    session.refresh(new_user)

    # creazione dei token di accesso e refresh per il nuovo utente
    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)

    return AuthOutput(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


def login_user(user: UserLoginInput, session: Session) -> AuthOutput:
    # verifica se l'utente esiste nel database e se la password corrisponde all'hash salvato
    query = select(User).where(User.email == user.email)
    existing_user = session.exec(query).first()
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    if not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # creazione dei token di accesso e refresh per l'utente esistente
    access_token = create_access_token(subject=existing_user.id)
    refresh_token = create_refresh_token(subject=existing_user.id)

    return AuthOutput(
        id=existing_user.id,
        username=existing_user.username,
        email=existing_user.email,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


def refresh_token(token: TokenRefreshInput) -> TokenRefreshOutput:

    payload = decode_token(token.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    access_token = create_access_token(subject=user_id)
    return TokenRefreshOutput(access_token=access_token, token_type="bearer")


def change_password(current_user: User, new_password: str, session: Session):

    if verify_password(new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="New password cannot be the same as the old password",
        )

    hashed_password = get_password_hash(new_password)
    current_user.hashed_password = hashed_password
    try:
        session.add(current_user)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred while changing password",
        )


# TODO: Implement password reset functionality with email verification and token expiration.
