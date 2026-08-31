from pydantic import BaseModel, EmailStr, field_validator
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

    @field_validator("password")
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must contain at least one lowercase letter")
        return value



class UserRegisterOutput(UserBase, TokenResponse):
    id: UUID

class UserLoginInput(BaseModel):
    email: EmailStr
    password: str

class UserLoginOutput(UserBase, TokenResponse):
    id: UUID

class TokenRefreshInput(BaseModel):
    refresh_token: str

class TokenRefreshOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"

