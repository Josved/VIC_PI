from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def migrar_esquema(engine: Engine) -> None:
    """Aplica migraciones pequeñas compatibles con bases ya creadas."""
    inspector = inspect(engine)
    tablas = inspector.get_table_names()

    with engine.begin() as conexion:
        if "contenedores" in tablas:
            columnas_contenedores = {
                columna["name"] for columna in inspector.get_columns("contenedores")
            }
            if "activo" not in columnas_contenedores:
                conexion.execute(
                    text(
                        "ALTER TABLE contenedores "
                        "ADD COLUMN activo BOOLEAN NOT NULL DEFAULT 1"
                    ),
                )

        if "reportes" in tablas:
            columnas_reportes = {
                columna["name"] for columna in inspector.get_columns("reportes")
            }
            if "respuesta" not in columnas_reportes:
                conexion.execute(
                    text("ALTER TABLE reportes ADD COLUMN respuesta VARCHAR(1000)"),
                )
            if "atendido_por_id" not in columnas_reportes:
                conexion.execute(
                    text("ALTER TABLE reportes ADD COLUMN atendido_por_id INTEGER"),
                )

        if "paradas_ejecucion_ruta" in tablas:
            columnas_paradas = {
                columna["name"]
                for columna in inspector.get_columns("paradas_ejecucion_ruta")
            }
            if "evidencia_url" not in columnas_paradas:
                conexion.execute(
                    text(
                        "ALTER TABLE paradas_ejecucion_ruta "
                        "ADD COLUMN evidencia_url VARCHAR(300)"
                    ),
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
            if "correo_verificado" not in columnas_control:
                conexion.execute(
                    text(
                        "ALTER TABLE control_usuarios "
                        "ADD COLUMN correo_verificado BOOLEAN NOT NULL DEFAULT 1"
                    ),
                )
