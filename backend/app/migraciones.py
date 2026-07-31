from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def migrar_esquema(engine: Engine) -> None:
    """Aplica migraciones pequeñas necesarias para bases SQLite existentes."""
    inspector = inspect(engine)
    if "reportes" not in inspector.get_table_names():
        return

    columnas_reportes = {columna["name"] for columna in inspector.get_columns("reportes")}
    if "respuesta" not in columnas_reportes:
        with engine.begin() as conexion:
            conexion.execute(text("ALTER TABLE reportes ADD COLUMN respuesta VARCHAR(1000)"))
