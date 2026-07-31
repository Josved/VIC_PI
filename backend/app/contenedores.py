from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import (
    ContenedorRespuesta,
    RegistroContenedorQREntrada,
    RegistroContenedorQRRespuesta,
)
from .modelos import Contenedor, RegistroUbicacionContenedor, Usuario, ahora_utc
from .permisos import requiere_rol

enrutador = APIRouter(prefix="/contenedores", tags=["contenedores"])
RADIO_TIERRA_M = 6_371_000


def calcular_distancia_m(
    latitud_origen: float,
    longitud_origen: float,
    latitud_destino: float,
    longitud_destino: float,
) -> float:
    diferencia_latitud = radians(latitud_destino - latitud_origen)
    diferencia_longitud = radians(longitud_destino - longitud_origen)
    latitud_1 = radians(latitud_origen)
    latitud_2 = radians(latitud_destino)

    haverseno = (
        sin(diferencia_latitud / 2) ** 2
        + cos(latitud_1) * cos(latitud_2) * sin(diferencia_longitud / 2) ** 2
    )
    return 2 * RADIO_TIERRA_M * asin(sqrt(haverseno))


def crear_respuesta(
    contenedor: Contenedor,
    distancia_m: float | None = None,
) -> ContenedorRespuesta:
    return ContenedorRespuesta(
        id=contenedor.id,
        codigo_qr=contenedor.codigo_qr,
        latitud=contenedor.latitud,
        longitud=contenedor.longitud,
        precision_m=contenedor.precision_m,
        distancia_m=round(distancia_m, 1) if distancia_m is not None else None,
        veces_registrado=contenedor.veces_registrado,
        creado_por_id=contenedor.creado_por_id,
        actualizado_por_id=contenedor.actualizado_por_id,
        creado_en=contenedor.creado_en,
        actualizado_en=contenedor.actualizado_en,
    )


@enrutador.post("/registrar-qr", response_model=RegistroContenedorQRRespuesta)
def registrar_contenedor_por_qr(
    datos: RegistroContenedorQREntrada,
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.scalar(
        select(Contenedor).where(Contenedor.codigo_qr == datos.codigo_qr),
    )
    accion = "actualizado"

    if contenedor is None:
        accion = "creado"
        contenedor = Contenedor(
            codigo_qr=datos.codigo_qr,
            latitud=datos.latitud,
            longitud=datos.longitud,
            precision_m=datos.precision_m,
            veces_registrado=1,
            creado_por_id=usuario_actual.id,
            actualizado_por_id=usuario_actual.id,
        )
        base_datos.add(contenedor)
        base_datos.flush()
    else:
        contenedor.latitud = datos.latitud
        contenedor.longitud = datos.longitud
        contenedor.precision_m = datos.precision_m
        contenedor.veces_registrado += 1
        contenedor.actualizado_por_id = usuario_actual.id
        contenedor.actualizado_en = ahora_utc()

    base_datos.add(
        RegistroUbicacionContenedor(
            contenedor_id=contenedor.id,
            usuario_id=usuario_actual.id,
            latitud=datos.latitud,
            longitud=datos.longitud,
            precision_m=datos.precision_m,
        ),
    )
    base_datos.commit()
    base_datos.refresh(contenedor)

    return RegistroContenedorQRRespuesta(
        accion=accion,
        contenedor=crear_respuesta(contenedor, 0),
    )


@enrutador.get("/cercanos", response_model=list[ContenedorRespuesta])
def obtener_contenedores_cercanos(
    latitud: float = Query(ge=-90, le=90),
    longitud: float = Query(ge=-180, le=180),
    radio_m: float = Query(default=5000, gt=0, le=100000),
    limite: int = Query(default=50, ge=1, le=200),
    _usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    resultados: list[tuple[float, Contenedor]] = []

    for contenedor in base_datos.scalars(select(Contenedor)).all():
        distancia = calcular_distancia_m(
            latitud,
            longitud,
            contenedor.latitud,
            contenedor.longitud,
        )
        if distancia <= radio_m:
            resultados.append((distancia, contenedor))

    resultados.sort(key=lambda resultado: resultado[0])
    return [
        crear_respuesta(contenedor, distancia)
        for distancia, contenedor in resultados[:limite]
    ]


@enrutador.get("/{contenedor_id}", response_model=ContenedorRespuesta)
def obtener_contenedor(
    contenedor_id: int,
    _usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )
    return crear_respuesta(contenedor)


@enrutador.get("", response_model=list[ContenedorRespuesta])
def listar_contenedores(
    _usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedores = base_datos.scalars(
        select(Contenedor).order_by(Contenedor.actualizado_en.desc()),
    ).all()
    return [crear_respuesta(contenedor) for contenedor in contenedores]
