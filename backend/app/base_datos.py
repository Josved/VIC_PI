from sqlite3 import Connection as ConexionSQLite

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .configuracion import configuracion

es_sqlite = configuracion.url_base_datos.startswith("sqlite")
argumentos_conexion = {}
if es_sqlite:
    argumentos_conexion = {
        "check_same_thread": False,
        "timeout": configuracion.segundos_espera_sqlite,
    }

motor_base_datos = create_engine(
    configuracion.url_base_datos,
    connect_args=argumentos_conexion,
    pool_pre_ping=True,
)


if es_sqlite:
    @event.listens_for(motor_base_datos, "connect")
    def configurar_sqlite(conexion, _registro_conexion):
        if not isinstance(conexion, ConexionSQLite):
            return
        cursor = conexion.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute(
            f"PRAGMA busy_timeout={int(configuracion.segundos_espera_sqlite * 1000)}",
        )
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


SesionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=motor_base_datos,
)


class Base(DeclarativeBase):
    pass


def obtener_base_datos():
    base_datos = SesionLocal()
    try:
        yield base_datos
    finally:
        base_datos.close()
