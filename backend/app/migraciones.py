from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def migrar_esquema(engine: Engine) -> None:
    """Aplica migraciones pequeñas compatibles con bases ya creadas."""
    inspector = inspect(engine)
    tablas = inspector.get_table_names()

    with engine.begin() as conexion:
        if "reportes" in tablas:
            columnas_reportes = {
                columna["name"] for columna in inspector.get_columns("reportes")
            }
            if "respuesta" not in columnas_reportes:
                conexion.execute(
                    text("ALTER TABLE reportes ADD COLUMN respuesta VARCHAR(1000)"),
                )

        if "control_usuarios" in tablas:
            columnas_control = {
                columna["name"] for columna in inspector.get_columns("control_usuarios")
            }
            if "version_sesion" not in columnas_control:
                conexion.execute(
                    text(
                        "ALTER TABLE control_usuarios "
                        "ADD COLUMN version_sesion INTEGER NOT NULL DEFAULT 1"
                    ),
                )
