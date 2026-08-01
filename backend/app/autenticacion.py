from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from .base_datos import obtener_base_datos
from .configuracion import configuracion
from .correo import (
    enviar_aviso_contrasena_actualizada,
    enviar_bienvenida,
    enviar_codigo_recuperacion,
    enviar_codigo_verificacion,
)
from .esquemas import (
    CambiarContrasenaEntrada,
    InicioSesionEntrada,
    ReenviarVerificacionEntrada,
    RecuperarContrasenaEntrada,
    RegistroEntrada,
    RegistroPendienteRespuesta,
    RestablecerContrasenaEntrada,
    SesionRespuesta,
    UsuarioRespuesta,
    VerificarCorreoEntrada,
)
from .modelos import (
    ControlUsuario,
    RecuperacionContrasena,
    Usuario,
    VerificacionCorreo,
    ahora_utc,
)
from .seguridad import (
    cifrar_contrasena,
    comparar_hash_secreto,
    crear_codigo_recuperacion,
    crear_hash_secreto,
    crear_token_acceso,
    leer_token_acceso,
    verificar_contrasena,
)

enrutador = APIRouter(prefix="/autenticacion", tags=["autenticacion"])
seguridad_bearer = HTTPBearer()
MENSAJE_RECUPERACION = (
    "Si el correo está registrado, recibirás un código para recuperar tu contraseña."
)
MENSAJE_VERIFICACION = (
    "Si la cuenta está pendiente, recibirás un código para verificar el correo."
)


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
        correo_verificado=control.correo_verificado if control else True,
        creado_en=usuario.creado_en,
        actualizado_en=usuario.actualizado_en,
    )


def crear_sesion(usuario: Usuario, base_datos: Session) -> SesionRespuesta:
    control = obtener_control_usuario(base_datos, usuario.id)
    return SesionRespuesta(
        token_acceso=crear_token_acceso(
            str(usuario.id),
            control.version_sesion if control else 1,
        ),
        usuario=crear_usuario_respuesta(usuario, control),
    )


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(seguridad_bearer),
    base_datos: Session = Depends(obtener_base_datos),
) -> Usuario:
    datos_token = leer_token_acceso(credenciales.credentials)
    if not datos_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    id_usuario, version_sesion = datos_token
    try:
        usuario = base_datos.get(Usuario, int(id_usuario))
    except ValueError:
        usuario = None
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    control = obtener_control_usuario(base_datos, usuario.id)
    if control and not control.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está suspendida. Contacta al administrador",
        )
    if control and not control.correo_verificado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar tu correo antes de continuar",
        )
    if control and control.version_sesion != version_sesion:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ya no es válida. Inicia sesión nuevamente",
        )

    return usuario


def crear_solicitud_verificacion(
    base_datos: Session,
    correo: str,
    usuario: Usuario | None,
    omitir_limite: bool = False,
) -> str | None:
    ahora = ahora_utc()
    destino_hash = crear_hash_secreto(correo)
    base_datos.execute(
        delete(VerificacionCorreo).where(
            VerificacionCorreo.creado_en < ahora - timedelta(days=7),
        ),
    )
    solicitudes_recientes = base_datos.scalar(
        select(func.count(VerificacionCorreo.id)).where(
            VerificacionCorreo.destino_hash == destino_hash,
            VerificacionCorreo.creado_en >= ahora - timedelta(hours=1),
        ),
    ) or 0
    ultima_solicitud = base_datos.scalar(
        select(VerificacionCorreo)
        .where(VerificacionCorreo.destino_hash == destino_hash)
        .order_by(VerificacionCorreo.creado_en.desc()),
    )
    en_enfriamiento = bool(
        ultima_solicitud
        and ultima_solicitud.creado_en
        > ahora - timedelta(seconds=configuracion.segundos_entre_correos_verificacion)
    )
    if not omitir_limite and (
        solicitudes_recientes >= configuracion.max_solicitudes_verificacion_hora
        or en_enfriamiento
    ):
        return None

    codigo = crear_codigo_recuperacion()
    if usuario:
        base_datos.execute(
            update(VerificacionCorreo)
            .where(
                VerificacionCorreo.usuario_id == usuario.id,
                VerificacionCorreo.usado_en.is_(None),
            )
            .values(usado_en=ahora),
        )
    base_datos.add(
        VerificacionCorreo(
            usuario_id=usuario.id if usuario else None,
            destino_hash=destino_hash,
            codigo_hash=crear_hash_secreto(codigo) if usuario else None,
            expira_en=ahora
            + timedelta(minutes=configuracion.minutos_expiracion_verificacion),
        ),
    )
    return codigo if usuario else None


