import os
import tempfile
import unittest
from pathlib import Path

directorio_temporal = tempfile.TemporaryDirectory()
ruta_base_datos = Path(directorio_temporal.name) / "vic-pruebas.db"
os.environ["VIC_DATABASE_URL"] = f"sqlite:///{ruta_base_datos.as_posix()}"
os.environ["VIC_JWT_SECRET"] = "secreto-exclusivo-para-pruebas"

from starlette.testclient import TestClient

from app.base_datos import SesionLocal, motor_base_datos
from app.modelos import RegistroUbicacionContenedor
from app.principal import aplicacion


class PruebasContenedores(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cliente = TestClient(aplicacion)
        respuesta = cls.cliente.post(
            "/autenticacion/registro",
            json={
                "nombre": "Usuario",
                "apellidos": "Pruebas",
                "correo": "mapas@example.com",
                "contrasena": "Prueba123!",
                "rol": "citizen",
            },
        )
        assert respuesta.status_code == 201, respuesta.text
        cls.encabezados = {
            "Authorization": f"Bearer {respuesta.json()['token_acceso']}",
        }

    @classmethod
    def tearDownClass(cls):
        cls.cliente.close()
        motor_base_datos.dispose()
        directorio_temporal.cleanup()

    def test_qr_crea_actualiza_historial_y_cercania(self):
        codigo = "VIC:CONTENEDOR:PRUEBA-001"

        creacion = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados,
            json={
                "codigo_qr": codigo,
                "latitud": 19.4326,
                "longitud": -99.1332,
                "precision_m": 5.5,
            },
        )
        self.assertEqual(creacion.status_code, 200, creacion.text)
        self.assertEqual(creacion.json()["accion"], "creado")
        id_contenedor = creacion.json()["contenedor"]["id"]

        actualizacion = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados,
            json={
                "codigo_qr": codigo,
                "latitud": 19.4330,
                "longitud": -99.1330,
                "precision_m": 4.0,
            },
        )
        self.assertEqual(actualizacion.status_code, 200, actualizacion.text)
        self.assertEqual(actualizacion.json()["accion"], "actualizado")
        self.assertEqual(actualizacion.json()["contenedor"]["id"], id_contenedor)
        self.assertEqual(actualizacion.json()["contenedor"]["veces_registrado"], 2)
        self.assertEqual(actualizacion.json()["contenedor"]["latitud"], 19.4330)

        lejano = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados,
            json={
                "codigo_qr": "VIC:CONTENEDOR:LEJANO",
                "latitud": 20.6767,
                "longitud": -103.3475,
                "precision_m": 8,
            },
        )
        self.assertEqual(lejano.status_code, 200, lejano.text)

        cercanos = self.cliente.get(
            "/contenedores/cercanos",
            headers=self.encabezados,
            params={
                "latitud": 19.4330,
                "longitud": -99.1330,
                "radio_m": 500,
            },
        )
        self.assertEqual(cercanos.status_code, 200, cercanos.text)
        self.assertEqual([item["codigo_qr"] for item in cercanos.json()], [codigo])
        self.assertEqual(cercanos.json()[0]["distancia_m"], 0)

        with SesionLocal() as base_datos:
            registros = base_datos.query(RegistroUbicacionContenedor).filter_by(
                contenedor_id=id_contenedor,
            ).count()
        self.assertEqual(registros, 2)

    def test_coordenadas_invalidas_son_rechazadas(self):
        respuesta = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados,
            json={
                "codigo_qr": "VIC:INVALIDO",
                "latitud": 91,
                "longitud": 0,
            },
        )
        self.assertEqual(respuesta.status_code, 422)

    def test_autenticacion_es_obligatoria(self):
        respuesta = self.cliente.get(
            "/contenedores/cercanos",
            params={"latitud": 19.4326, "longitud": -99.1332},
        )
        self.assertEqual(respuesta.status_code, 401)


if __name__ == "__main__":
    unittest.main()
