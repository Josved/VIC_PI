from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, delete, or_, select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import (
    ContenedorRutaRespuesta,
    OperacionRutaResumenRespuesta,
    RutaActualizar,
    RutaCrear,
    RutaRespuesta,
    UsuarioRutaRespuesta,
)
from .modelos import (
    AsignacionRuta,
    Contenedor,
    ControlUsuario,
    EjecucionRuta,
    ParadaEjecucionRuta,
    RutaContenedor,
    RutaRecoleccion,
    Usuario,
    ahora_utc,
)
from .permisos import requiere_rol

enrutador = APIRouter(prefix="/rutas", tags=["rutas"])

ORDEN_DIAS = {
    "lunes": 1,
    "martes": 2,
    "miercoles": 3,
    "jueves": 4,
    "viernes": 5,
    "sabado": 6,
    "domingo": 7,
}


def obtener_contenedores_validos(
    base_datos: Session,
    contenedor_ids: list[int],
) -> dict[int, Contenedor]:
    contenedores = base_datos.scalars(
        select(Contenedor).where(Contenedor.id.in_(contenedor_ids)),
    ).all()
    por_id = {contenedor.id: contenedor for contenedor in contenedores}
    faltantes = [
        contenedor_id
        for contenedor_id in contenedor_ids
        if contenedor_id not in por_id
    ]
    if faltantes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Contenedores no encontrados: {', '.join(map(str, faltantes))}",
        )
    return por_id


def guardar_contenedores_de_ruta(
    base_datos: Session,
    ruta_id: int,
    contenedor_ids: list[int],
) -> None:
    obtener_contenedores_validos(base_datos, contenedor_ids)
    base_datos.execute(
        delete(RutaContenedor).where(RutaContenedor.ruta_id == ruta_id),
    )
    base_datos.add_all(
        [
            RutaContenedor(
                ruta_id=ruta_id,
                contenedor_id=contenedor_id,
                orden=indice,
            )
            for indice, contenedor_id in enumerate(contenedor_ids, start=1)
        ],
    )


def obtener_recolector_valido(
    base_datos: Session,
    recolector_id: int,
) -> Usuario:
    recolector = base_datos.get(Usuario, recolector_id)
    control = base_datos.get(ControlUsuario, recolector_id)
    if (
        not recolector
        or recolector.rol != "collector"
        or (control and not control.activo)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El recolector seleccionado no existe o esta suspendido",
        )
    return recolector


def guardar_asignacion(
    base_datos: Session,
    ruta_id: int,
    recolector_id: int,
    asignado_por_id: int,
) -> None:
    obtener_recolector_valido(base_datos, recolector_id)
    asignacion = base_datos.get(AsignacionRuta, ruta_id)
    if asignacion:
        asignacion.recolector_id = recolector_id
        asignacion.asignado_por_id = asignado_por_id
        asignacion.actualizado_en = ahora_utc()
        return
    base_datos.add(
        AsignacionRuta(
            ruta_id=ruta_id,
            recolector_id=recolector_id,
            asignado_por_id=asignado_por_id,
        ),
    )


def calcular_operacion(
    base_datos: Session,
    ruta_id: int,
) -> OperacionRutaResumenRespuesta | None:
    ejecucion = base_datos.scalar(
        select(EjecucionRuta)
        .where(EjecucionRuta.ruta_id == ruta_id)
        .order_by(EjecucionRuta.id.desc()),
    )
    if not ejecucion:
        return None

    paradas = base_datos.scalars(
        select(ParadaEjecucionRuta).where(
            ParadaEjecucionRuta.ejecucion_id == ejecucion.id,
        ),
    ).all()
    atendidas = sum(parada.estado != "pendiente" for parada in paradas)
    total = len(paradas)
    progreso = round((atendidas / total) * 100) if total else 0
    return OperacionRutaResumenRespuesta(
        ejecucion_id=ejecucion.id,
        estado=ejecucion.estado,
        progreso_porcentaje=progreso,
        paradas_atendidas=atendidas,
        paradas_totales=total,
        latitud_actual=ejecucion.latitud_actual,
        longitud_actual=ejecucion.longitud_actual,
        precision_m_actual=ejecucion.precision_m_actual,
        ubicacion_actualizada_en=ejecucion.ubicacion_actualizada_en,
        iniciado_en=ejecucion.iniciado_en,
        finalizado_en=ejecucion.finalizado_en,
    )


