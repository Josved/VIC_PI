import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query, status

from .autenticacion import obtener_usuario_actual
from .configuracion import configuracion
from .esquemas import BusquedaDireccionRespuesta
from .modelos import Usuario

enrutador = APIRouter(prefix="/geografia", tags=["geografia"])


def _consultar(ruta: str, parametros: dict) -> object:
    parametros = {
        **parametros,
        "format": "jsonv2",
        "addressdetails": 1,
        "accept-language": "es",
    }
    solicitud = Request(
        f"{configuracion.url_geocodificacion}/{ruta}?{urlencode(parametros)}",
        headers={
            "Accept": "application/json",
            "User-Agent": "VIC-PI/1.0 contacto-local",
        },
    )
    try:
        with urlopen(
            solicitud,
            timeout=configuracion.segundos_espera_servicios,
        ) as respuesta:
            return json.loads(respuesta.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No fue posible consultar direcciones: {str(error)[:180]}",
        ) from error


def _normalizar(resultado: dict) -> BusquedaDireccionRespuesta:
    direccion = resultado.get("address") or {}
    calle = (
        direccion.get("road")
        or direccion.get("pedestrian")
        or direccion.get("residential")
        or direccion.get("path")
    )
    colonia = (
        direccion.get("neighbourhood")
        or direccion.get("suburb")
        or direccion.get("quarter")
    )
    municipio = (
        direccion.get("city")
        or direccion.get("town")
        or direccion.get("municipality")
        or direccion.get("county")
    )
    return BusquedaDireccionRespuesta(
        direccion_completa=resultado.get("display_name") or "Dirección sin nombre",
        latitud=float(resultado["lat"]),
        longitud=float(resultado["lon"]),
        calle=calle,
        numero=direccion.get("house_number"),
        colonia=colonia,
        codigo_postal=direccion.get("postcode"),
        municipio=municipio,
    )


@enrutador.get("/direccion", response_model=BusquedaDireccionRespuesta)
def obtener_direccion(
    latitud: float = Query(ge=-90, le=90),
    longitud: float = Query(ge=-180, le=180),
    _usuario: Usuario = Depends(obtener_usuario_actual),
):
    resultado = _consultar(
        "reverse",
        {"lat": latitud, "lon": longitud, "zoom": 18},
    )
    return _normalizar(resultado)


@enrutador.get("/buscar", response_model=list[BusquedaDireccionRespuesta])
def buscar_direccion(
    texto: str = Query(min_length=3, max_length=180),
    limite: int = Query(default=5, ge=1, le=10),
    _usuario: Usuario = Depends(obtener_usuario_actual),
):
    resultados = _consultar(
        "search",
        {"q": texto, "limit": limite, "countrycodes": "mx"},
    )
    return [_normalizar(resultado) for resultado in resultados]
