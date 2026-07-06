from pydantic import BaseModel


class Configuracion(BaseModel):
    nombre_app: str = "VIC API"
    url_base_datos: str = "sqlite:///./vic.db"
    secreto_jwt: str = "change-this-secret-before-production"
    algoritmo_jwt: str = "HS256"
    minutos_expiracion_token: int = 60 * 24


configuracion = Configuracion()