def crear_respuesta_ruta(
    base_datos: Session,
    ruta: RutaRecoleccion,
) -> RutaRespuesta:
    filas = base_datos.execute(
        select(RutaContenedor, Contenedor)
        .join(Contenedor, Contenedor.id == RutaContenedor.contenedor_id)
        .where(RutaContenedor.ruta_id == ruta.id)
        .order_by(RutaContenedor.orden),
    ).all()
    asignacion = base_datos.get(AsignacionRuta, ruta.id)
    recolector = (
        base_datos.get(Usuario, asignacion.recolector_id)
        if asignacion
        else None
    )
    return RutaRespuesta(
        id=ruta.id,
        nombre=ruta.nombre,
        zona=ruta.zona,
        dia_semana=ruta.dia_semana,
        hora_aproximada=ruta.hora_aproximada,
        descripcion=ruta.descripcion,
        activa=ruta.activa,
        creado_por_id=ruta.creado_por_id,
        recolector=(
            UsuarioRutaRespuesta(
                id=recolector.id,
                nombre=recolector.nombre,
                apellidos=recolector.apellidos,
                correo=recolector.correo,
            )
            if recolector
            else None
        ),
        operacion=calcular_operacion(base_datos, ruta.id),
        contenedores=[
            ContenedorRutaRespuesta(
                id=contenedor.id,
                codigo_qr=contenedor.codigo_qr,
                orden=relacion.orden,
                latitud=contenedor.latitud,
                longitud=contenedor.longitud,
            )
            for relacion, contenedor in filas
        ],
        creado_en=ruta.creado_en,
        actualizado_en=ruta.actualizado_en,
    )


def obtener_ruta_o_error(base_datos: Session, ruta_id: int) -> RutaRecoleccion:
    ruta = base_datos.get(RutaRecoleccion, ruta_id)
    if not ruta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ruta no encontrada",
        )
    return ruta


def validar_gestion(ruta: RutaRecoleccion, usuario: Usuario) -> None:
    if usuario.rol != "admin" and ruta.creado_por_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes modificar las rutas que creaste",
        )


def consulta_ordenada():
    orden_dia = case(ORDEN_DIAS, value=RutaRecoleccion.dia_semana, else_=8)
    return select(RutaRecoleccion).order_by(
        orden_dia,
        RutaRecoleccion.hora_aproximada,
        RutaRecoleccion.nombre,
    )


@enrutador.get("", response_model=list[RutaRespuesta])
def listar_rutas_activas(
    _usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    rutas = base_datos.scalars(
        consulta_ordenada().where(RutaRecoleccion.activa.is_(True)),
    ).all()
    return [crear_respuesta_ruta(base_datos, ruta) for ruta in rutas]


@enrutador.get("/mias", response_model=list[RutaRespuesta])
def listar_rutas_gestionables(
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    consulta = consulta_ordenada()
    if usuario_actual.rol != "admin":
        rutas_asignadas = select(AsignacionRuta.ruta_id).where(
            AsignacionRuta.recolector_id == usuario_actual.id,
        )
        consulta = consulta.where(
            or_(
                RutaRecoleccion.creado_por_id == usuario_actual.id,
                RutaRecoleccion.id.in_(rutas_asignadas),
            ),
        )
    rutas = base_datos.scalars(consulta).all()
    return [crear_respuesta_ruta(base_datos, ruta) for ruta in rutas]


@enrutador.post("", response_model=RutaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_ruta(
    datos: RutaCrear,
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    recolector_id = datos.recolector_id
    if usuario_actual.rol == "collector":
        if recolector_id not in (None, usuario_actual.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes asignar una ruta a otro recolector",
            )
        recolector_id = usuario_actual.id
    elif recolector_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selecciona el recolector responsable",
        )

    obtener_contenedores_validos(base_datos, datos.contenedor_ids)
    ruta = RutaRecoleccion(
        nombre=datos.nombre,
        zona=datos.zona,
        dia_semana=datos.dia_semana,
        hora_aproximada=datos.hora_aproximada,
        descripcion=datos.descripcion,
        creado_por_id=usuario_actual.id,
    )
    base_datos.add(ruta)
    base_datos.flush()
    guardar_contenedores_de_ruta(base_datos, ruta.id, datos.contenedor_ids)
    guardar_asignacion(
        base_datos,
        ruta.id,
        recolector_id,
        usuario_actual.id,
    )
    base_datos.commit()
    base_datos.refresh(ruta)
    return crear_respuesta_ruta(base_datos, ruta)


@enrutador.patch("/{ruta_id}", response_model=RutaRespuesta)
def actualizar_ruta(
    ruta_id: int,
    datos: RutaActualizar,
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ruta = obtener_ruta_o_error(base_datos, ruta_id)
    validar_gestion(ruta, usuario_actual)
    cambios = datos.model_dump(exclude_unset=True)
    contenedor_ids = cambios.pop("contenedor_ids", None)
    recolector_id = cambios.pop("recolector_id", None)

    if recolector_id is not None:
        if usuario_actual.rol != "admin" and recolector_id != usuario_actual.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el administrador puede reasignar rutas",
            )
        ejecucion_activa = base_datos.scalar(
            select(EjecucionRuta).where(
                EjecucionRuta.ruta_id == ruta.id,
                EjecucionRuta.estado == "en_recorrido",
            ),
        )
        if ejecucion_activa:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede reasignar una ruta en recorrido",
            )
        guardar_asignacion(
            base_datos,
            ruta.id,
            recolector_id,
            usuario_actual.id,
        )

    for campo, valor in cambios.items():
        setattr(ruta, campo, valor)
    ruta.actualizado_en = ahora_utc()

    if contenedor_ids is not None:
        guardar_contenedores_de_ruta(base_datos, ruta.id, contenedor_ids)

    base_datos.commit()
    base_datos.refresh(ruta)
    return crear_respuesta_ruta(base_datos, ruta)
