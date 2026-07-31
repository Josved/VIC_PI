from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import modelos
from .administracion import enrutador as enrutador_administracion
from .archivos import enrutador as enrutador_archivos
from .autenticacion import enrutador as enrutador_autenticacion
from .base_datos import Base, SesionLocal, motor_base_datos
from .configuracion import configuracion
from .contenedores import enrutador as enrutador_contenedores
from .geografia import enrutador as enrutador_geografia
from .reportes import enrutador as enrutador_reportes
from .rutas import (
    enrutador as enrutador_rutas,
    inicializar_rutas_sin_configuracion,
)
from .operacion import enrutador as enrutador_operacion

Base.metadata.create_all(bind=motor_base_datos)
with SesionLocal() as base_datos:
    inicializar_rutas_sin_configuracion(base_datos)

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

Path(configuracion.directorio_evidencias).mkdir(parents=True, exist_ok=True)
aplicacion.mount(
    configuracion.url_publica_evidencias,
    StaticFiles(directory=configuracion.directorio_evidencias),
    name="evidencias",
)

aplicacion.include_router(enrutador_autenticacion)
aplicacion.include_router(enrutador_contenedores)
aplicacion.include_router(enrutador_reportes)
aplicacion.include_router(enrutador_rutas)
aplicacion.include_router(enrutador_administracion)
aplicacion.include_router(enrutador_operacion)
aplicacion.include_router(enrutador_geografia)
aplicacion.include_router(enrutador_archivos)


@aplicacion.get("/")
def revisar_servicio():
    return {"estado": "ok", "servicio": "VIC API"}


@aplicacion.get("/salud", tags=["sistema"])
def revisar_salud():
    return {"estado": "ok"}
