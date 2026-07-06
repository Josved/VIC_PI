from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

RolUsuario = Literal["citizen", "collector", "admin"]


class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    apellidos: str
    correo: EmailStr
    rol: RolUsuario
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class RegistroEntrada(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    apellidos: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    contrasena: str = Field(min_length=6)
    rol: RolUsuario = "citizen"


class InicioSesionEntrada(BaseModel):
    correo: EmailStr
    contrasena: str = Field(min_length=6)


class RecuperarContrasenaEntrada(BaseModel):
    correo: EmailStr


class RestablecerContrasenaEntrada(BaseModel):
    token: str
    contrasena: str = Field(min_length=6)


class SesionRespuesta(BaseModel):
    token_acceso: str
    tipo_token: str = "bearer"
    usuario: UsuarioRespuesta
