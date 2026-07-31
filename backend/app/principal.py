from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import modelos
from .autenticacion import enrutador as enrutador_autenticacion
from .base_datos import Base, motor_base_datos
from .configuracion import configuracion
from .contenedores import enrutador as enrutador_contenedores
from .reportes import enrutador as enrutador_reportes
from .rutas import enrutador as enrutador_rutas

Base.metadata.create_all(bind=motor_base_datos)

aplicacion = FastAPI(
    title=configuracion.nombre_app,
    root_path=configuracion.ruta_raiz,
)

aplicacion.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.origenes_cors,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

aplicacion.include_router(enrutador_autenticacion)
aplicacion.include_router(enrutador_contenedores)
aplicacion.include_router(enrutador_reportes)
aplicacion.include_router(enrutador_rutas)


@aplicacion.get("/")
def revisar_servicio():
    return {"estado": "ok", "servicio": "VIC API"}


@aplicacion.get("/salud", tags=["sistema"])
def revisar_salud():
    return {"estado": "ok"}