@enrutador.post(
    "/registro",
    response_model=RegistroPendienteRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def registrar_usuario(
    datos: RegistroEntrada,
    tareas: BackgroundTasks,
    base_datos: Session = Depends(obtener_base_datos),
):
    correo = datos.correo.lower()
    usuario_existente = base_datos.scalar(select(Usuario).where(Usuario.correo == correo))
    if usuario_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")

    usuario = Usuario(
        nombre=datos.nombre.strip(),
        apellidos=datos.apellidos.strip(),
        correo=correo,
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
            correo_verificado=False,
        ),
    )
    codigo = crear_solicitud_verificacion(
        base_datos,
        correo,
        usuario,
        omitir_limite=True,
    )
    base_datos.commit()
    if codigo:
        tareas.add_task(
            enviar_codigo_verificacion,
            usuario.correo,
            usuario.nombre,
            codigo,
        )
    return RegistroPendienteRespuesta(
        mensaje="Cuenta creada. Revisa tu correo para verificarla",
    )


@enrutador.post("/reenviar-verificacion")
def reenviar_verificacion(
    datos: ReenviarVerificacionEntrada,
    tareas: BackgroundTasks,
    base_datos: Session = Depends(obtener_base_datos),
):
    correo = datos.correo.lower()
    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == correo))
    control = obtener_control_usuario(base_datos, usuario.id) if usuario else None
    usuario_pendiente = usuario if control and not control.correo_verificado else None
    codigo = crear_solicitud_verificacion(base_datos, correo, usuario_pendiente)
    base_datos.commit()
    if codigo and usuario_pendiente:
        tareas.add_task(
            enviar_codigo_verificacion,
            usuario_pendiente.correo,
            usuario_pendiente.nombre,
            codigo,
        )
    return {"mensaje": MENSAJE_VERIFICACION}


@enrutador.post("/verificar-correo", response_model=SesionRespuesta)
def verificar_correo(
    datos: VerificarCorreoEntrada,
    tareas: BackgroundTasks,
    base_datos: Session = Depends(obtener_base_datos),
):
    ahora = ahora_utc()
    correo = datos.correo.lower()
    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == correo))
    control = obtener_control_usuario(base_datos, usuario.id) if usuario else None
    verificacion = None
    if usuario and control and not control.correo_verificado:
        verificacion = base_datos.scalar(
            select(VerificacionCorreo)
            .where(
                VerificacionCorreo.usuario_id == usuario.id,
                VerificacionCorreo.destino_hash == crear_hash_secreto(correo),
                VerificacionCorreo.usado_en.is_(None),
                VerificacionCorreo.expira_en > ahora,
            )
            .order_by(VerificacionCorreo.creado_en.desc()),
        )

    codigo_valido = bool(
        verificacion
        and verificacion.codigo_hash
        and verificacion.intentos_fallidos
        < configuracion.max_intentos_codigo_verificacion
        and comparar_hash_secreto(datos.codigo, verificacion.codigo_hash)
    )
    if not codigo_valido:
        if verificacion:
            verificacion.intentos_fallidos += 1
            if verificacion.intentos_fallidos >= configuracion.max_intentos_codigo_verificacion:
                verificacion.usado_en = ahora
            base_datos.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código no es válido o ya venció. Solicita uno nuevo",
        )

    control.correo_verificado = True
    control.actualizado_en = ahora
    base_datos.execute(
        update(VerificacionCorreo)
        .where(
            VerificacionCorreo.usuario_id == usuario.id,
            VerificacionCorreo.usado_en.is_(None),
        )
        .values(usado_en=ahora),
    )
    base_datos.commit()
    tareas.add_task(enviar_bienvenida, usuario.correo, usuario.nombre)
    return crear_sesion(usuario, base_datos)


@enrutador.post("/iniciar-sesion", response_model=SesionRespuesta)
def iniciar_sesion(datos: InicioSesionEntrada, base_datos: Session = Depends(obtener_base_datos)):
    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == datos.correo.lower()))
    if not usuario or not verificar_contrasena(datos.contrasena, usuario.contrasena_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    control = obtener_control_usuario(base_datos, usuario.id)
    if control and not control.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está suspendida. Contacta al administrador",
        )
    if control and not control.correo_verificado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar tu correo antes de iniciar sesión",
        )

    return crear_sesion(usuario, base_datos)


