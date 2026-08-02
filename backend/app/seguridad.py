import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from .configuracion import configuracion

contexto_contrasena = CryptContext(schemes=["bcrypt"], deprecated="auto")


def cifrar_contrasena(contrasena: str) -> str:
    return contexto_contrasena.hash(contrasena)


def verificar_contrasena(contrasena: str, contrasena_hash: str) -> bool:
    return contexto_contrasena.verify(contrasena, contrasena_hash)


def crear_token_acceso(id_usuario: str, version_sesion: int = 1) -> str:
    expira_en = datetime.now(timezone.utc) + timedelta(
        minutes=configuracion.minutos_expiracion_token,
    )
    datos_token = {
        "sub": id_usuario,
        "ver": version_sesion,
        "iat": datetime.now(timezone.utc),
        "exp": expira_en,
    }
    return jwt.encode(datos_token, configuracion.secreto_jwt, algorithm=configuracion.algoritmo_jwt)


def leer_token_acceso(token: str) -> tuple[str, int] | None:
    try:
        datos_token = jwt.decode(
            token,
            configuracion.secreto_jwt,
            algorithms=[configuracion.algoritmo_jwt],
        )
        id_usuario = datos_token.get("sub")
        version_sesion = datos_token.get("ver", 1)
        if not id_usuario or not isinstance(version_sesion, int):
            return None
        return str(id_usuario), version_sesion
    except JWTError:
        return None


ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def crear_codigo_recuperacion() -> str:
    return "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(8))


def crear_hash_secreto(valor: str) -> str:
    return hmac.new(
        configuracion.secreto_jwt.encode("utf-8"),
        valor.strip().upper().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def comparar_hash_secreto(valor: str, valor_hash: str) -> bool:
    return hmac.compare_digest(crear_hash_secreto(valor), valor_hash)
