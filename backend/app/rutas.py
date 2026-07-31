import json
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, delete, or_, select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .enrutamiento import calcular_recorrido, distancia_metros, optimizar_orden_puntos
from .esquemas import (
    ContenedorRutaRespuesta,
    CoordenadaRutaRespuesta,
    OperacionRutaResumenRespuesta,
    PuntoRutaRespuesta,
    RutaActualizar,
    RutaCrear,
    RutaRespuesta,
    UsuarioRutaRespuesta,
    VehiculoRespuesta,
)
from .modelos import (
    AsignacionRuta,
    ConfiguracionRutaVial,
    Contenedor,
    ControlUsuario,
    DetalleContenedor,
    EjecucionRuta,
    ParadaEjecucionRuta,
    PuntoRuta,
    RutaContenedor,
    RutaRecoleccion,
    Usuario,
    Vehiculo,
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


def direccion_contenedor(base_datos: Session, contenedor_id: int) -> str | None:
    detalle = base_datos.get(DetalleContenedor, contenedor_id)
    return detalle.direccion_completa if detalle else None


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


def obtener_recolector_valido(base_datos: Session, recolector_id: int) -> Usuario:
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


def obtener_vehiculo_valido(
    base_datos: Session,
    vehiculo_id: int | None,
) -> Vehiculo | None:
    if vehiculo_id is None:
        return None
    vehiculo = base_datos.get(Vehiculo, vehiculo_id)
    if not vehiculo or not vehiculo.activo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El vehiculo seleccionado no existe o esta inactivo",
        )
    return vehiculo


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


def construir_puntos(
    base_datos: Session,
    contenedor_ids: list[int],
    puntos_entrada: list | None,
) -> list[dict]:
    contenedores = obtener_contenedores_validos(base_datos, contenedor_ids)
    if puntos_entrada:
        puntos = [
            punto.model_dump() if hasattr(punto, "model_dump") else dict(punto)
            for punto in puntos_entrada
        ]
        ids_en_puntos = [
            punto["contenedor_id"]
            for punto in puntos
            if punto["tipo"] == "contenedor"
        ]
        if set(ids_en_puntos) != set(contenedor_ids) or len(ids_en_puntos) != len(
            contenedor_ids,
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La secuencia debe incluir una vez cada contenedor seleccionado",
            )
        for punto in puntos:
            if punto["tipo"] == "contenedor":
                contenedor = contenedores[punto["contenedor_id"]]
                punto["latitud"] = contenedor.latitud
                punto["longitud"] = contenedor.longitud
                punto["direccion"] = (
                    punto.get("direccion")
                    or direccion_contenedor(base_datos, contenedor.id)
                )
        return puntos

    return [
        {
            "tipo": "contenedor",
            "contenedor_id": contenedor_id,
            "latitud": contenedores[contenedor_id].latitud,
            "longitud": contenedores[contenedor_id].longitud,
            "direccion": direccion_contenedor(base_datos, contenedor_id),
        }
        for contenedor_id in contenedor_ids
    ]


def guardar_configuracion_vial(
    base_datos: Session,
    ruta_id: int,
    contenedor_ids: list[int],
    puntos_entrada: list | None,
    vehiculo_id: int | None,
    optimizar: bool,
) -> None:
    obtener_vehiculo_valido(base_datos, vehiculo_id)
    puntos = construir_puntos(base_datos, contenedor_ids, puntos_entrada)
    if optimizar:
        puntos = optimizar_orden_puntos(puntos)

    orden_contenedores = [
        punto["contenedor_id"]
        for punto in puntos
        if punto["tipo"] == "contenedor"
    ]
    guardar_contenedores_de_ruta(base_datos, ruta_id, orden_contenedores)

    calculo = calcular_recorrido(puntos)
    duraciones = calculo["duraciones_tramos_s"]
    acumulado_s = 0.0

    base_datos.execute(delete(PuntoRuta).where(PuntoRuta.ruta_id == ruta_id))
    for indice, punto in enumerate(puntos, start=1):
        if indice > 1 and indice - 2 < len(duraciones):
            acumulado_s += duraciones[indice - 2]
        base_datos.add(
            PuntoRuta(
                ruta_id=ruta_id,
                tipo=punto["tipo"],
                orden=indice,
                contenedor_id=punto.get("contenedor_id"),
                latitud=punto["latitud"],
                longitud=punto["longitud"],
                direccion=punto.get("direccion"),
                eta_minutos=ceil(acumulado_s / 60),
            ),
        )

    configuracion_vial = base_datos.get(ConfiguracionRutaVial, ruta_id)
    if not configuracion_vial:
        configuracion_vial = ConfiguracionRutaVial(ruta_id=ruta_id)
        base_datos.add(configuracion_vial)
    configuracion_vial.vehiculo_id = vehiculo_id
    configuracion_vial.geometria_json = json.dumps(calculo["geometria"])
    configuracion_vial.distancia_m = calculo["distancia_m"]
    configuracion_vial.duracion_s = calculo["duracion_s"]
    configuracion_vial.proveedor = calculo["proveedor"]
    configuracion_vial.estado_calculo = calculo["estado"]
    configuracion_vial.detalle_calculo = calculo["detalle"]
    configuracion_vial.calculado_en = ahora_utc()
    configuracion_vial.actualizado_en = ahora_utc()


def recalcular_configuracion_existente(
    base_datos: Session,
    ruta_id: int,
) -> None:
    puntos = base_datos.scalars(
        select(PuntoRuta)
        .where(PuntoRuta.ruta_id == ruta_id)
        .order_by(PuntoRuta.orden),
    ).all()
    relaciones = base_datos.scalars(
        select(RutaContenedor)
        .where(RutaContenedor.ruta_id == ruta_id)
        .order_by(RutaContenedor.orden),
    ).all()
    configuracion_vial = base_datos.get(ConfiguracionRutaVial, ruta_id)
    guardar_configuracion_vial(
        base_datos,
        ruta_id,
        [relacion.contenedor_id for relacion in relaciones],
        [
            {
                "tipo": punto.tipo,
                "contenedor_id": punto.contenedor_id,
                "latitud": punto.latitud,
                "longitud": punto.longitud,
                "direccion": punto.direccion,
            }
            for punto in puntos
        ]
        or None,
        configuracion_vial.vehiculo_id if configuracion_vial else None,
        False,
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
        select(ParadaEjecucionRuta)
        .where(ParadaEjecucionRuta.ejecucion_id == ejecucion.id)
        .order_by(ParadaEjecucionRuta.orden),
    ).all()
    atendidas = sum(parada.estado != "pendiente" for parada in paradas)
    total = len(paradas)
    progreso = round((atendidas / total) * 100) if total else 0
    distancia_siguiente = None
    eta_siguiente = None
    siguiente = next((parada for parada in paradas if parada.estado == "pendiente"), None)
    if (
        siguiente
        and ejecucion.latitud_actual is not None
        and ejecucion.longitud_actual is not None
    ):
        contenedor = base_datos.get(Contenedor, siguiente.contenedor_id)
        distancia_siguiente = distancia_metros(
            {
                "latitud": ejecucion.latitud_actual,
                "longitud": ejecucion.longitud_actual,
            },
            {"latitud": contenedor.latitud, "longitud": contenedor.longitud},
        )
        eta_siguiente = max(1, ceil(distancia_siguiente / (25_000 / 60)))

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
        eta_siguiente_minutos=eta_siguiente,
        distancia_siguiente_m=(
            round(distancia_siguiente, 1)
            if distancia_siguiente is not None
            else None
        ),
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
        base_datos.get(Usuario, asignacion.recolector_id) if asignacion else None
    )
    configuracion_vial = base_datos.get(ConfiguracionRutaVial, ruta.id)
    vehiculo = (
        base_datos.get(Vehiculo, configuracion_vial.vehiculo_id)
        if configuracion_vial and configuracion_vial.vehiculo_id
        else None
    )
    puntos = base_datos.scalars(
        select(PuntoRuta)
        .where(PuntoRuta.ruta_id == ruta.id)
        .order_by(PuntoRuta.orden),
    ).all()
    puntos_por_contenedor = {
        punto.contenedor_id: punto for punto in puntos if punto.contenedor_id
    }
    geometria = []
    if configuracion_vial and configuracion_vial.geometria_json:
        try:
            geometria = json.loads(configuracion_vial.geometria_json)
        except json.JSONDecodeError:
            geometria = []

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
        vehiculo=VehiculoRespuesta.model_validate(vehiculo) if vehiculo else None,
        operacion=calcular_operacion(base_datos, ruta.id),
        contenedores=[
            ContenedorRutaRespuesta(
                id=contenedor.id,
                codigo_qr=contenedor.codigo_qr,
                orden=relacion.orden,
                latitud=contenedor.latitud,
                longitud=contenedor.longitud,
                direccion=direccion_contenedor(base_datos, contenedor.id),
                eta_minutos=(
                    puntos_por_contenedor[contenedor.id].eta_minutos
                    if contenedor.id in puntos_por_contenedor
                    else None
                ),
            )
            for relacion, contenedor in filas
        ],
        puntos_ruta=[
            PuntoRutaRespuesta(
                id=punto.id,
                tipo=punto.tipo,
                orden=punto.orden,
                contenedor_id=punto.contenedor_id,
                latitud=punto.latitud,
                longitud=punto.longitud,
                direccion=punto.direccion,
                eta_minutos=punto.eta_minutos,
            )
            for punto in puntos
        ],
        geometria=[
            CoordenadaRutaRespuesta(
                latitud=punto["latitud"],
                longitud=punto["longitud"],
            )
            for punto in geometria
        ],
        distancia_m=configuracion_vial.distancia_m if configuracion_vial else None,
        duracion_minutos=(
            ceil(configuracion_vial.duracion_s / 60)
            if configuracion_vial and configuracion_vial.duracion_s is not None
            else None
        ),
        proveedor_ruta=(
            configuracion_vial.proveedor if configuracion_vial else "sin_calcular"
        ),
        estado_calculo_ruta=(
            configuracion_vial.estado_calculo if configuracion_vial else "pendiente"
        ),
        detalle_calculo_ruta=(
            configuracion_vial.detalle_calculo if configuracion_vial else None
        ),
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