@enrutador.post("/recuperar-contrasena")
def recuperar_contrasena(
    datos: RecuperarContrasenaEntrada,
    tareas: BackgroundTasks,
    base_datos: Session = Depends(obtener_base_datos),
):
    ahora = ahora_utc()
    correo = datos.correo.lower()
    destino_hash = crear_hash_secreto(correo)
    hace_una_hora = ahora - timedelta(hours=1)

    base_datos.execute(
        delete(RecuperacionContrasena).where(
            RecuperacionContrasena.creado_en < ahora - timedelta(days=7),
        ),
    )
    solicitudes_recientes = base_datos.scalar(
        select(func.count(RecuperacionContrasena.id)).where(
            RecuperacionContrasena.destino_hash == destino_hash,
            RecuperacionContrasena.creado_en >= hace_una_hora,
        ),
    ) or 0
    ultima_solicitud = base_datos.scalar(
        select(RecuperacionContrasena)
        .where(RecuperacionContrasena.destino_hash == destino_hash)
        .order_by(RecuperacionContrasena.creado_en.desc()),
    )
    en_enfriamiento = bool(
        ultima_solicitud
        and ultima_solicitud.creado_en
        > ahora - timedelta(seconds=configuracion.segundos_entre_correos_recuperacion)
    )
    if (
        solicitudes_recientes >= configuracion.max_solicitudes_recuperacion_hora
        or en_enfriamiento
    ):
        base_datos.commit()
        return {"mensaje": MENSAJE_RECUPERACION}

    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == correo))
    codigo = crear_codigo_recuperacion()
    if usuario:
        base_datos.execute(
            update(RecuperacionContrasena)
            .where(
                RecuperacionContrasena.usuario_id == usuario.id,
                RecuperacionContrasena.usado_en.is_(None),
            )
            .values(usado_en=ahora),
        )
    base_datos.add(
        RecuperacionContrasena(
            usuario_id=usuario.id if usuario else None,
            destino_hash=destino_hash,
            codigo_hash=crear_hash_secreto(codigo) if usuario else None,
            expira_en=ahora
            + timedelta(minutes=configuracion.minutos_expiracion_recuperacion),
        ),
    )
    base_datos.commit()

    if usuario:
        tareas.add_task(
            enviar_codigo_recuperacion,
            usuario.correo,
            usuario.nombre,
            codigo,
        )

    return {"mensaje": MENSAJE_RECUPERACION}


@enrutador.post("/restablecer-contrasena")
def restablecer_contrasena(
    datos: RestablecerContrasenaEntrada,
    tareas: BackgroundTasks,
    base_datos: Session = Depends(obtener_base_datos),
):
    ahora = ahora_utc()
    correo = datos.correo.lower()
    usuario = base_datos.scalar(select(Usuario).where(Usuario.correo == correo))
    recuperacion = None
    if usuario:
        recuperacion = base_datos.scalar(
            select(RecuperacionContrasena)
            .where(
                RecuperacionContrasena.usuario_id == usuario.id,
                RecuperacionContrasena.destino_hash == crear_hash_secreto(correo),
                RecuperacionContrasena.usado_en.is_(None),
                RecuperacionContrasena.expira_en > ahora,
            )
            .order_by(RecuperacionContrasena.creado_en.desc()),
        )

    codigo_valido = bool(
        recuperacion
        and recuperacion.codigo_hash
        and recuperacion.intentos_fallidos
        < configuracion.max_intentos_codigo_recuperacion
        and comparar_hash_secreto(datos.codigo, recuperacion.codigo_hash)
    )
    if not codigo_valido:
        if recuperacion:
            recuperacion.intentos_fallidos += 1
            if recuperacion.intentos_fallidos >= configuracion.max_intentos_codigo_recuperacion:
                recuperacion.usado_en = ahora
            base_datos.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código no es válido o ya venció. Solicita uno nuevo",
        )

    usuario.contrasena_hash = cifrar_contrasena(datos.contrasena_nueva)
    usuario.actualizado_en = ahora
    control = obtener_control_usuario(base_datos, usuario.id)
    if control:
        control.requiere_cambio_contrasena = False
        control.version_sesion += 1
        control.actualizado_en = ahora
    else:
        base_datos.add(
            ControlUsuario(
                usuario_id=usuario.id,
                activo=True,
                requiere_cambio_contrasena=False,
                version_sesion=2,
            ),
        )
    base_datos.execute(
        update(RecuperacionContrasena)
        .where(
            RecuperacionContrasena.usuario_id == usuario.id,
            RecuperacionContrasena.usado_en.is_(None),
        )
        .values(usado_en=ahora),
    )
    base_datos.commit()
    tareas.add_task(
        enviar_aviso_contrasena_actualizada,
        usuario.correo,
        usuario.nombre,
    )
    return {"mensaje": "Contraseña actualizada. Ya puedes iniciar sesión"}


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
            detail="La contraseña actual no es correcta",
        )

    usuario_actual.contrasena_hash = cifrar_contrasena(datos.contrasena_nueva)
    usuario_actual.actualizado_en = ahora_utc()
    control = obtener_control_usuario(base_datos, usuario_actual.id)
    if control:
        control.requiere_cambio_contrasena = False
        control.version_sesion += 1
        control.actualizado_en = ahora_utc()
    else:
        base_datos.add(
            ControlUsuario(
                usuario_id=usuario_actual.id,
                activo=True,
                requiere_cambio_contrasena=False,
                version_sesion=2,
            ),
        )
    base_datos.commit()
    return {"mensaje": "Contraseña actualizada correctamente"}
