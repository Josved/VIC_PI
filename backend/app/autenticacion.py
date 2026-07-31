from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .base_datos import obtener_base_datos
from .esquemas import (
    CambiarContrasenaEntrada,
    InicioSesionEntrada,
    RecuperarContrasenaEntrada,
    RegistroEntrada,
    RestablecerContrasenaEntrada,
    SesionRespuesta,
    UsuarioRespuesta,
)
from .modelos import ControlUsuario, Usuario, ahora_utc
from .seguridad import cifrar_contrasena, crear_token_acceso, leer_token_acceso, verificar_contrasena

enrutador = APIRouter(prefix="/autenticacion", tags=["autenticacion"])
seguridad_bearer = HTTPBearer()


def obtener_control_usuario(
    base_datos: Session,
    usuario_id: int,
) -> ControlUsuario | None:
    return base_datos.get(ControlUsuario, usuario_id)


def crear_usuario_respuesta(
    usuario: Usuario,
    control: ControlUsuario | None = None,
) -> UsuarioRespuesta:
    return UsuarioRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        apellidos=usuario.apellidos,
        correo=usuario.correo,
        rol=usuario.rol,
        activo=control.activo if control else True,
        requiere_cambio_contrasena=(
            control.requiere_cambio_contrasena if control else False
        ),
        creado_en=usuario.creado_en,
        actualizado_en=usuario.actualizado_en,
    )


def crear_sesion(usuario: Usuario, base_datos: Session) -> SesionRespuesta:
    control = obtener_control_usuario(base_datos, usuario.id)
    return SesionRespuesta(
        token_acceso=crear_token_acceso(str(usuario.id)),
        usuario=crear_usuario_respuesta(usuario, control),
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

    control = obtener_control_usuario(base_datos, usuario.id)
    if control and not control.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta esta suspendida. Contacta al administrador",
        )

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
    base_datos.flush()
    base_datos.add(
        ControlUsuario(
            usuario_id=usuario.id,
            activo=True,
            requiere_cambio_contrasena=False,
        ),
    )
    base_datos.commit()
    base_datos.refresh(usuario)
    return crear_sesion(usuario, base_datos)


@enrutador.post("/iniciar-sesion", response_model=SesionRespuesta)
def iniciar_sesion(datos: InicioSesionEntrada, base_datos: Session = Depends(obtener_base_datos)):
    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == datos.correo.lower()))
    if not usuario or not verificar_contrasena(datos.contrasena, usuario.contrasena_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    control = obtener_control_usuario(base_datos, usuario.id)
    if control and not control.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta esta suspendida. Contacta al administrador",
        )

    return crear_sesion(usuario, base_datos)


@enrutador.post("/recuperar-contrasena")
def recuperar_contrasena(datos: RecuperarContrasenaEntrada):
    return {"mensaje": "Si el correo existe, se enviaran instrucciones de recuperacion", "correo": datos.correo}


@enrutador.post("/restablecer-contrasena")
def restablecer_contrasena(datos: RestablecerContrasenaEntrada):
    return {"mensaje": "Endpoint preparado para integrar tokens de recuperacion"}


@enrutador.get("/mi-usuario", response_model=UsuarioRespuesta)
def obtener_mi_usuario(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    return crear_usuario_respuesta(
        usuario_actual,
        obtener_control_usuario(base_datos, usuario_actual.id),
    )


@enrutador.post("/cambiar-contrasena")
def cambiar_contrasena(
    datos: CambiarContrasenaEntrada,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    if not verificar_contrasena(
        datos.contrasena_actual,
        usuario_actual.contrasena_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contrasena actual no es correcta",
        )

    usuario_actual.contrasena_hash = cifrar_contrasena(datos.contrasena_nueva)
    usuario_actual.actualizado_en = ahora_utc()
    control = obtener_control_usuario(base_datos, usuario_actual.id)
    if control:
        control.requiere_cambio_contrasena = False
        control.actualizado_en = ahora_utc()
    else:
        base_datos.add(
            ControlUsuario(
                usuario_id=usuario_actual.id,
                activo=True,
                requiere_cambio_contrasena=False,
            ),
        )
    base_datos.commit()
    return {"mensaje": "Contrasena actualizada correctamente"}
