from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base_datos import Base


def ahora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(120), nullable=False)
    correo: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(40), nullable=False, default="citizen")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, onupdate=ahora_utc)


class Contenedor(Base):
    __tablename__ = "contenedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo_qr: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    precision_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    veces_registrado: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    creado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    actualizado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class RegistroUbicacionContenedor(Base):
    __tablename__ = "registros_ubicacion_contenedor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contenedor_id: Mapped[int] = mapped_column(
        ForeignKey("contenedores.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    precision_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    registrado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)


class Reporte(Base):
    __tablename__ = "reportes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contenedor_id: Mapped[int] = mapped_column(
        ForeignKey("contenedores.id"),
        nullable=False,
        index=True,
    )
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )
    motivo: Mapped[str] = mapped_column(String(40), nullable=False)
    comentario: Mapped[str | None] = mapped_column(String(500), nullable=True)
    evidencia_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class RutaRecoleccion(Base):
    __tablename__ = "rutas_recoleccion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    zona: Mapped[str] = mapped_column(String(120), nullable=False)
    dia_semana: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    hora_aproximada: Mapped[str] = mapped_column(String(5), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500), nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    creado_por_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class RutaContenedor(Base):
    __tablename__ = "rutas_contenedores"

    ruta_id: Mapped[int] = mapped_column(
        ForeignKey("rutas_recoleccion.id", ondelete="CASCADE"),
        primary_key=True,
    )
    contenedor_id: Mapped[int] = mapped_column(
        ForeignKey("contenedores.id"),
        primary_key=True,
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ControlUsuario(Base):
    __tablename__ = "control_usuarios"

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requiere_cambio_contrasena: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    actualizado_por_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=True,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class AsignacionRuta(Base):
    __tablename__ = "asignaciones_ruta"

    ruta_id: Mapped[int] = mapped_column(
        ForeignKey("rutas_recoleccion.id", ondelete="CASCADE"),
        primary_key=True,
    )
    recolector_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )
    asignado_por_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class EjecucionRuta(Base):
    __tablename__ = "ejecuciones_ruta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ruta_id: Mapped[int] = mapped_column(
        ForeignKey("rutas_recoleccion.id"),
        nullable=False,
        index=True,
    )
    recolector_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )
    fecha_servicio: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="en_recorrido",
        index=True,
    )
    motivo_cancelacion: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitud_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitud_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision_m_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    ubicacion_actualizada_en: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    iniciado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    finalizado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class ParadaEjecucionRuta(Base):
    __tablename__ = "paradas_ejecucion_ruta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ejecucion_id: Mapped[int] = mapped_column(
        ForeignKey("ejecuciones_ruta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contenedor_id: Mapped[int] = mapped_column(
        ForeignKey("contenedores.id"),
        nullable=False,
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pendiente",
        index=True,
    )
    observacion: Mapped[str | None] = mapped_column(String(500), nullable=True)
    atendido_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class UbicacionEjecucionRuta(Base):
    __tablename__ = "ubicaciones_ejecucion_ruta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ejecucion_id: Mapped[int] = mapped_column(
        ForeignKey("ejecuciones_ruta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recolector_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
    )
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    precision_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    registrado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)


class IncidenciaOperativa(Base):
    __tablename__ = "incidencias_operativas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ejecucion_id: Mapped[int] = mapped_column(
        ForeignKey("ejecuciones_ruta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parada_id: Mapped[int | None] = mapped_column(
        ForeignKey("paradas_ejecucion_ruta.id"),
        nullable=True,
    )
    recolector_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    comentario: Mapped[str] = mapped_column(String(500), nullable=False)
    evidencia_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    latitud: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitud: Mapped[float | None] = mapped_column(Float, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)


class DetalleContenedor(Base):
    """Dirección legible separada para conservar bases de datos existentes."""

    __tablename__ = "detalles_contenedor"

    contenedor_id: Mapped[int] = mapped_column(
        ForeignKey("contenedores.id", ondelete="CASCADE"),
        primary_key=True,
    )
    direccion_completa: Mapped[str | None] = mapped_column(String(300), nullable=True)
    calle: Mapped[str | None] = mapped_column(String(160), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(30), nullable=True)
    colonia: Mapped[str | None] = mapped_column(String(140), nullable=True)
    codigo_postal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    municipio: Mapped[str | None] = mapped_column(String(140), nullable=True)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    placa: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class ConfiguracionRutaVial(Base):
    __tablename__ = "configuraciones_ruta_vial"

    ruta_id: Mapped[int] = mapped_column(
        ForeignKey("rutas_recoleccion.id", ondelete="CASCADE"),
        primary_key=True,
    )
    vehiculo_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehiculos.id"),
        nullable=True,
        index=True,
    )
    geometria_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    distancia_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    duracion_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    proveedor: Mapped[str] = mapped_column(String(40), default="sin_calcular", nullable=False)
    estado_calculo: Mapped[str] = mapped_column(
        String(30),
        default="pendiente",
        nullable=False,
    )
    detalle_calculo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    calculado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime,
        default=ahora_utc,
        onupdate=ahora_utc,
        nullable=False,
    )


class PuntoRuta(Base):
    __tablename__ = "puntos_ruta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ruta_id: Mapped[int] = mapped_column(
        ForeignKey("rutas_recoleccion.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    contenedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("contenedores.id"),
        nullable=True,
    )
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    direccion: Mapped[str | None] = mapped_column(String(300), nullable=True)
    eta_minutos: Mapped[int | None] = mapped_column(Integer, nullable=True)


class RutaEjecucionVial(Base):
    __tablename__ = "rutas_ejecucion_vial"

    ejecucion_id: Mapped[int] = mapped_column(
        ForeignKey("ejecuciones_ruta.id", ondelete="CASCADE"),
        primary_key=True,
    )
    geometria_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    distancia_restante_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    duracion_restante_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    recalculado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
