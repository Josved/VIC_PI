from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, delete, select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import (
    ContenedorRutaRespuesta,
    RutaActualizar,
    RutaCrear,
    RutaRespuesta,
)
from .modelos import Contenedor, RutaContenedor, RutaRecoleccion, Usuario, ahora_utc
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
    faltantes = [contenedor_id for contenedor_id in contenedor_ids if contenedor_id not in por_id]
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
    base_datos.execute(delete(RutaContenedor).where(RutaContenedor.ruta_id == ruta_id))
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
    return RutaRespuesta(
        id=ruta.id,
        nombre=ruta.nombre,
        zona=ruta.zona,
        dia_semana=ruta.dia_semana,
        hora_aproximada=ruta.hora_aproximada,
        descripcion=ruta.descripcion,
        activa=ruta.activa,
        creado_por_id=ruta.creado_por_id,
        contenedores=[
            ContenedorRutaRespuesta(
                id=contenedor.id,
                codigo_qr=contenedor.codigo_qr,
                orden=relacion.orden,
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
        consulta = consulta.where(RutaRecoleccion.creado_por_id == usuario_actual.id)
    rutas = base_datos.scalars(consulta).all()
    return [crear_respuesta_ruta(base_datos, ruta) for ruta in rutas]


@enrutador.post("", response_model=RutaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_ruta(
    datos: RutaCrear,
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
    base_datos: Session = Depends(obtener_base_datos),
):
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

    for campo, valor in cambios.items():
        setattr(ruta, campo, valor)
    ruta.actualizado_en = ahora_utc()

    if contenedor_ids is not None:
        guardar_contenedores_de_ruta(base_datos, ruta.id, contenedor_ids)

    base_datos.commit()
    base_datos.refresh(ruta)
    return crear_respuesta_ruta(base_datos, ruta)
