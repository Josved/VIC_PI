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
from app.modelos import RegistroUbicacionContenedor, Usuario
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
            },
        )
        assert respuesta.status_code == 201, respuesta.text
        cls.encabezados_ciudadano = {
            "Authorization": f"Bearer {respuesta.json()['token_acceso']}",
        }

        respuesta_recolector = cls.cliente.post(
            "/autenticacion/registro",
            json={
                "nombre": "Recolector",
                "apellidos": "Pruebas",
                "correo": "recolector@example.com",
                "contrasena": "Prueba123!",
            },
        )
        assert respuesta_recolector.status_code == 201, respuesta_recolector.text
        with SesionLocal() as base_datos:
            recolector = (
                base_datos.query(Usuario)
                .filter_by(correo="recolector@example.com")
                .one()
            )
            recolector.rol = "collector"
            base_datos.commit()

        cls.encabezados = {
            "Authorization": f"Bearer {respuesta_recolector.json()['token_acceso']}",
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
        codigos_cercanos = [item["codigo_qr"] for item in cercanos.json()]
        self.assertIn(codigo, codigos_cercanos)
        self.assertNotIn("VIC:CONTENEDOR:LEJANO", codigos_cercanos)
        contenedor_prueba = next(
            item for item in cercanos.json() if item["codigo_qr"] == codigo
        )
        self.assertEqual(contenedor_prueba["distancia_m"], 0)

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

    def test_registro_publico_no_permite_elegir_rol(self):
        respuesta = self.cliente.post(
            "/autenticacion/registro",
            json={
                "nombre": "Administrador",
                "apellidos": "Falso",
                "correo": "falso-admin@example.com",
                "contrasena": "Prueba123!",
                "rol": "admin",
            },
        )
        self.assertEqual(respuesta.status_code, 422, respuesta.text)

    def test_ciudadano_puede_registrar_y_actualizar_ubicacion(self):
        creacion = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados_ciudadano,
            json={
                "codigo_qr": "VIC:CONTENEDOR:CIUDADANO-001",
                "latitud": 19.4326,
                "longitud": -99.1332,
            },
        )
        self.assertEqual(creacion.status_code, 200, creacion.text)
        self.assertEqual(creacion.json()["accion"], "creado")

        actualizacion = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados_ciudadano,
            json={
                "codigo_qr": "VIC:CONTENEDOR:CIUDADANO-001",
                "latitud": 19.4331,
                "longitud": -99.1328,
                "precision_m": 3,
            },
        )
        self.assertEqual(actualizacion.status_code, 200, actualizacion.text)
        self.assertEqual(actualizacion.json()["accion"], "actualizado")
        self.assertEqual(actualizacion.json()["contenedor"]["veces_registrado"], 2)
        self.assertEqual(
            actualizacion.json()["contenedor"]["actualizado_por_id"],
            creacion.json()["contenedor"]["actualizado_por_id"],
        )

    def test_reportes_y_permisos_por_rol(self):
        contenedor = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados,
            json={
                "codigo_qr": "VIC:CONTENEDOR:REPORTE-001",
                "latitud": 19.4326,
                "longitud": -99.1332,
                "precision_m": 4,
            },
        )
        self.assertEqual(contenedor.status_code, 200, contenedor.text)
        contenedor_id = contenedor.json()["contenedor"]["id"]

        reporte = self.cliente.post(
            "/reportes",
            headers=self.encabezados_ciudadano,
            json={
                "contenedor_id": contenedor_id,
                "motivo": "lleno",
                "comentario": "El contenedor necesita recoleccion.",
            },
        )
        self.assertEqual(reporte.status_code, 201, reporte.text)
        reporte_id = reporte.json()["id"]
        self.assertEqual(reporte.json()["estado"], "pendiente")

        listado_no_autorizado = self.cliente.get(
            "/reportes",
            headers=self.encabezados_ciudadano,
        )
        self.assertEqual(listado_no_autorizado.status_code, 403)

        mis_reportes = self.cliente.get(
            "/reportes/mios",
            headers=self.encabezados_ciudadano,
        )
        self.assertEqual(mis_reportes.status_code, 200, mis_reportes.text)
        self.assertIn(reporte_id, [item["id"] for item in mis_reportes.json()])

        todos = self.cliente.get("/reportes", headers=self.encabezados)
        self.assertEqual(todos.status_code, 200, todos.text)
        self.assertIn(reporte_id, [item["id"] for item in todos.json()])

        actualizado = self.cliente.patch(
            f"/reportes/{reporte_id}/estado",
            headers=self.encabezados,
            json={"estado": "resuelto"},
        )
        self.assertEqual(actualizado.status_code, 200, actualizado.text)
        self.assertEqual(actualizado.json()["estado"], "resuelto")

    def test_rutas_semanales_y_permisos(self):
        contenedor = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados_ciudadano,
            json={
                "codigo_qr": "VIC:CONTENEDOR:RUTA-001",
                "latitud": 19.4326,
                "longitud": -99.1332,
            },
        )
        self.assertEqual(contenedor.status_code, 200, contenedor.text)
        contenedor_id = contenedor.json()["contenedor"]["id"]

        ruta_ciudadano = self.cliente.post(
            "/rutas",
            headers=self.encabezados_ciudadano,
            json={
                "nombre": "Ruta no autorizada",
                "zona": "Centro",
                "dia_semana": "lunes",
                "hora_aproximada": "08:30",
                "contenedor_ids": [contenedor_id],
            },
        )
        self.assertEqual(ruta_ciudadano.status_code, 403, ruta_ciudadano.text)

        creacion = self.cliente.post(
            "/rutas",
            headers=self.encabezados,
            json={
                "nombre": "Ruta Centro",
                "zona": "Barrio Centro",
                "dia_semana": "miercoles",
                "hora_aproximada": "08:30",
                "descripcion": "Recoleccion semanal",
                "contenedor_ids": [contenedor_id],
            },
        )
        self.assertEqual(creacion.status_code, 201, creacion.text)
        ruta_id = creacion.json()["id"]
        self.assertEqual(creacion.json()["contenedores"][0]["id"], contenedor_id)

        calendario = self.cliente.get("/rutas", headers=self.encabezados_ciudadano)
        self.assertEqual(calendario.status_code, 200, calendario.text)
        self.assertIn(ruta_id, [ruta["id"] for ruta in calendario.json()])

        actualizacion = self.cliente.patch(
            f"/rutas/{ruta_id}",
            headers=self.encabezados,
            json={"dia_semana": "jueves", "hora_aproximada": "09:15"},
        )
        self.assertEqual(actualizacion.status_code, 200, actualizacion.text)
        self.assertEqual(actualizacion.json()["dia_semana"], "jueves")
        self.assertEqual(actualizacion.json()["hora_aproximada"], "09:15")

        desactivacion = self.cliente.patch(
            f"/rutas/{ruta_id}",
            headers=self.encabezados,
            json={"activa": False},
        )
        self.assertEqual(desactivacion.status_code, 200, desactivacion.text)
        self.assertFalse(desactivacion.json()["activa"])

        calendario_final = self.cliente.get(
            "/rutas",
            headers=self.encabezados_ciudadano,
        )
        self.assertNotIn(ruta_id, [ruta["id"] for ruta in calendario_final.json()])

        gestionables = self.cliente.get("/rutas/mias", headers=self.encabezados)
        self.assertIn(ruta_id, [ruta["id"] for ruta in gestionables.json()])


if __name__ == "__main__":
    unittest.main()
