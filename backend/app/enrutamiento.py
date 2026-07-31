import json
from math import asin, cos, radians, sin, sqrt
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .configuracion import configuracion

RADIO_TIERRA_M = 6_371_000
VELOCIDAD_RESPALDO_M_S = 25_000 / 3_600


def distancia_metros(origen: dict, destino: dict) -> float:
    latitud_1 = radians(origen["latitud"])
    latitud_2 = radians(destino["latitud"])
    diferencia_latitud = radians(destino["latitud"] - origen["latitud"])
    diferencia_longitud = radians(destino["longitud"] - origen["longitud"])
    valor = (
        sin(diferencia_latitud / 2) ** 2
        + cos(latitud_1)
        * cos(latitud_2)
        * sin(diferencia_longitud / 2) ** 2
    )
    return 2 * RADIO_TIERRA_M * asin(sqrt(valor))


def optimizar_orden_puntos(puntos: list[dict]) -> list[dict]:
    """Optimiza contenedores cuando no hay pasos manuales que deban respetarse."""
    if len(puntos) < 3 or any(punto["tipo"] == "paso" for punto in puntos):
        return puntos

    inicio = puntos[0] if puntos[0]["tipo"] == "inicio" else None
    fin = puntos[-1] if puntos[-1]["tipo"] == "fin" else None
    candidatos = [
        punto
        for punto in puntos
        if punto is not inicio and punto is not fin
    ]
    if len(candidatos) < 2:
        return puntos

    actual = inicio or candidatos.pop(0)
    resultado = [actual]
    while candidatos:
        siguiente = min(
            candidatos,
            key=lambda punto: distancia_metros(actual, punto),
        )
        candidatos.remove(siguiente)
        resultado.append(siguiente)
        actual = siguiente
    if fin:
        resultado.append(fin)
    return resultado


def _recorrido_respaldo(puntos: list[dict], detalle: str) -> dict:
    distancia = 0.0
    duraciones = []
    for origen, destino in zip(puntos, puntos[1:]):
        distancia_tramo = distancia_metros(origen, destino)
        distancia += distancia_tramo
        duraciones.append(distancia_tramo / VELOCIDAD_RESPALDO_M_S)
    return {
        "geometria": [
            {"latitud": punto["latitud"], "longitud": punto["longitud"]}
            for punto in puntos
        ],
        "distancia_m": round(distancia, 1),
        "duracion_s": round(sum(duraciones), 1),
        "duraciones_tramos_s": duraciones,
        "proveedor": "respaldo_lineal",
        "estado": "respaldo",
        "detalle": detalle,
    }


def calcular_recorrido(puntos: list[dict]) -> dict:
    if not puntos:
        return _recorrido_respaldo([], "La ruta no contiene puntos")
    if len(puntos) == 1:
        return _recorrido_respaldo(
            puntos,
            "Se requiere un segundo punto para calcular calles",
        )

    coordenadas = ";".join(
        f"{punto['longitud']},{punto['latitud']}" for punto in puntos
    )
    parametros = urlencode(
        {
            "overview": "full",
            "geometries": "geojson",
            "steps": "false",
        },
    )
    url = (
        f"{configuracion.url_enrutamiento}/route/v1/driving/"
        f"{coordenadas}?{parametros}"
    )
    solicitud = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "VIC-PI/1.0",
        },
    )
    try:
        with urlopen(
            solicitud,
            timeout=configuracion.segundos_espera_servicios,
        ) as respuesta:
            datos = json.loads(respuesta.read().decode("utf-8"))
        if datos.get("code") != "Ok" or not datos.get("routes"):
            raise ValueError(datos.get("message") or "OSRM no encontro una ruta")
        ruta = datos["routes"][0]
        geometria = [
            {"latitud": coordenada[1], "longitud": coordenada[0]}
            for coordenada in ruta["geometry"]["coordinates"]
        ]
        return {
            "geometria": geometria,
            "distancia_m": round(ruta["distance"], 1),
            "duracion_s": round(ruta["duration"], 1),
            "duraciones_tramos_s": [
                tramo.get("duration", 0) for tramo in ruta.get("legs", [])
            ],
            "proveedor": "osrm_openstreetmap",
            "estado": "calculada",
            "detalle": None,
        }
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as error:
        return _recorrido_respaldo(
            puntos,
            f"No se pudo consultar OSRM: {str(error)[:220]}",
        )
