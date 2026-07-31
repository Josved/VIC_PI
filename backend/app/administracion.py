from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .base_datos import obtener_base_datos
from .esquemas import (
    RestablecerContrasenaAdminEntrada,
    UsuarioAdministradoActualizar,
    UsuarioAdministradoCrear,
    UsuarioAdministradoRespuesta,
)
from .modelos import AsignacionRuta, ControlUsuario, Usuario, ahora_utc
from .permisos import requiere_rol
from .seguridad import cifrar_contrasena

enrutador = APIRouter(prefix="/administracion", tags=["administracion"])


def obtener_control(base_datos: Session, usuario: Usuario) -> ControlUsuario:
    control = base_datos.get(ControlUsuario, usuario.id)
    if control:
        return control
    control = ControlUsuario(
        usuario_id=usuario.id,
        activo=True,
        requiere_cambio_contrasena=False,
    )
    base_datos.add(control)
    base_datos.flush()
    return control


def crear_respuesta(
    base_datos: Session,
    usuario: Usuario,
) -> UsuarioAdministradoRespuesta:
    control = obtener_control(base_datos, usuario)
    return UsuarioAdministradoRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        apellidos=usuario.apellidos,
        correo=usuario.correo,
        rol=usuario.rol,
        activo=control.activo,
        requiere_cambio_contrasena=control.requiere_cambio_contrasena,
        creado_en=usuario.creado_en,
        actualizado_en=usuario.actualizado_en,
    )


def obtener_usuario_o_error(base_datos: Session, usuario_id: int) -> Usuario:
    usuario = base_datos.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return usuario


@enrutador.get("/usuarios", response_model=list[UsuarioAdministradoRespuesta])
def listar_usuarios(
    _administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    usuarios = base_datos.scalars(
        select(Usuario).order_by(Usuario.creado_en.desc()),
    ).all()
    respuestas = [crear_respuesta(base_datos, usuario) for usuario in usuarios]
    base_datos.commit()
    return respuestas


@enrutador.get("/recolectores", response_model=list[UsuarioAdministradoRespuesta])
def listar_recolectores(
    _gestor: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    recolectores = base_datos.scalars(
        select(Usuario)
        .where(Usuario.rol == "collector")
        .order_by(Usuario.nombre, Usuario.apellidos),
    ).all()
    respuestas = [
        crear_respuesta(base_datos, usuario)
        for usuario in recolectores
        if obtener_control(base_datos, usuario).activo
    ]
    base_datos.commit()
    return respuestas


@enrutador.post(
    "/usuarios",
    response_model=UsuarioAdministradoRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_usuario(
    datos: UsuarioAdministradoCrear,
    administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    correo = datos.correo.lower()
    if base_datos.scalar(select(Usuario).where(Usuario.correo == correo)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya esta registrado",
        )

    usuario = Usuario(
        nombre=datos.nombre.strip(),
        apellidos=datos.apellidos.strip(),
        correo=correo,
        contrasena_hash=cifrar_contrasena(datos.contrasena_temporal),
        rol=datos.rol,
    )
    base_datos.add(usuario)
    base_datos.flush()
    base_datos.add(
        ControlUsuario(
            usuario_id=usuario.id,
            activo=True,
            requiere_cambio_contrasena=True,
            actualizado_por_id=administrador.id,
        ),
    )
    base_datos.commit()
    base_datos.refresh(usuario)
    return crear_respuesta(base_datos, usuario)


@enrutador.patch(
    "/usuarios/{usuario_id}",
    response_model=UsuarioAdministradoRespuesta,
)
def actualizar_usuario(
    usuario_id: int,
    datos: UsuarioAdministradoActualizar,
    administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    usuario = obtener_usuario_o_error(base_datos, usuario_id)
    cambios = datos.model_dump(exclude_unset=True)

    if usuario.id == administrador.id and (
        cambios.get("activo") is False
        or ("rol" in cambios and cambios["rol"] != "admin")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes suspender ni quitar tu propio rol de administrador",
        )

    if "rol" in cambios and usuario.rol == "collector" and cambios["rol"] != "collector":
        asignada = base_datos.scalar(
            select(AsignacionRuta).where(AsignacionRuta.recolector_id == usuario.id),
        )
        if asignada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reasigna primero las rutas de este recolector",
            )

    if "rol" in cambios:
        usuario.rol = cambios["rol"]

    control = obtener_control(base_datos, usuario)
    if "activo" in cambios:
        control.activo = cambios["activo"]
    control.actualizado_por_id = administrador.id
    control.actualizado_en = ahora_utc()
    usuario.actualizado_en = ahora_utc()

    base_datos.commit()
    base_datos.refresh(usuario)
    return crear_respuesta(base_datos, usuario)


@enrutador.post(
    "/usuarios/{usuario_id}/restablecer-contrasena",
    response_model=UsuarioAdministradoRespuesta,
)
def restablecer_contrasena(
    usuario_id: int,
    datos: RestablecerContrasenaAdminEntrada,
    administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    usuario = obtener_usuario_o_error(base_datos, usuario_id)
    usuario.contrasena_hash = cifrar_contrasena(datos.contrasena_temporal)
    usuario.actualizado_en = ahora_utc()
    control = obtener_control(base_datos, usuario)
    control.requiere_cambio_contrasena = True
    control.actualizado_por_id = administrador.id
    control.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(usuario)
    return crear_respuesta(base_datos, usuario)
