from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .base_datos import obtener_base_datos
from .esquemas import (
    CancelarEjecucionEntrada,
    EjecucionRutaRespuesta,
    IncidenciaOperacionCrear,
    IncidenciaOperacionRespuesta,
    ParadaEjecucionRespuesta,
    ParadaOperacionActualizar,
    UbicacionOperacionEntrada,
    UsuarioRutaRespuesta,
)
from .modelos import (
    AsignacionRuta,
    Contenedor,
    EjecucionRuta,
    IncidenciaOperativa,
    ParadaEjecucionRuta,
    RutaContenedor,
    RutaRecoleccion,
    UbicacionEjecucionRuta,
    Usuario,
    ahora_utc,
)
from .permisos import requiere_rol

enrutador = APIRouter(prefix="/operacion", tags=["operacion"])


def obtener_ejecucion_o_error(
    base_datos: Session,
    ejecucion_id: int,
) -> EjecucionRuta:
    ejecucion = base_datos.get(EjecucionRuta, ejecucion_id)
    if not ejecucion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recorrido no encontrado",
        )
    return ejecucion


def validar_responsable(ejecucion: EjecucionRuta, usuario: Usuario) -> None:
    if usuario.rol != "admin" and ejecucion.recolector_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este recorrido esta asignado a otro recolector",
        )


def respuesta_incidencia(
    incidencia: IncidenciaOperativa,
) -> IncidenciaOperacionRespuesta:
    return IncidenciaOperacionRespuesta(
        id=incidencia.id,
        ejecucion_id=incidencia.ejecucion_id,
        parada_id=incidencia.parada_id,
        recolector_id=incidencia.recolector_id,
        tipo=incidencia.tipo,
        comentario=incidencia.comentario,
        evidencia_url=incidencia.evidencia_url,
        latitud=incidencia.latitud,
        longitud=incidencia.longitud,
        creado_en=incidencia.creado_en,
    )


def crear_respuesta_ejecucion(
    base_datos: Session,
    ejecucion: EjecucionRuta,
) -> EjecucionRutaRespuesta:
    ruta = base_datos.get(RutaRecoleccion, ejecucion.ruta_id)
    recolector = base_datos.get(Usuario, ejecucion.recolector_id)
    filas_paradas = base_datos.execute(
        select(ParadaEjecucionRuta, Contenedor)
        .join(Contenedor, Contenedor.id == ParadaEjecucionRuta.contenedor_id)
        .where(ParadaEjecucionRuta.ejecucion_id == ejecucion.id)
        .order_by(ParadaEjecucionRuta.orden),
    ).all()
    incidencias = base_datos.scalars(
        select(IncidenciaOperativa)
        .where(IncidenciaOperativa.ejecucion_id == ejecucion.id)
        .order_by(IncidenciaOperativa.creado_en.desc()),
    ).all()
    total = len(filas_paradas)
    atendidas = sum(parada.estado != "pendiente" for parada, _ in filas_paradas)
    progreso = round((atendidas / total) * 100) if total else 0

    return EjecucionRutaRespuesta(
        id=ejecucion.id,
        ruta_id=ejecucion.ruta_id,
        ruta_nombre=ruta.nombre,
        zona=ruta.zona,
        recolector=UsuarioRutaRespuesta(
            id=recolector.id,
            nombre=recolector.nombre,
            apellidos=recolector.apellidos,
            correo=recolector.correo,
        ),
        fecha_servicio=ejecucion.fecha_servicio,
        estado=ejecucion.estado,
        motivo_cancelacion=ejecucion.motivo_cancelacion,
        progreso_porcentaje=progreso,
        latitud_actual=ejecucion.latitud_actual,
        longitud_actual=ejecucion.longitud_actual,
        precision_m_actual=ejecucion.precision_m_actual,
        ubicacion_actualizada_en=ejecucion.ubicacion_actualizada_en,
        iniciado_en=ejecucion.iniciado_en,
        finalizado_en=ejecucion.finalizado_en,
        paradas=[
            ParadaEjecucionRespuesta(
                id=parada.id,
                contenedor_id=contenedor.id,
                codigo_qr=contenedor.codigo_qr,
                orden=parada.orden,
                estado=parada.estado,
                observacion=parada.observacion,
                latitud=contenedor.latitud,
                longitud=contenedor.longitud,
                atendido_en=parada.atendido_en,
            )
            for parada, contenedor in filas_paradas
        ],
        incidencias=[respuesta_incidencia(incidencia) for incidencia in incidencias],
    )


