from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
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
