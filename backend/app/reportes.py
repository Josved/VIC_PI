from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import ReporteActualizarEstado, ReporteCrear, ReporteRespuesta
from .modelos import Contenedor, Reporte, Usuario
from .permisos import requiere_rol

enrutador = APIRouter(prefix="/reportes", tags=["reportes"])


@enrutador.post("", response_model=ReporteRespuesta, status_code=status.HTTP_201_CREATED)
def crear_reporte(
    datos: ReporteCrear,
    base_datos: Session = Depends(obtener_base_datos),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    contenedor = base_datos.get(Contenedor, datos.contenedor_id)
    if not contenedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenedor no encontrado",
        )

    reporte = Reporte(
        contenedor_id=datos.contenedor_id,
        usuario_id=usuario_actual.id,
        motivo=datos.motivo,
        comentario=datos.comentario,
    )
    base_datos.add(reporte)
    base_datos.commit()
    base_datos.refresh(reporte)
    return reporte


@enrutador.get("/mios", response_model=list[ReporteRespuesta])
def listar_mis_reportes(
    base_datos: Session = Depends(obtener_base_datos),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    return base_datos.scalars(
        select(Reporte)
        .where(Reporte.usuario_id == usuario_actual.id)
        .order_by(Reporte.creado_en.desc()),
    ).all()


@enrutador.get("", response_model=list[ReporteRespuesta])
def listar_reportes(
    base_datos: Session = Depends(obtener_base_datos),
    _usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
):
    return base_datos.scalars(
        select(Reporte).order_by(Reporte.creado_en.desc()),
    ).all()


@enrutador.patch("/{reporte_id}/estado", response_model=ReporteRespuesta)
def actualizar_estado_reporte(
    reporte_id: int,
    datos: ReporteActualizarEstado,
    base_datos: Session = Depends(obtener_base_datos),
    _usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
):
    reporte = base_datos.get(Reporte, reporte_id)
    if not reporte:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado",
        )

    respuesta = datos.respuesta.strip() if datos.respuesta else None
    if datos.estado == "resuelto" and not (respuesta or reporte.respuesta):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Escribe una respuesta para el ciudadano antes de resolver el reporte",
        )

    reporte.estado = datos.estado
    if respuesta:
        reporte.respuesta = respuesta
    base_datos.commit()
    base_datos.refresh(reporte)
    return reporte
