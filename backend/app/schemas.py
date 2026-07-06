from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["citizen", "collector", "admin"]


class UserOut(BaseModel):
    id: int
    nombre: str
    apellidos: str
    correo: EmailStr
    rol: UserRole
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RegisterIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    apellidos: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    password: str = Field(min_length=6)
    rol: UserRole = "citizen"


class LoginIn(BaseModel):
    correo: EmailStr
    password: str = Field(min_length=6)


class ForgotPasswordIn(BaseModel):
    correo: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class AuthSession(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserOut

