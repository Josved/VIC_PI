from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import (
    ContenedorActualizar,
    ContenedorRespuesta,
    RegistroContenedorQREntrada,
    RegistroContenedorQRRespuesta,
    RegistroUbicacionContenedorActualizar,
    RegistroUbicacionContenedorCrear,
    RegistroUbicacionContenedorRespuesta,
)
from .modelos import (
    Contenedor,
    DetalleContenedor,
    RegistroUbicacionContenedor,
    Usuario,
    ahora_utc,
)
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
    base_datos: Session,
    contenedor: Contenedor,
    distancia_m: float | None = None,
) -> ContenedorRespuesta:
    detalle = base_datos.get(DetalleContenedor, contenedor.id)
    return ContenedorRespuesta(
        id=contenedor.id,
        codigo_qr=contenedor.codigo_qr,
        latitud=contenedor.latitud,
        longitud=contenedor.longitud,
        precision_m=contenedor.precision_m,
        distancia_m=round(distancia_m, 1) if distancia_m is not None else None,
        direccion_completa=detalle.direccion_completa if detalle else None,
        calle=detalle.calle if detalle else None,
        numero=detalle.numero if detalle else None,
        colonia=detalle.colonia if detalle else None,
        codigo_postal=detalle.codigo_postal if detalle else None,
        municipio=detalle.municipio if detalle else None,
        veces_registrado=contenedor.veces_registrado,
        creado_por_id=contenedor.creado_por_id,
        actualizado_por_id=contenedor.actualizado_por_id,
        creado_en=contenedor.creado_en,
        actualizado_en=contenedor.actualizado_en,
    )


@enrutador.post("/registrar-qr", response_model=RegistroContenedorQRRespuesta)
def registrar_contenedor_por_qr(
    datos: RegistroContenedorQREntrada,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
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
    campos_direccion = {
        "direccion_completa": datos.direccion_completa,
        "calle": datos.calle,
        "numero": datos.numero,
        "colonia": datos.colonia,
        "codigo_postal": datos.codigo_postal,
        "municipio": datos.municipio,
    }
    if any(campos_direccion.values()):
        detalle = base_datos.get(DetalleContenedor, contenedor.id)
        if not detalle:
            detalle = DetalleContenedor(contenedor_id=contenedor.id)
            base_datos.add(detalle)
        for campo, valor in campos_direccion.items():
            if valor is not None:
                setattr(detalle, campo, valor.strip() or None)
        detalle.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(contenedor)

    return RegistroContenedorQRRespuesta(
        accion=accion,
        contenedor=crear_respuesta(base_datos, contenedor, 0),
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
        crear_respuesta(base_datos, contenedor, distancia)
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
    return crear_respuesta(base_datos, contenedor)


@enrutador.get(
    "/{contenedor_id}/registros",
    response_model=list[RegistroUbicacionContenedorRespuesta],
)
def listar_registros_contenedor(
    contenedor_id: int,
    _usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )

    registros = base_datos.scalars(
        select(RegistroUbicacionContenedor)
        .where(RegistroUbicacionContenedor.contenedor_id == contenedor_id)
        .order_by(RegistroUbicacionContenedor.registrado_en.desc()),
    ).all()
    return registros


@enrutador.post(
    "/{contenedor_id}/registros",
    response_model=RegistroUbicacionContenedorRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_registro_contenedor(
    contenedor_id: int,
    datos: RegistroUbicacionContenedorCrear,
    _administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )

    registro = RegistroUbicacionContenedor(
        contenedor_id=contenedor.id,
        usuario_id=_administrador.id,
        latitud=datos.latitud,
        longitud=datos.longitud,
        precision_m=datos.precision_m,
    )
    base_datos.add(registro)
    base_datos.commit()
    base_datos.refresh(registro)
    return registro


@enrutador.patch(
    "/{contenedor_id}/registros/{registro_id}",
    response_model=RegistroUbicacionContenedorRespuesta,
)
def actualizar_registro_contenedor(
    contenedor_id: int,
    registro_id: int,
    datos: RegistroUbicacionContenedorActualizar,
    _administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )

    registro = base_datos.get(RegistroUbicacionContenedor, registro_id)
    if not registro or registro.contenedor_id != contenedor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado",
        )

    cambios = datos.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(registro, campo, valor)
    base_datos.commit()
    base_datos.refresh(registro)
    return registro


@enrutador.delete("/{contenedor_id}/registros/{registro_id}")
def eliminar_registro_contenedor(
    contenedor_id: int,
    registro_id: int,
    _administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )

    registro = base_datos.get(RegistroUbicacionContenedor, registro_id)
    if not registro or registro.contenedor_id != contenedor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado",
        )

    base_datos.delete(registro)
    base_datos.commit()
    return {"mensaje": "Registro eliminado"}


@enrutador.patch("/{contenedor_id}", response_model=ContenedorRespuesta)
def actualizar_contenedor(
    contenedor_id: int,
    datos: ContenedorActualizar,
    _administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )

    cambios = datos.model_dump(exclude_unset=True)
    if "latitud" in cambios:
        contenedor.latitud = cambios["latitud"]
    if "longitud" in cambios:
        contenedor.longitud = cambios["longitud"]
    if "precision_m" in cambios:
        contenedor.precision_m = cambios["precision_m"]
    if cambios:
        contenedor.actualizado_en = ahora_utc()
        contenedor.actualizado_por_id = _administrador.id

    campos_direccion = {
        "direccion_completa": cambios.get("direccion_completa"),
        "calle": cambios.get("calle"),
        "numero": cambios.get("numero"),
        "colonia": cambios.get("colonia"),
        "codigo_postal": cambios.get("codigo_postal"),
        "municipio": cambios.get("municipio"),
    }
    if any(value is not None for value in campos_direccion.values()):
        detalle = base_datos.get(DetalleContenedor, contenedor.id)
        if not detalle:
            detalle = DetalleContenedor(contenedor_id=contenedor.id)
            base_datos.add(detalle)
        for campo, valor in campos_direccion.items():
            if valor is not None:
                setattr(detalle, campo, valor.strip() or None)
        detalle.actualizado_en = ahora_utc()

    base_datos.commit()
    base_datos.refresh(contenedor)
    return crear_respuesta(base_datos, contenedor)


@enrutador.delete("/{contenedor_id}")
def eliminar_contenedor(
    contenedor_id: int,
    _administrador: Usuario = Depends(requiere_rol("admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )
    base_datos.delete(contenedor)
    base_datos.commit()
    return {"mensaje": "Contenedor eliminado"}


@enrutador.get("", response_model=list[ContenedorRespuesta])
def listar_contenedores(
    _usuario_actual: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    contenedores = base_datos.scalars(
        select(Contenedor).order_by(Contenedor.actualizado_en.desc()),
    ).all()
    return [crear_respuesta(base_datos, contenedor) for contenedor in contenedores]
