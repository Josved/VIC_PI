from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_datos import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(50), nullable=False)
    correo: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(40), nullable=False, default="citizen")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reportes: Mapped[list["Reporte"]] = relationship(back_populates="usuario")


class Contenedor(Base):
    __tablename__ = "contenedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    zona: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    serie: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    porcentaje_llenado: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    en_mantenimiento: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reportes: Mapped[list["Reporte"]] = relationship(back_populates="contenedor")

    @property
    def estado(self) -> str:
        # Derivado siempre de porcentaje_llenado/en_mantenimiento: evita que un campo
        # "estado" guardado por separado se desincronice del dato real de llenado.
        if self.en_mantenimiento:
            return "mantenimiento"
        if self.porcentaje_llenado >= 80:
            return "casi_lleno"
        return "disponible"


class Reporte(Base):
    __tablename__ = "reportes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contenedor_id: Mapped[int] = mapped_column(ForeignKey("contenedores.id"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    motivo: Mapped[str] = mapped_column(String(40), nullable=False)
    comentario: Mapped[str | None] = mapped_column(String(500), nullable=True)
    evidencia_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contenedor: Mapped["Contenedor"] = relationship(back_populates="reportes")
    usuario: Mapped["Usuario"] = relationship(back_populates="reportes")
