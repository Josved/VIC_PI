from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import modelos
from .autenticacion import enrutador as enrutador_autenticacion
from .base_datos import Base, motor_base_datos

Base.metadata.create_all(bind=motor_base_datos)

aplicacion = FastAPI(title="VIC API")

aplicacion.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

aplicacion.include_router(enrutador_autenticacion)


@aplicacion.get("/")
def revisar_servicio():
    return {"estado": "ok", "servicio": "VIC API"}
