from pathlib import Path
from time import perf_counter

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import text

from . import modelos
from .administracion import enrutador as enrutador_administracion
from .archivos import enrutador as enrutador_archivos
from .autenticacion import enrutador as enrutador_autenticacion
from .base_datos import Base, SesionLocal, motor_base_datos
from .configuracion import configuracion
from .contenedores import enrutador as enrutador_contenedores
from .geografia import enrutador as enrutador_geografia
from .migraciones import migrar_esquema
from .reportes import enrutador as enrutador_reportes
from .rutas import (
    enrutador as enrutador_rutas,
    inicializar_rutas_sin_configuracion,
)
from .operacion import enrutador as enrutador_operacion

Base.metadata.create_all(bind=motor_base_datos)
migrar_esquema(motor_base_datos)
with SesionLocal() as base_datos:
    inicializar_rutas_sin_configuracion(base_datos)

aplicacion = FastAPI(
    title=configuracion.nombre_app,
    root_path=configuracion.ruta_raiz,
)

aplicacion.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.origenes_cors,
    allow_credentials="*" not in configuracion.origenes_cors,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

solicitudes_http = Counter(
    "vic_solicitudes_http_total",
    "Cantidad de solicitudes HTTP procesadas por la API VIC.",
    ["metodo", "ruta", "estado"],
)
duracion_solicitudes_http = Histogram(
    "vic_duracion_solicitudes_http_segundos",
    "Duracion de las solicitudes HTTP procesadas por la API VIC.",
    ["metodo", "ruta"],
)


@aplicacion.middleware("http")
async def registrar_metricas_http(solicitud: Request, siguiente_manejador):
    inicio = perf_counter()
    estado = 500
    try:
        respuesta = await siguiente_manejador(solicitud)
        estado = respuesta.status_code
        return respuesta
    finally:
        ruta_registrada = getattr(solicitud.scope.get("route"), "path", solicitud.url.path)
        if ruta_registrada != "/metricas":
            metodo = solicitud.method
            solicitudes_http.labels(metodo, ruta_registrada, str(estado)).inc()
            duracion_solicitudes_http.labels(metodo, ruta_registrada).observe(
                perf_counter() - inicio,
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
    with SesionLocal() as base_datos:
        base_datos.execute(text("SELECT 1"))
    return {"estado": "ok", "base_datos": "ok"}


@aplicacion.get("/metricas", include_in_schema=False)
def consultar_metricas():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
