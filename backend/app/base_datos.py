from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .configuracion import configuracion

argumentos_conexion = (
    {"check_same_thread": False}
    if configuracion.url_base_datos.startswith("sqlite")
    else {}
)

motor_base_datos = create_engine(
    configuracion.url_base_datos,
    connect_args=argumentos_conexion,
)

SesionLocal = sessionmaker(autocommit=False, autoflush=False, bind=motor_base_datos)


class Base(DeclarativeBase):
    pass


def obtener_base_datos():
    base_datos = SesionLocal()
    try:
        yield base_datos
    finally:
        base_datos.close()
