from pydantic import BaseModel, EmailStr

class UserRegisterInput(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserRegisterOutput(BaseModel):
    id: int
    username: str
    email: EmailStr

class UserLoginInput(BaseModel):
    email: EmailStr
    password: str

class UserLoginOutput(BaseModel):
    access_token: str
    token_type: str