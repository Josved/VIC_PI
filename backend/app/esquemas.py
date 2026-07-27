from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

RolUsuario = Literal["citizen", "collector", "admin"]

# Letras (con acentos y ñ), espacios, guion y apostrofe. Sin numeros ni simbolos como %&!/").
PATRON_NOMBRE = r"^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+(?:[ '\-][A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)*$"


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
    # El rol no se recibe del cliente: todo registro publico crea un "citizen".
    # Los roles "collector"/"admin" los asigna un administrador desde su panel.
    nombre: str = Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)
    apellidos: str = Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)
    correo: EmailStr
    contrasena: str = Field(min_length=6, max_length=72)


class InicioSesionEntrada(BaseModel):
    correo: EmailStr
    contrasena: str = Field(min_length=6, max_length=72)


class RecuperarContrasenaEntrada(BaseModel):
    correo: EmailStr


class RestablecerContrasenaEntrada(BaseModel):
    token: str
    contrasena: str = Field(min_length=6)


class SesionRespuesta(BaseModel):
    token_acceso: str
    tipo_token: str = "bearer"
    usuario: UsuarioRespuesta


TipoContenedor = Literal["reciclaje", "organico", "inorganico"]
EstadoContenedor = Literal["disponible", "casi_lleno", "mantenimiento"]
MotivoReporte = Literal["lleno", "danado", "sucio", "ubicacion_incorrecta", "otro"]
EstadoReporte = Literal["pendiente", "en_revision", "resuelto"]


class ContenedorRespuesta(BaseModel):
    id: int
    nombre: str
    zona: str
    tipo: TipoContenedor
    serie: str
    latitud: float
    longitud: float
    porcentaje_llenado: int
    estado: EstadoContenedor
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class ContenedorCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    zona: str = Field(min_length=2, max_length=120)
    tipo: TipoContenedor
    serie: str = Field(min_length=3, max_length=40)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)


class ContenedorActualizar(BaseModel):
    porcentaje_llenado: int | None = Field(default=None, ge=0, le=100)
    en_mantenimiento: bool | None = None
    activo: bool | None = None


class ReporteCrear(BaseModel):
    contenedor_id: int
    motivo: MotivoReporte
    comentario: str | None = Field(default=None, max_length=500)
    evidencia_url: str | None = Field(default=None, max_length=300)


class ReporteRespuesta(BaseModel):
    id: int
    contenedor_id: int
    usuario_id: int
    motivo: MotivoReporte
    comentario: str | None
    evidencia_url: str | None
    estado: EstadoReporte
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class ReporteActualizarEstado(BaseModel):
    estado: EstadoReporte
