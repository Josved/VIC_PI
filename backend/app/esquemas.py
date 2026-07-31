from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

RolUsuario = Literal["citizen", "collector", "admin"]
MotivoReporte = Literal["lleno", "danado", "sucio", "ubicacion_incorrecta", "otro"]
EstadoReporte = Literal["pendiente", "en_revision", "resuelto"]
EstadoEjecucion = Literal["en_recorrido", "completada", "cancelada"]
EstadoParada = Literal["pendiente", "recolectado", "omitido", "incidencia"]
TipoIncidencia = Literal[
    "contenedor_bloqueado",
    "contenedor_danado",
    "calle_cerrada",
    "exceso_basura",
    "sin_acceso",
    "vehiculo",
    "otro",
]
DiaSemana = Literal[
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
]

PATRON_NOMBRE = r"^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+(?:[ '\-][A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)*$"


class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    apellidos: str
    correo: EmailStr
    rol: RolUsuario
    activo: bool = True
    requiere_cambio_contrasena: bool = False
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class RegistroEntrada(BaseModel):
    nombre: str = Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)
    apellidos: str = Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)
    correo: EmailStr
    contrasena: str = Field(min_length=6, max_length=72)

    model_config = {"extra": "forbid"}


class InicioSesionEntrada(BaseModel):
    correo: EmailStr
    contrasena: str = Field(min_length=6, max_length=72)


class RecuperarContrasenaEntrada(BaseModel):
    correo: EmailStr


class RestablecerContrasenaEntrada(BaseModel):
    token: str
    contrasena: str = Field(min_length=6, max_length=72)


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


class ReporteCrear(BaseModel):
    contenedor_id: int = Field(gt=0)
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


class CambiarContrasenaEntrada(BaseModel):
    contrasena_actual: str = Field(min_length=6, max_length=72)
    contrasena_nueva: str = Field(min_length=8, max_length=72)


class UsuarioAdministradoCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)
    apellidos: str = Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)
    correo: EmailStr
    contrasena_temporal: str = Field(min_length=8, max_length=72)
    rol: RolUsuario = "collector"

    model_config = {"extra": "forbid"}


class UsuarioAdministradoActualizar(BaseModel):
    rol: RolUsuario | None = None
    activo: bool | None = None


class RestablecerContrasenaAdminEntrada(BaseModel):
    contrasena_temporal: str = Field(min_length=8, max_length=72)


class UsuarioAdministradoRespuesta(BaseModel):
    id: int
    nombre: str
    apellidos: str
    correo: EmailStr
    rol: RolUsuario
    activo: bool
    requiere_cambio_contrasena: bool
    creado_en: datetime
    actualizado_en: datetime


class UsuarioRutaRespuesta(BaseModel):
    id: int
    nombre: str
    apellidos: str
    correo: EmailStr


class RutaCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    zona: str = Field(min_length=2, max_length=120)
    dia_semana: DiaSemana
    hora_aproximada: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    descripcion: str | None = Field(default=None, max_length=500)
    contenedor_ids: list[int] = Field(min_length=1, max_length=200)
    recolector_id: int | None = Field(default=None, gt=0)

    @field_validator("nombre", "zona")
    @classmethod
    def limpiar_texto_obligatorio(cls, valor: str) -> str:
        texto = valor.strip()
        if len(texto) < 2:
            raise ValueError("El texto debe contener al menos dos caracteres")
        return texto

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        return valor.strip() or None

    @field_validator("contenedor_ids")
    @classmethod
    def validar_contenedores(cls, valores: list[int]) -> list[int]:
        if any(valor <= 0 for valor in valores):
            raise ValueError("Los contenedores seleccionados no son validos")
        if len(valores) != len(set(valores)):
            raise ValueError("No se puede repetir un contenedor en la ruta")
        return valores


class RutaActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    zona: str | None = Field(default=None, min_length=2, max_length=120)
    dia_semana: DiaSemana | None = None
    hora_aproximada: str | None = Field(
        default=None,
        pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$",
    )
    descripcion: str | None = Field(default=None, max_length=500)
    contenedor_ids: list[int] | None = Field(default=None, min_length=1, max_length=200)
    recolector_id: int | None = Field(default=None, gt=0)
    activa: bool | None = None

    @field_validator("nombre", "zona")
    @classmethod
    def limpiar_texto_opcional(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        texto = valor.strip()
        if len(texto) < 2:
            raise ValueError("El texto debe contener al menos dos caracteres")
        return texto

    @field_validator("contenedor_ids")
    @classmethod
    def validar_contenedores_opcionales(cls, valores: list[int] | None) -> list[int] | None:
        if valores is None:
            return None
        if any(valor <= 0 for valor in valores):
            raise ValueError("Los contenedores seleccionados no son validos")
        if len(valores) != len(set(valores)):
            raise ValueError("No se puede repetir un contenedor en la ruta")
        return valores


class ContenedorRutaRespuesta(BaseModel):
    id: int
    codigo_qr: str
    orden: int
    latitud: float
    longitud: float


class OperacionRutaResumenRespuesta(BaseModel):
    ejecucion_id: int
    estado: EstadoEjecucion
    progreso_porcentaje: int
    paradas_atendidas: int
    paradas_totales: int
    latitud_actual: float | None
    longitud_actual: float | None
    precision_m_actual: float | None
    ubicacion_actualizada_en: datetime | None
    iniciado_en: datetime
    finalizado_en: datetime | None


class RutaRespuesta(BaseModel):
    id: int
    nombre: str
    zona: str
    dia_semana: DiaSemana
    hora_aproximada: str
    descripcion: str | None
    activa: bool
    creado_por_id: int
    recolector: UsuarioRutaRespuesta | None
    operacion: OperacionRutaResumenRespuesta | None
    contenedores: list[ContenedorRutaRespuesta]
    creado_en: datetime
    actualizado_en: datetime


class UbicacionOperacionEntrada(BaseModel):
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    precision_m: float | None = Field(default=None, ge=0, le=10000)


class ParadaOperacionActualizar(BaseModel):
    estado: Literal["recolectado", "omitido", "incidencia"]
    observacion: str | None = Field(default=None, max_length=500)


class IncidenciaOperacionCrear(BaseModel):
    parada_id: int | None = Field(default=None, gt=0)
    tipo: TipoIncidencia
    comentario: str = Field(min_length=3, max_length=500)
    evidencia_url: str | None = Field(default=None, max_length=300)
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)


class CancelarEjecucionEntrada(BaseModel):
    motivo: str = Field(min_length=3, max_length=500)


class ParadaEjecucionRespuesta(BaseModel):
    id: int
    contenedor_id: int
    codigo_qr: str
    orden: int
    estado: EstadoParada
    observacion: str | None
    latitud: float
    longitud: float
    atendido_en: datetime | None


class IncidenciaOperacionRespuesta(BaseModel):
    id: int
    ejecucion_id: int
    parada_id: int | None
    recolector_id: int
    tipo: TipoIncidencia
    comentario: str
    evidencia_url: str | None
    latitud: float | None
    longitud: float | None
    creado_en: datetime


class EjecucionRutaRespuesta(BaseModel):
    id: int
    ruta_id: int
    ruta_nombre: str
    zona: str
    recolector: UsuarioRutaRespuesta
    fecha_servicio: str
    estado: EstadoEjecucion
    motivo_cancelacion: str | None
    progreso_porcentaje: int
    latitud_actual: float | None
    longitud_actual: float | None
    precision_m_actual: float | None
    ubicacion_actualizada_en: datetime | None
    iniciado_en: datetime
    finalizado_en: datetime | None
    paradas: list[ParadaEjecucionRespuesta]
    incidencias: list[IncidenciaOperacionRespuesta]
