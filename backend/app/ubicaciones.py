from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import (
    UbicacionGuardadaActualizar,
    UbicacionGuardadaCrear,
    UbicacionGuardadaRespuesta,
)
from .modelos import UbicacionGuardadaUsuario, Usuario, ahora_utc

enrutador = APIRouter(prefix="/ubicaciones", tags=["ubicaciones"])


def obtener_propia_o_error(
    base_datos: Session,
    ubicacion_id: int,
    usuario: Usuario,
) -> UbicacionGuardadaUsuario:
    ubicacion = base_datos.get(UbicacionGuardadaUsuario, ubicacion_id)
    if not ubicacion or ubicacion.usuario_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicación guardada no encontrada",
        )
    return ubicacion


@enrutador.get("/mias", response_model=list[UbicacionGuardadaRespuesta])
def listar_ubicaciones(
    incluir_inactivas: bool = Query(default=False),
    usuario: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    consulta = select(UbicacionGuardadaUsuario).where(
        UbicacionGuardadaUsuario.usuario_id == usuario.id,
    )
    if not incluir_inactivas:
        consulta = consulta.where(UbicacionGuardadaUsuario.activa.is_(True))
    return base_datos.scalars(
        consulta.order_by(UbicacionGuardadaUsuario.nombre),
    ).all()


@enrutador.post(
    "",
    response_model=UbicacionGuardadaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def guardar_ubicacion(
    datos: UbicacionGuardadaCrear,
    usuario: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    ubicacion = UbicacionGuardadaUsuario(
        usuario_id=usuario.id,
        **datos.model_dump(),
    )
    base_datos.add(ubicacion)
    base_datos.commit()
    base_datos.refresh(ubicacion)
    return ubicacion


@enrutador.patch("/{ubicacion_id}", response_model=UbicacionGuardadaRespuesta)
def actualizar_ubicacion(
    ubicacion_id: int,
    datos: UbicacionGuardadaActualizar,
    usuario: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    ubicacion = obtener_propia_o_error(base_datos, ubicacion_id, usuario)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(ubicacion, campo, valor)
    ubicacion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ubicacion)
    return ubicacion


@enrutador.delete("/{ubicacion_id}", response_model=UbicacionGuardadaRespuesta)
def eliminar_ubicacion(
    ubicacion_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    ubicacion = obtener_propia_o_error(base_datos, ubicacion_id, usuario)
    ubicacion.activa = False
    ubicacion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ubicacion)
    return ubicacion


@enrutador.post("/{ubicacion_id}/restaurar", response_model=UbicacionGuardadaRespuesta)
def restaurar_ubicacion(
    ubicacion_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    base_datos: Session = Depends(obtener_base_datos),
):
    ubicacion = obtener_propia_o_error(base_datos, ubicacion_id, usuario)
    ubicacion.activa = True
    ubicacion.actualizado_en = ahora_utc()
    base_datos.commit()
    base_datos.refresh(ubicacion)
    return ubicacion
