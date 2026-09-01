from typing import Annotated
from pydantic import BaseModel, EmailStr
from uuid import UUID

def validate_password(value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must contain at least one lowercase letter")
        return value

PasswordValided = Annotated[str, validate_password]

class UserBase(BaseModel):
    username: str
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    

class UserRegisterInput(UserBase):
    password: PasswordValided
   
#Output for login and register
class AuthOutput(UserBase, TokenResponse):
    id: UUID

class UserLoginInput(BaseModel):
    email: EmailStr
    password: str



class TokenRefreshInput(BaseModel):
    refresh_token: str

class TokenRefreshOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ChangePassword(BaseModel):
    new_password: PasswordValided

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: PasswordValided