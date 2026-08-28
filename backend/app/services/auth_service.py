from fastapi import HTTPException, status
from sqlmodel import Session, select
from app.models.user import User
from app.schemas import UserRegisterInput, UserRegisterOutput, UserLoginInput, UserLoginOutput
from app.core.security import get_password_hash, create_access_token, create_refresh_token, verify_password 


def register_user(user: UserRegisterInput, session: Session) -> UserRegisterOutput:
    #verifica se l'username o l'email esistono già nel database
    query= select(User).where(User.username == user.username or User.email == user.email)
    existing_user = session.exec(query).first()
    if existing_user:
        if existing_user.username == user.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        if  existing_user.email == user.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    #crittografia la password e crea un nuovo utente nel database    
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    #creazione dei token di accesso e refresh per il nuovo utente
    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)

    return UserRegisterOutput(id=new_user.id,username=new_user.username, email=new_user.email, access_token=access_token, refresh_token=refresh_token, token_type="bearer")

#TODO: Implementare login dell'utente, generare un token JWT e restituire l'access token e il tipo di token
def login_user(user: UserLoginInput, session: Session) -> UserLoginOutput:
    #verifica se l'utente esiste nel database e se la password corrisponde all'hash salvato
    query = select(User).where(User.email == user.email)
    existing_user = session.exec(query).first()
    if not existing_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    #creazione dei token di accesso e refresh per l'utente esistente
    access_token = create_access_token(subject=existing_user.id)
    refresh_token = create_refresh_token(subject=existing_user.id)

    return UserLoginOutput(id=existing_user.id, username=existing_user.username, email=existing_user.email, access_token=access_token, refresh_token=refresh_token, token_type="bearer")