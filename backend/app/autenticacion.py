from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .base_datos import obtener_base_datos
from .esquemas import (
    InicioSesionEntrada,
    RecuperarContrasenaEntrada,
    RegistroEntrada,
    RestablecerContrasenaEntrada,
    SesionRespuesta,
    UsuarioRespuesta,
)
from .modelos import Usuario
from .seguridad import cifrar_contrasena, crear_token_acceso, leer_token_acceso, verificar_contrasena

enrutador = APIRouter(prefix="/autenticacion", tags=["autenticacion"])
seguridad_bearer = HTTPBearer()


def crear_sesion(usuario: Usuario) -> SesionRespuesta:
    return SesionRespuesta(
        token_acceso=crear_token_acceso(str(usuario.id)),
        usuario=UsuarioRespuesta.model_validate(usuario),
    )


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(seguridad_bearer),
    base_datos: Session = Depends(obtener_base_datos),
) -> Usuario:
    id_usuario = leer_token_acceso(credenciales.credentials)
    if not id_usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    usuario = base_datos.get(Usuario, int(id_usuario))
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    return usuario


@enrutador.post("/registro", response_model=SesionRespuesta, status_code=status.HTTP_201_CREATED)
def registrar_usuario(datos: RegistroEntrada, base_datos: Session = Depends(obtener_base_datos)):
    usuario_existente = base_datos.scalar(select(Usuario).where(Usuario.correo == datos.correo.lower()))
    if usuario_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya esta registrado")

    usuario = Usuario(
        nombre=datos.nombre.strip(),
        apellidos=datos.apellidos.strip(),
        correo=datos.correo.lower(),
        contrasena_hash=cifrar_contrasena(datos.contrasena),
        rol="citizen",
    )
    base_datos.add(usuario)
    base_datos.commit()
    base_datos.refresh(usuario)
    return crear_sesion(usuario)


@enrutador.post("/iniciar-sesion", response_model=SesionRespuesta)
def iniciar_sesion(datos: InicioSesionEntrada, base_datos: Session = Depends(obtener_base_datos)):
    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == datos.correo.lower()))
    if not usuario or not verificar_contrasena(datos.contrasena, usuario.contrasena_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    return crear_sesion(usuario)


@enrutador.post("/recuperar-contrasena")
def recuperar_contrasena(datos: RecuperarContrasenaEntrada):
    return {"mensaje": "Si el correo existe, se enviaran instrucciones de recuperacion", "correo": datos.correo}


@enrutador.post("/restablecer-contrasena")
def restablecer_contrasena(datos: RestablecerContrasenaEntrada):
    return {"mensaje": "Endpoint preparado para integrar tokens de recuperacion"}


@enrutador.get("/mi-usuario", response_model=UsuarioRespuesta)
def obtener_mi_usuario(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return usuario_actual
