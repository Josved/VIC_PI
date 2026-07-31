import os

from pydantic import BaseModel, Field


def leer_origenes_cors() -> list[str]:
    valor = os.getenv("VIC_CORS_ORIGINS", "*")
    return [origen.strip() for origen in valor.split(",") if origen.strip()]


class Configuracion(BaseModel):
    nombre_app: str = Field(default_factory=lambda: os.getenv("VIC_APP_NAME", "VIC API"))
    url_base_datos: str = Field(
        default_factory=lambda: os.getenv("VIC_DATABASE_URL", "sqlite:///./vic.db"),
    )
    secreto_jwt: str = Field(
        default_factory=lambda: os.getenv("VIC_JWT_SECRET", "change-this-secret-before-production"),
    )
    algoritmo_jwt: str = Field(default_factory=lambda: os.getenv("VIC_JWT_ALGORITHM", "HS256"))
    minutos_expiracion_token: int = Field(
        default_factory=lambda: int(os.getenv("VIC_TOKEN_EXPIRATION_MINUTES", str(60 * 24))),
    )
    origenes_cors: list[str] = Field(default_factory=leer_origenes_cors)
    ruta_raiz: str = Field(default_factory=lambda: os.getenv("VIC_ROOT_PATH", ""))


configuracion = Configuracion()
