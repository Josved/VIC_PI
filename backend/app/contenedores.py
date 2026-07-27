from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .autenticacion import obtener_usuario_actual
from .base_datos import obtener_base_datos
from .esquemas import ContenedorActualizar, ContenedorCrear, ContenedorRespuesta
from .modelos import Contenedor, Usuario
from .permisos import requiere_rol

enrutador = APIRouter(prefix="/contenedores", tags=["contenedores"])


@enrutador.get("", response_model=list[ContenedorRespuesta])
def listar_contenedores(
    base_datos: Session = Depends(obtener_base_datos),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    return base_datos.scalars(select(Contenedor).where(Contenedor.activo.is_(True))).all()


@enrutador.get("/{contenedor_id}", response_model=ContenedorRespuesta)
def obtener_contenedor(
    contenedor_id: int,
    base_datos: Session = Depends(obtener_base_datos),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor or not contenedor.activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenedor no encontrado")
    return contenedor


@enrutador.post("", response_model=ContenedorRespuesta, status_code=status.HTTP_201_CREATED)
def crear_contenedor(
    datos: ContenedorCrear,
    base_datos: Session = Depends(obtener_base_datos),
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
):
    serie_existente = base_datos.scalar(select(Contenedor).where(Contenedor.serie == datos.serie))
    if serie_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un contenedor con esa serie")

    contenedor = Contenedor(**datos.model_dump())
    base_datos.add(contenedor)
    base_datos.commit()
    base_datos.refresh(contenedor)
    return contenedor


@enrutador.patch("/{contenedor_id}", response_model=ContenedorRespuesta)
def actualizar_contenedor(
    contenedor_id: int,
    datos: ContenedorActualizar,
    base_datos: Session = Depends(obtener_base_datos),
    usuario_actual: Usuario = Depends(requiere_rol("collector", "admin")),
):
    contenedor = base_datos.get(Contenedor, contenedor_id)
    if not contenedor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenedor no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(contenedor, campo, valor)

    base_datos.commit()
    base_datos.refresh(contenedor)
    return contenedor
