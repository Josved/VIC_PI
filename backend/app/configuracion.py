import os

from pydantic import BaseModel, Field


def leer_origenes_cors() -> list[str]:
    valor = os.getenv("VIC_CORS_ORIGINS", "*")
    return [origen.strip() for origen in valor.split(",") if origen.strip()]


class Configuracion(BaseModel):
    nombre_app: str = Field(default_factory=lambda: os.getenv("VIC_APP_NAME", "VIC API"))
    entorno: str = Field(default_factory=lambda: os.getenv("VIC_ENVIRONMENT", "development"))
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
    minutos_expiracion_recuperacion: int = Field(
        default_factory=lambda: int(os.getenv("VIC_RECOVERY_EXPIRATION_MINUTES", "15")),
        ge=5,
        le=60,
    )
    max_solicitudes_recuperacion_hora: int = Field(
        default_factory=lambda: int(os.getenv("VIC_RECOVERY_MAX_REQUESTS_PER_HOUR", "3")),
        ge=1,
        le=20,
    )
    segundos_entre_correos_recuperacion: int = Field(
        default_factory=lambda: int(os.getenv("VIC_RECOVERY_EMAIL_COOLDOWN_SECONDS", "60")),
        ge=10,
        le=3600,
    )
    max_intentos_codigo_recuperacion: int = Field(
        default_factory=lambda: int(os.getenv("VIC_RECOVERY_MAX_CODE_ATTEMPTS", "5")),
        ge=1,
        le=20,
    )
    smtp_host: str = Field(default_factory=lambda: os.getenv("VIC_SMTP_HOST", ""))
    smtp_port: int = Field(
        default_factory=lambda: int(os.getenv("VIC_SMTP_PORT", "587")),
        ge=1,
        le=65535,
    )
    smtp_usuario: str = Field(default_factory=lambda: os.getenv("VIC_SMTP_USERNAME", ""))
    smtp_contrasena: str = Field(default_factory=lambda: os.getenv("VIC_SMTP_PASSWORD", ""))
    smtp_remitente: str = Field(default_factory=lambda: os.getenv("VIC_SMTP_FROM_EMAIL", ""))
    smtp_nombre_remitente: str = Field(
        default_factory=lambda: os.getenv("VIC_SMTP_FROM_NAME", "VIC"),
    )
    smtp_usar_starttls: bool = Field(
        default_factory=lambda: os.getenv("VIC_SMTP_USE_STARTTLS", "true").lower()
        in {"1", "true", "yes", "si"},
    )
    smtp_usar_ssl: bool = Field(
        default_factory=lambda: os.getenv("VIC_SMTP_USE_SSL", "false").lower()
        in {"1", "true", "yes", "si"},
    )
    segundos_espera_sqlite: float = Field(
        default_factory=lambda: float(os.getenv("VIC_SQLITE_TIMEOUT_SECONDS", "15")),
        gt=0,
        le=120,
    )
    segundos_espera_servicios: float = Field(
        default_factory=lambda: float(os.getenv("VIC_HTTP_TIMEOUT_SECONDS", "10")),
        gt=0,
        le=60,
    )
    origenes_cors: list[str] = Field(default_factory=leer_origenes_cors)
    ruta_raiz: str = Field(default_factory=lambda: os.getenv("VIC_ROOT_PATH", ""))
    url_enrutamiento: str = Field(
        default_factory=lambda: os.getenv(
            "VIC_ROUTING_URL",
            "https://router.project-osrm.org",
        ).rstrip("/"),
    )
    url_geocodificacion: str = Field(
        default_factory=lambda: os.getenv(
            "VIC_GEOCODING_URL",
            "https://nominatim.openstreetmap.org",
        ).rstrip("/"),
    )
    directorio_evidencias: str = Field(
        default_factory=lambda: os.getenv("VIC_EVIDENCE_DIR", "./evidencias"),
    )
    url_publica_evidencias: str = Field(
        default_factory=lambda: os.getenv("VIC_EVIDENCE_PUBLIC_URL", "/evidencias"),
    )


configuracion = Configuracion()

if configuracion.entorno.lower() == "production" and (
    configuracion.secreto_jwt
    in {
        "change-this-secret-before-production",
        "reemplazar-por-un-secreto-largo-y-aleatorio",
    }
    or len(configuracion.secreto_jwt) < 32
):
    raise RuntimeError(
        "VIC_JWT_SECRET debe tener al menos 32 caracteres y no usar el valor predeterminado",
    )