def inicializar_rutas_sin_configuracion(base_datos: Session) -> int:
    rutas = base_datos.scalars(
        select(RutaRecoleccion).where(
            ~RutaRecoleccion.id.in_(select(ConfiguracionRutaVial.ruta_id)),
        ),
    ).all()
    migradas = 0
    for ruta in rutas:
        relaciones = base_datos.scalars(
            select(RutaContenedor)
            .where(RutaContenedor.ruta_id == ruta.id)
            .order_by(RutaContenedor.orden),
        ).all()
        if not relaciones:
            continue
        guardar_configuracion_vial(
            base_datos,
            ruta.id,
            [relacion.contenedor_id for relacion in relaciones],
            None,
            None,
            False,
        )
        migradas += 1
    if migradas:
        base_datos.commit()
    return migradas


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
    guardar_asignacion(base_datos, ruta.id, recolector_id, usuario_actual.id)
    guardar_configuracion_vial(
        base_datos,
        ruta.id,
        datos.contenedor_ids,
        datos.puntos_ruta,
        datos.vehiculo_id,
        datos.optimizar_orden,
    )
    base_datos.commit()
    base_datos.refresh(ruta)
    return crear_respuesta_ruta(base_datos, ruta)


@enrutador.post("/{ruta_id}/recalcular", response_model=RutaRespuesta)
def recalcular_ruta(
    ruta_id: int,
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    ruta = obtener_ruta_o_error(base_datos, ruta_id)
    validar_gestion(ruta, usuario_actual)
    recalcular_configuracion_existente(base_datos, ruta.id)
    ruta.actualizado_en = ahora_utc()
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
    puntos_ruta = cambios.pop("puntos_ruta", None)
    optimizar_orden = cambios.pop("optimizar_orden", False)
    vehiculo_presente = "vehiculo_id" in cambios
    vehiculo_id = cambios.pop("vehiculo_id", None)

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
        guardar_asignacion(base_datos, ruta.id, recolector_id, usuario_actual.id)

    for campo, valor in cambios.items():
        setattr(ruta, campo, valor)
    ruta.actualizado_en = ahora_utc()

    relaciones_actuales = base_datos.scalars(
        select(RutaContenedor)
        .where(RutaContenedor.ruta_id == ruta.id)
        .order_by(RutaContenedor.orden),
    ).all()
    ids_finales = contenedor_ids or [
        relacion.contenedor_id for relacion in relaciones_actuales
    ]
    configuracion_actual = base_datos.get(ConfiguracionRutaVial, ruta.id)
    vehiculo_final = (
        vehiculo_id
        if vehiculo_presente
        else configuracion_actual.vehiculo_id
        if configuracion_actual
        else None
    )
    necesita_recalculo = (
        contenedor_ids is not None
        or puntos_ruta is not None
        or bool(optimizar_orden)
        or vehiculo_presente
        or configuracion_actual is None
    )
    if necesita_recalculo:
        if puntos_ruta is None and contenedor_ids is None:
            puntos_actuales = base_datos.scalars(
                select(PuntoRuta)
                .where(PuntoRuta.ruta_id == ruta.id)
                .order_by(PuntoRuta.orden),
            ).all()
            puntos_ruta = [
                {
                    "tipo": punto.tipo,
                    "contenedor_id": punto.contenedor_id,
                    "latitud": punto.latitud,
                    "longitud": punto.longitud,
                    "direccion": punto.direccion,
                }
                for punto in puntos_actuales
            ] or None
        guardar_configuracion_vial(
            base_datos,
            ruta.id,
            ids_finales,
            puntos_ruta,
            vehiculo_final,
            bool(optimizar_orden),
        )

    base_datos.commit()
    base_datos.refresh(ruta)
    return crear_respuesta_ruta(base_datos, ruta)