def guardar_ubicacion(
    base_datos: Session,
    ejecucion: EjecucionRuta,
    usuario: Usuario,
    datos: UbicacionOperacionEntrada,
) -> None:
    momento = ahora_utc()
    ejecucion.latitud_actual = datos.latitud
    ejecucion.longitud_actual = datos.longitud
    ejecucion.precision_m_actual = datos.precision_m
    ejecucion.ubicacion_actualizada_en = momento
    ejecucion.actualizado_en = momento
    base_datos.add(
        UbicacionEjecucionRuta(
            ejecucion_id=ejecucion.id,
            recolector_id=usuario.id,
            latitud=datos.latitud,
            longitud=datos.longitud,
            precision_m=datos.precision_m,
        ),
    )


@enrutador.get(
    "/mi-recorrido-activo",
    response_model=EjecucionRutaRespuesta | None,
)
def obtener_mi_recorrido_activo(
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = base_datos.scalar(
        select(EjecucionRuta)
        .where(
            EjecucionRuta.recolector_id == recolector.id,
            EjecucionRuta.estado == "en_recorrido",
        )
        .order_by(EjecucionRuta.id.desc()),
    )
    return crear_respuesta_ejecucion(base_datos, ejecucion) if ejecucion else None


@enrutador.get(
    "/ejecuciones/{ejecucion_id}",
    response_model=EjecucionRutaRespuesta,
)
def obtener_ejecucion(
    ejecucion_id: int,
    usuario: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = obtener_ejecucion_o_error(base_datos, ejecucion_id)
    validar_responsable(ejecucion, usuario)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.post(
    "/rutas/{ruta_id}/iniciar",
    response_model=EjecucionRutaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def iniciar_recorrido(
    ruta_id: int,
    ubicacion: UbicacionOperacionEntrada,
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ruta = base_datos.get(RutaRecoleccion, ruta_id)
    if not ruta or not ruta.activa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La ruta no existe o esta pausada",
        )

    asignacion = base_datos.get(AsignacionRuta, ruta_id)
    if not asignacion or asignacion.recolector_id != recolector.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La ruta no esta asignada a este recolector",
        )

    recorrido_activo = base_datos.scalar(
        select(EjecucionRuta).where(
            EjecucionRuta.recolector_id == recolector.id,
            EjecucionRuta.estado == "en_recorrido",
        ),
    )
    if recorrido_activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finaliza o cancela tu recorrido actual antes de iniciar otro",
        )

    contenedores = base_datos.scalars(
        select(RutaContenedor)
        .where(RutaContenedor.ruta_id == ruta_id)
        .order_by(RutaContenedor.orden),
    ).all()
    if not contenedores:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La ruta no tiene contenedores",
        )

    ejecucion = EjecucionRuta(
        ruta_id=ruta.id,
        recolector_id=recolector.id,
        fecha_servicio=ahora_utc().date().isoformat(),
        estado="en_recorrido",
    )
    base_datos.add(ejecucion)
    base_datos.flush()
    base_datos.add_all(
        [
            ParadaEjecucionRuta(
                ejecucion_id=ejecucion.id,
                contenedor_id=relacion.contenedor_id,
                orden=relacion.orden,
            )
            for relacion in contenedores
        ],
    )
    guardar_ubicacion(base_datos, ejecucion, recolector, ubicacion)
    base_datos.commit()
    base_datos.refresh(ejecucion)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.post(
    "/ejecuciones/{ejecucion_id}/ubicacion",
    response_model=EjecucionRutaRespuesta,
)
def actualizar_ubicacion(
    ejecucion_id: int,
    datos: UbicacionOperacionEntrada,
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = obtener_ejecucion_o_error(base_datos, ejecucion_id)
    validar_responsable(ejecucion, recolector)
    if ejecucion.estado != "en_recorrido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El recorrido ya no esta activo",
        )
    guardar_ubicacion(base_datos, ejecucion, recolector, datos)
    base_datos.commit()
    base_datos.refresh(ejecucion)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.patch(
    "/ejecuciones/{ejecucion_id}/paradas/{parada_id}",
    response_model=EjecucionRutaRespuesta,
)
def actualizar_parada(
    ejecucion_id: int,
    parada_id: int,
    datos: ParadaOperacionActualizar,
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = obtener_ejecucion_o_error(base_datos, ejecucion_id)
    validar_responsable(ejecucion, recolector)
    if ejecucion.estado != "en_recorrido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El recorrido ya no esta activo",
        )
    parada = base_datos.get(ParadaEjecucionRuta, parada_id)
    if not parada or parada.ejecucion_id != ejecucion.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parada no encontrada",
        )
    parada.estado = datos.estado
    parada.observacion = datos.observacion
    parada.atendido_en = ahora_utc()
    ejecucion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ejecucion)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.post(
    "/ejecuciones/{ejecucion_id}/incidencias",
    response_model=EjecucionRutaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_incidencia(
    ejecucion_id: int,
    datos: IncidenciaOperacionCrear,
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = obtener_ejecucion_o_error(base_datos, ejecucion_id)
    validar_responsable(ejecucion, recolector)
    if ejecucion.estado != "en_recorrido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El recorrido ya no esta activo",
        )

    parada = None
    if datos.parada_id is not None:
        parada = base_datos.get(ParadaEjecucionRuta, datos.parada_id)
        if not parada or parada.ejecucion_id != ejecucion.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La parada no pertenece a este recorrido",
            )
        parada.estado = "incidencia"
        parada.observacion = datos.comentario
        parada.atendido_en = ahora_utc()

    base_datos.add(
        IncidenciaOperativa(
            ejecucion_id=ejecucion.id,
            parada_id=parada.id if parada else None,
            recolector_id=recolector.id,
            tipo=datos.tipo,
            comentario=datos.comentario.strip(),
            evidencia_url=datos.evidencia_url,
            latitud=datos.latitud,
            longitud=datos.longitud,
        ),
    )
    ejecucion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ejecucion)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.post(
    "/ejecuciones/{ejecucion_id}/finalizar",
    response_model=EjecucionRutaRespuesta,
)
def finalizar_recorrido(
    ejecucion_id: int,
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = obtener_ejecucion_o_error(base_datos, ejecucion_id)
    validar_responsable(ejecucion, recolector)
    if ejecucion.estado != "en_recorrido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El recorrido ya fue cerrado",
        )
    pendiente = base_datos.scalar(
        select(ParadaEjecucionRuta).where(
            ParadaEjecucionRuta.ejecucion_id == ejecucion.id,
            ParadaEjecucionRuta.estado == "pendiente",
        ),
    )
    if pendiente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Atiende u omite todas las paradas antes de finalizar",
        )
    ejecucion.estado = "completada"
    ejecucion.finalizado_en = ahora_utc()
    ejecucion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ejecucion)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.post(
    "/ejecuciones/{ejecucion_id}/cancelar",
    response_model=EjecucionRutaRespuesta,
)
def cancelar_recorrido(
    ejecucion_id: int,
    datos: CancelarEjecucionEntrada,
    recolector: Usuario = Depends(requiere_rol("collector")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ejecucion = obtener_ejecucion_o_error(base_datos, ejecucion_id)
    validar_responsable(ejecucion, recolector)
    if ejecucion.estado != "en_recorrido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El recorrido ya fue cerrado",
        )
    ejecucion.estado = "cancelada"
    ejecucion.motivo_cancelacion = datos.motivo.strip()
    ejecucion.finalizado_en = ahora_utc()
    ejecucion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ejecucion)
    return crear_respuesta_ejecucion(base_datos, ejecucion)


@enrutador.get(
    "/incidencias",
    response_model=list[IncidenciaOperacionRespuesta],
)
def listar_incidencias(
    usuario: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    consulta = select(IncidenciaOperativa).order_by(
        IncidenciaOperativa.creado_en.desc(),
    )
    if usuario.rol != "admin":
        consulta = consulta.where(IncidenciaOperativa.recolector_id == usuario.id)
    incidencias = base_datos.scalars(consulta).all()
    return [respuesta_incidencia(incidencia) for incidencia in incidencias]
