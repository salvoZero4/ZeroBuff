from pydantic import BaseModel, EmailStr
from uuid import UUID
class UserBase(BaseModel):
    username: str
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer",
    

class UserRegisterInput(UserBase):
    password: str

class UserRegisterOutput(UserBase, TokenResponse):
    id: UUID

class UserLoginInput(BaseModel):
    email: EmailStr
    password: str

class UserLoginOutput(UserBase, TokenResponse):
    id: UUID

