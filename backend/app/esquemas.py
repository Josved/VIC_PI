from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

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


class RegistroContenedorQREntrada(BaseModel):
    codigo_qr: str = Field(min_length=1, max_length=200)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    precision_m: float | None = Field(default=None, ge=0, le=10000)

    @field_validator("codigo_qr")
    @classmethod
    def normalizar_codigo_qr(cls, valor: str) -> str:
        codigo = valor.strip()
        if not codigo:
            raise ValueError("El codigo QR no puede estar vacio")
        return codigo


class ContenedorRespuesta(BaseModel):
    id: int
    codigo_qr: str
    latitud: float
    longitud: float
    precision_m: float | None
    distancia_m: float | None = None
    veces_registrado: int
    creado_por_id: int
    actualizado_por_id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class RegistroContenedorQRRespuesta(BaseModel):
    accion: Literal["creado", "actualizado"]
    contenedor: ContenedorRespuesta
