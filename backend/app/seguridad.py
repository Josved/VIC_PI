from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from .configuracion import configuracion

contexto_contrasena = CryptContext(schemes=["bcrypt"], deprecated="auto")


def cifrar_contrasena(contrasena: str) -> str:
    return contexto_contrasena.hash(contrasena)


def verificar_contrasena(contrasena: str, contrasena_hash: str) -> bool:
    return contexto_contrasena.verify(contrasena, contrasena_hash)


def crear_token_acceso(id_usuario: str) -> str:
    expira_en = datetime.now(timezone.utc) + timedelta(minutes=configuracion.minutos_expiracion_token)
    datos_token = {"sub": id_usuario, "exp": expira_en}
    return jwt.encode(datos_token, configuracion.secreto_jwt, algorithm=configuracion.algoritmo_jwt)


def leer_token_acceso(token: str) -> str | None:
    try:
        datos_token = jwt.decode(token, configuracion.secreto_jwt, algorithms=[configuracion.algoritmo_jwt])
        id_usuario = datos_token.get("sub")
        return str(id_usuario) if id_usuario else None
    except JWTError:
        return None
