import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

directorio_temporal = tempfile.TemporaryDirectory()
ruta_base_datos = Path(directorio_temporal.name) / "vic-pruebas.db"
os.environ["VIC_DATABASE_URL"] = f"sqlite:///{ruta_base_datos.as_posix()}"
os.environ["VIC_JWT_SECRET"] = "secreto-exclusivo-para-pruebas"
os.environ["VIC_EVIDENCE_DIR"] = str(Path(directorio_temporal.name) / "evidencias")

from starlette.testclient import TestClient

from app.base_datos import SesionLocal, motor_base_datos
from app.modelos import RecuperacionContrasena, RegistroUbicacionContenedor, Usuario
from app.principal import aplicacion


class PruebasContenedores(unittest.TestCase):
    @classmethod
    def registrar_y_verificar(cls, nombre, correo):
        with patch("app.autenticacion.enviar_codigo_verificacion") as enviar_codigo:
            registro = cls.cliente.post(
                "/autenticacion/registro",
                json={
                    "nombre": nombre,
                    "apellidos": "Pruebas",
                    "correo": correo,
                    "contrasena": "Prueba123!",
                },
            )
        assert registro.status_code == 201, registro.text
        assert registro.json()["requiere_verificacion"] is True
        assert "token_acceso" not in registro.json()
        enviar_codigo.assert_called_once()
        codigo = enviar_codigo.call_args.args[2]

        acceso_prematuro = cls.cliente.post(
            "/autenticacion/iniciar-sesion",
            json={"correo": correo, "contrasena": "Prueba123!"},
        )
        assert acceso_prematuro.status_code == 403, acceso_prematuro.text

        with patch("app.autenticacion.enviar_bienvenida") as enviar_bienvenida:
            verificacion = cls.cliente.post(
                "/autenticacion/verificar-correo",
                json={"correo": correo, "codigo": codigo},
            )
        assert verificacion.status_code == 200, verificacion.text
        enviar_bienvenida.assert_called_once()
        reutilizacion = cls.cliente.post(
            "/autenticacion/verificar-correo",
            json={"correo": correo, "codigo": codigo},
        )
        assert reutilizacion.status_code == 400, reutilizacion.text
        return verificacion

    @classmethod
    def setUpClass(cls):
        cls.cliente = TestClient(aplicacion)
        respuesta = cls.registrar_y_verificar("Usuario", "mapas@example.com")
        cls.encabezados_ciudadano = {
            "Authorization": f"Bearer {respuesta.json()['token_acceso']}",
        }

        respuesta_recolector = cls.registrar_y_verificar(
            "Recolector",
            "recolector@example.com",
        )
        with SesionLocal() as base_datos:
            recolector = (
                base_datos.query(Usuario)
                .filter_by(correo="recolector@example.com")
                .one()
            )
            recolector.rol = "collector"
            base_datos.commit()
            cls.recolector_id = recolector.id

        cls.encabezados = {
            "Authorization": f"Bearer {respuesta_recolector.json()['token_acceso']}",
        }

        respuesta_admin = cls.registrar_y_verificar("Admin", "admin@example.com")
        with SesionLocal() as base_datos:
            administrador = (
                base_datos.query(Usuario)
                .filter_by(correo="admin@example.com")
                .one()
            )
            administrador.rol = "admin"
            base_datos.commit()
            cls.administrador_id = administrador.id
        cls.encabezados_admin = {
            "Authorization": f"Bearer {respuesta_admin.json()['token_acceso']}",
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

    def test_historial_contenedor_requiere_recolector_o_admin(self):
        codigo = "VIC:CONTENEDOR:HISTORIAL-001"
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

        respuesta_ciudadano = self.cliente.get(
            f"/contenedores/{id_contenedor}/registros",
            headers=self.encabezados_ciudadano,
        )
        self.assertEqual(respuesta_ciudadano.status_code, 403, respuesta_ciudadano.text)

        respuesta_recolector = self.cliente.get(
            f"/contenedores/{id_contenedor}/registros",
            headers=self.encabezados,
        )
        self.assertEqual(respuesta_recolector.status_code, 200, respuesta_recolector.text)
        self.assertEqual(len(respuesta_recolector.json()), 2)
        self.assertEqual(
            respuesta_recolector.json()[0]["latitud"], 19.4330,
        )
        self.assertEqual(
            respuesta_recolector.json()[1]["latitud"], 19.4326,
        )

    def test_historial_contenedor_admin_puede_editar_y_eliminar_registro(self):
        codigo = "VIC:CONTENEDOR:HISTORIAL-CRUD"
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
        id_contenedor = creacion.json()["contenedor"]["id"]

        segunda_actualizacion = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados,
            json={
                "codigo_qr": codigo,
                "latitud": 19.4335,
                "longitud": -99.1325,
                "precision_m": 4.0,
            },
        )
        self.assertEqual(segunda_actualizacion.status_code, 200, segunda_actualizacion.text)

        registro_manual = self.cliente.post(
            f"/contenedores/{id_contenedor}/registros",
            headers=self.encabezados_admin,
            json={
                "latitud": 19.4342,
                "longitud": -99.1318,
                "precision_m": 2.5,
            },
        )
        self.assertEqual(registro_manual.status_code, 201, registro_manual.text)
        self.assertEqual(registro_manual.json()["contenedor_id"], id_contenedor)
        self.assertEqual(registro_manual.json()["usuario_id"], self.administrador_id)

        registros = self.cliente.get(
            f"/contenedores/{id_contenedor}/registros",
            headers=self.encabezados_admin,
        )
        self.assertEqual(registros.status_code, 200, registros.text)
        self.assertEqual(len(registros.json()), 3)

        registro_original = registros.json()[0]
        respuesta_edicion = self.cliente.patch(
            f"/contenedores/{id_contenedor}/registros/{registro_original['id']}",
            headers=self.encabezados_admin,
            json={
                "latitud": 19.4340,
                "longitud": -99.1320,
            },
        )
        self.assertEqual(respuesta_edicion.status_code, 200, respuesta_edicion.text)
        self.assertEqual(respuesta_edicion.json()["latitud"], 19.4340)
        self.assertEqual(respuesta_edicion.json()["longitud"], -99.1320)

        registros_actualizados = self.cliente.get(
            f"/contenedores/{id_contenedor}/registros",
            headers=self.encabezados_admin,
        )
        self.assertEqual(registros_actualizados.status_code, 200, registros_actualizados.text)
        self.assertEqual(len(registros_actualizados.json()), 3)
        self.assertTrue(any(r["latitud"] == 19.4340 and r["longitud"] == -99.1320 for r in registros_actualizados.json()))

        registro_a_eliminar = registros_actualizados.json()[1]
        respuesta_eliminar = self.cliente.delete(
            f"/contenedores/{id_contenedor}/registros/{registro_a_eliminar['id']}",
            headers=self.encabezados_admin,
        )
        self.assertEqual(respuesta_eliminar.status_code, 200, respuesta_eliminar.text)

        registros_final = self.cliente.get(
            f"/contenedores/{id_contenedor}/registros",
            headers=self.encabezados_admin,
        )
        self.assertEqual(registros_final.status_code, 200, registros_final.text)
        self.assertEqual(len(registros_final.json()), 2)

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

    def test_registro_legitimo_no_es_bloqueado_por_reenvio_anonimo(self):
        correo = "antibloqueo@example.com"
        with patch("app.autenticacion.enviar_codigo_verificacion") as envio_anonimo:
            reenvio = self.cliente.post(
                "/autenticacion/reenviar-verificacion",
                json={"correo": correo},
            )
        self.assertEqual(reenvio.status_code, 200, reenvio.text)
        envio_anonimo.assert_not_called()

        verificacion = self.registrar_y_verificar("Antibloqueo", correo)
        self.assertIn("token_acceso", verificacion.json())

    def test_zz_recuperacion_contrasena_es_real_segura_y_revoca_sesion(self):
        with patch("app.autenticacion.enviar_codigo_recuperacion") as enviar_codigo:
            solicitud = self.cliente.post(
                "/autenticacion/recuperar-contrasena",
                json={"correo": "mapas@example.com"},
            )
        self.assertEqual(solicitud.status_code, 200, solicitud.text)
        enviar_codigo.assert_called_once()
        codigo = enviar_codigo.call_args.args[2]
        self.assertEqual(len(codigo), 8)

        with SesionLocal() as base_datos:
            usuario_recuperado = (
                base_datos.query(Usuario).filter_by(correo="mapas@example.com").one()
            )
            recuperacion = (
                base_datos.query(RecuperacionContrasena)
                .filter_by(usuario_id=usuario_recuperado.id)
                .order_by(RecuperacionContrasena.id.desc())
                .first()
            )
            self.assertIsNotNone(recuperacion)
            self.assertNotEqual(recuperacion.codigo_hash, codigo)

        codigo_incorrecto = self.cliente.post(
            "/autenticacion/restablecer-contrasena",
            json={
                "correo": "mapas@example.com",
                "codigo": "AAAAAAAA",
                "contrasena_nueva": "NuevaPrueba123!",
            },
        )
        self.assertEqual(codigo_incorrecto.status_code, 400, codigo_incorrecto.text)

        with patch("app.autenticacion.enviar_aviso_contrasena_actualizada") as enviar_aviso:
            cambio = self.cliente.post(
                "/autenticacion/restablecer-contrasena",
                json={
                    "correo": "mapas@example.com",
                    "codigo": codigo,
                    "contrasena_nueva": "NuevaPrueba123!",
                },
            )
        self.assertEqual(cambio.status_code, 200, cambio.text)
        enviar_aviso.assert_called_once()

        sesion_anterior = self.cliente.get(
            "/autenticacion/mi-usuario",
            headers=self.encabezados_ciudadano,
        )
        self.assertEqual(sesion_anterior.status_code, 401, sesion_anterior.text)

        inicio_nuevo = self.cliente.post(
            "/autenticacion/iniciar-sesion",
            json={
                "correo": "mapas@example.com",
                "contrasena": "NuevaPrueba123!",
            },
        )
        self.assertEqual(inicio_nuevo.status_code, 200, inicio_nuevo.text)

        reutilizacion = self.cliente.post(
            "/autenticacion/restablecer-contrasena",
            json={
                "correo": "mapas@example.com",
                "codigo": codigo,
                "contrasena_nueva": "OtraPrueba123!",
            },
        )
        self.assertEqual(reutilizacion.status_code, 400, reutilizacion.text)

        with patch("app.autenticacion.enviar_codigo_recuperacion") as enviar_inexistente:
            inexistente = self.cliente.post(
                "/autenticacion/recuperar-contrasena",
                json={"correo": "no-existe@example.com"},
            )
        self.assertEqual(inexistente.status_code, 200, inexistente.text)
        self.assertEqual(inexistente.json(), solicitud.json())
        enviar_inexistente.assert_not_called()

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

        intento_atender_ciudadano = self.cliente.patch(
            f"/reportes/{reporte_id}/estado",
            headers=self.encabezados_ciudadano,
            json={"estado": "en_revision"},
        )
        self.assertEqual(intento_atender_ciudadano.status_code, 403)

        todos = self.cliente.get("/reportes", headers=self.encabezados)
        self.assertEqual(todos.status_code, 200, todos.text)
        self.assertIn(reporte_id, [item["id"] for item in todos.json()])

        tomado = self.cliente.patch(
            f"/reportes/{reporte_id}/estado",
            headers=self.encabezados,
            json={"estado": "en_revision"},
        )
        self.assertEqual(tomado.status_code, 200, tomado.text)
        self.assertEqual(tomado.json()["estado"], "en_revision")

        resolucion_sin_respuesta = self.cliente.patch(
            f"/reportes/{reporte_id}/estado",
            headers=self.encabezados_admin,
            json={"estado": "resuelto"},
        )
        self.assertEqual(resolucion_sin_respuesta.status_code, 422)

        actualizado = self.cliente.patch(
            f"/reportes/{reporte_id}/estado",
            headers=self.encabezados,
            json={
                "estado": "resuelto",
                "respuesta": "El contenedor fue atendido y ya está disponible.",
            },
        )
        self.assertEqual(actualizado.status_code, 200, actualizado.text)
        self.assertEqual(actualizado.json()["estado"], "resuelto")
        self.assertEqual(
            actualizado.json()["respuesta"],
            "El contenedor fue atendido y ya está disponible.",
        )

        seguimiento_ciudadano = self.cliente.get(
            "/reportes/mios",
            headers=self.encabezados_ciudadano,
        )
        reporte_actualizado = next(
            item for item in seguimiento_ciudadano.json() if item["id"] == reporte_id
        )
        self.assertEqual(reporte_actualizado["estado"], "resuelto")
        self.assertEqual(
            reporte_actualizado["respuesta"],
            "El contenedor fue atendido y ya está disponible.",
        )

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

    def test_administracion_segura_de_recolectores(self):
        no_autorizado = self.cliente.get(
            "/administracion/usuarios",
            headers=self.encabezados_ciudadano,
        )
        self.assertEqual(no_autorizado.status_code, 403, no_autorizado.text)

        creacion = self.cliente.post(
            "/administracion/usuarios",
            headers=self.encabezados_admin,
            json={
                "nombre": "Nuevo",
                "apellidos": "Recolector",
                "correo": "nuevo-recolector@example.com",
                "contrasena_temporal": "Temporal#2026",
                "rol": "collector",
            },
        )
        self.assertEqual(creacion.status_code, 201, creacion.text)
        usuario_id = creacion.json()["id"]
        self.assertTrue(creacion.json()["activo"])
        self.assertTrue(creacion.json()["requiere_cambio_contrasena"])

        recolectores = self.cliente.get(
            "/administracion/recolectores",
            headers=self.encabezados_admin,
        )
        self.assertEqual(recolectores.status_code, 200, recolectores.text)
        self.assertIn(usuario_id, [item["id"] for item in recolectores.json()])

        creacion_admin = self.cliente.post(
            "/administracion/usuarios",
            headers=self.encabezados_admin,
            json={
                "nombre": "Segundo",
                "apellidos": "Administrador",
                "correo": "segundo-admin@example.com",
                "contrasena_temporal": "Temporal#Admin2026",
                "rol": "admin",
            },
        )
        self.assertEqual(creacion_admin.status_code, 201, creacion_admin.text)
        self.assertEqual(creacion_admin.json()["rol"], "admin")

        inicio = self.cliente.post(
            "/autenticacion/iniciar-sesion",
            json={
                "correo": "nuevo-recolector@example.com",
                "contrasena": "Temporal#2026",
            },
        )
        self.assertEqual(inicio.status_code, 200, inicio.text)
        encabezados_nuevo = {
            "Authorization": f"Bearer {inicio.json()['token_acceso']}",
        }
        self.assertEqual(inicio.json()["usuario"]["rol"], "collector")
        self.assertTrue(inicio.json()["usuario"]["requiere_cambio_contrasena"])

        cambio = self.cliente.post(
            "/autenticacion/cambiar-contrasena",
            headers=encabezados_nuevo,
            json={
                "contrasena_actual": "Temporal#2026",
                "contrasena_nueva": "Definitiva#2026",
            },
        )
        self.assertEqual(cambio.status_code, 200, cambio.text)

        restablecimiento = self.cliente.post(
            f"/administracion/usuarios/{usuario_id}/restablecer-contrasena",
            headers=self.encabezados_admin,
            json={"contrasena_temporal": "NuevaTemporal#2026"},
        )
        self.assertEqual(restablecimiento.status_code, 200, restablecimiento.text)
        self.assertTrue(restablecimiento.json()["requiere_cambio_contrasena"])

        suspension = self.cliente.patch(
            f"/administracion/usuarios/{usuario_id}",
            headers=self.encabezados_admin,
            json={"activo": False},
        )
        self.assertEqual(suspension.status_code, 200, suspension.text)
        self.assertFalse(suspension.json()["activo"])

        token_suspendido = self.cliente.get(
            "/contenedores",
            headers=encabezados_nuevo,
        )
        self.assertEqual(token_suspendido.status_code, 403, token_suspendido.text)

        inicio_suspendido = self.cliente.post(
            "/autenticacion/iniciar-sesion",
            json={
                "correo": "nuevo-recolector@example.com",
                "contrasena": "NuevaTemporal#2026",
            },
        )
        self.assertEqual(inicio_suspendido.status_code, 403, inicio_suspendido.text)

        reactivacion = self.cliente.patch(
            f"/administracion/usuarios/{usuario_id}",
            headers=self.encabezados_admin,
            json={"activo": True},
        )
        self.assertEqual(reactivacion.status_code, 200, reactivacion.text)
        self.assertTrue(reactivacion.json()["activo"])

    def test_recorrido_gps_paradas_incidencias_y_seguimiento(self):
        contenedor = self.cliente.post(
            "/contenedores/registrar-qr",
            headers=self.encabezados_ciudadano,
            json={
                "codigo_qr": "VIC:CONTENEDOR:OPERACION-001",
                "latitud": 20.5994,
                "longitud": -100.3327,
                "precision_m": 4,
            },
        )
        self.assertEqual(contenedor.status_code, 200, contenedor.text)
        contenedor_id = contenedor.json()["contenedor"]["id"]

        ruta = self.cliente.post(
            "/rutas",
            headers=self.encabezados_admin,
            json={
                "nombre": "Ruta Operativa",
                "zona": "Zona de pruebas",
                "dia_semana": "viernes",
                "hora_aproximada": "07:45",
                "contenedor_ids": [contenedor_id],
                "recolector_id": self.recolector_id,
            },
        )
        self.assertEqual(ruta.status_code, 201, ruta.text)
        ruta_id = ruta.json()["id"]
        self.assertEqual(ruta.json()["recolector"]["id"], self.recolector_id)

        inicio = self.cliente.post(
            f"/operacion/rutas/{ruta_id}/iniciar",
            headers=self.encabezados,
            json={
                "latitud": 20.5990,
                "longitud": -100.3330,
                "precision_m": 6,
            },
        )
        self.assertEqual(inicio.status_code, 201, inicio.text)
        ejecucion_id = inicio.json()["id"]
        parada_id = inicio.json()["paradas"][0]["id"]
        self.assertEqual(inicio.json()["estado"], "en_recorrido")
        self.assertEqual(inicio.json()["progreso_porcentaje"], 0)

        calendario = self.cliente.get(
            "/rutas",
            headers=self.encabezados_ciudadano,
        )
        ruta_visible = next(
            item for item in calendario.json() if item["id"] == ruta_id
        )
        self.assertEqual(ruta_visible["operacion"]["estado"], "en_recorrido")
        self.assertEqual(ruta_visible["operacion"]["latitud_actual"], 20.5990)

        ubicacion = self.cliente.post(
            f"/operacion/ejecuciones/{ejecucion_id}/ubicacion",
            headers=self.encabezados,
            json={
                "latitud": 20.5993,
                "longitud": -100.3328,
                "precision_m": 3,
            },
        )
        self.assertEqual(ubicacion.status_code, 200, ubicacion.text)
        self.assertEqual(ubicacion.json()["latitud_actual"], 20.5993)

        incidencia = self.cliente.post(
            f"/operacion/ejecuciones/{ejecucion_id}/incidencias",
            headers=self.encabezados,
            json={
                "parada_id": parada_id,
                "tipo": "contenedor_bloqueado",
                "comentario": "Un vehiculo bloquea el acceso al contenedor.",
                "latitud": 20.5994,
                "longitud": -100.3327,
            },
        )
        self.assertEqual(incidencia.status_code, 201, incidencia.text)
        self.assertEqual(incidencia.json()["paradas"][0]["estado"], "incidencia")
        self.assertEqual(incidencia.json()["progreso_porcentaje"], 100)

        incidencias_admin = self.cliente.get(
            "/operacion/incidencias",
            headers=self.encabezados_admin,
        )
        self.assertEqual(incidencias_admin.status_code, 200, incidencias_admin.text)
        self.assertIn(
            ejecucion_id,
            [item["ejecucion_id"] for item in incidencias_admin.json()],
        )

        finalizacion = self.cliente.post(
            f"/operacion/ejecuciones/{ejecucion_id}/finalizar",
            headers=self.encabezados,
        )
        self.assertEqual(finalizacion.status_code, 200, finalizacion.text)
        self.assertEqual(finalizacion.json()["estado"], "completada")

        sin_activo = self.cliente.get(
            "/operacion/mi-recorrido-activo",
            headers=self.encabezados,
        )
        self.assertEqual(sin_activo.status_code, 200, sin_activo.text)
        self.assertIsNone(sin_activo.json())

    def test_ruta_vial_direcciones_placa_historial_y_evidencia(self):
        vehiculo = self.cliente.post(
            "/administracion/vehiculos",
            headers=self.encabezados_admin,
            json={"placa": "ABC-123-D"},
        )
        self.assertEqual(vehiculo.status_code, 201, vehiculo.text)
        vehiculo_id = vehiculo.json()["id"]

        contenedores = []
        for indice, coordenadas in enumerate(
            [(20.5994, -100.3327), (20.6020, -100.3290)],
            start=1,
        ):
            respuesta = self.cliente.post(
                "/contenedores/registrar-qr",
                headers=self.encabezados_ciudadano,
                json={
                    "codigo_qr": f"VIC:VIAL:{indice}",
                    "latitud": coordenadas[0],
                    "longitud": coordenadas[1],
                    "direccion_completa": f"Calle de prueba {indice}, Queretaro",
                    "calle": "Calle de prueba",
                    "numero": str(indice),
                    "municipio": "Queretaro",
                },
            )
            self.assertEqual(respuesta.status_code, 200, respuesta.text)
            self.assertIn("Calle de prueba", respuesta.json()["contenedor"]["direccion_completa"])
            contenedores.append(respuesta.json()["contenedor"])

        calculo = {
            "geometria": [
                {"latitud": 20.598, "longitud": -100.334},
                {"latitud": 20.5994, "longitud": -100.3327},
                {"latitud": 20.601, "longitud": -100.331},
                {"latitud": 20.6020, "longitud": -100.3290},
            ],
            "distancia_m": 1250.0,
            "duracion_s": 420.0,
            "duraciones_tramos_s": [120.0, 140.0, 160.0],
            "proveedor": "osrm_openstreetmap",
            "estado": "calculada",
            "detalle": None,
        }
        puntos = [
            {
                "tipo": "inicio",
                "latitud": 20.598,
                "longitud": -100.334,
                "direccion": "Base",
            },
            {
                "tipo": "contenedor",
                "contenedor_id": contenedores[0]["id"],
                "latitud": contenedores[0]["latitud"],
                "longitud": contenedores[0]["longitud"],
            },
            {
                "tipo": "paso",
                "latitud": 20.601,
                "longitud": -100.331,
                "direccion": "Paso obligatorio",
            },
            {
                "tipo": "contenedor",
                "contenedor_id": contenedores[1]["id"],
                "latitud": contenedores[1]["latitud"],
                "longitud": contenedores[1]["longitud"],
            },
        ]
        with patch("app.rutas.calcular_recorrido", return_value=calculo):
            ruta = self.cliente.post(
                "/rutas",
                headers=self.encabezados_admin,
                json={
                    "nombre": "Ruta vial",
                    "zona": "Centro",
                    "dia_semana": "martes",
                    "hora_aproximada": "08:00",
                    "contenedor_ids": [item["id"] for item in contenedores],
                    "recolector_id": self.recolector_id,
                    "vehiculo_id": vehiculo_id,
                    "puntos_ruta": puntos,
                },
            )
        self.assertEqual(ruta.status_code, 201, ruta.text)
        datos_ruta = ruta.json()
        self.assertEqual(datos_ruta["vehiculo"]["placa"], "ABC-123-D")
        self.assertEqual(datos_ruta["proveedor_ruta"], "osrm_openstreetmap")
        self.assertEqual(datos_ruta["duracion_minutos"], 7)
        self.assertEqual(len(datos_ruta["geometria"]), 4)
        self.assertEqual(len(datos_ruta["puntos_ruta"]), 4)
        self.assertGreater(datos_ruta["contenedores"][1]["eta_minutos"], 0)

        inicio = self.cliente.post(
            f"/operacion/rutas/{datos_ruta['id']}/iniciar",
            headers=self.encabezados,
            json={"latitud": 20.598, "longitud": -100.334, "precision_m": 5},
        )
        self.assertEqual(inicio.status_code, 201, inicio.text)
        self.assertEqual(inicio.json()["vehiculo"]["placa"], "ABC-123-D")
        self.assertEqual(len(inicio.json()["geometria"]), 4)

        recalculo = {
            **calculo,
            "distancia_m": 900.0,
            "duracion_s": 300.0,
            "duraciones_tramos_s": [150.0, 150.0],
        }
        with patch("app.operacion.calcular_recorrido", return_value=recalculo):
            respuesta_recalculo = self.cliente.post(
                f"/operacion/ejecuciones/{inicio.json()['id']}/recalcular",
                headers=self.encabezados,
                json={"latitud": 20.5985, "longitud": -100.3335},
            )
        self.assertEqual(respuesta_recalculo.status_code, 200, respuesta_recalculo.text)
        self.assertEqual(respuesta_recalculo.json()["distancia_restante_m"], 900.0)
        self.assertEqual(respuesta_recalculo.json()["duracion_restante_minutos"], 5)

        historial = self.cliente.get("/operacion/historial", headers=self.encabezados)
        self.assertEqual(historial.status_code, 200, historial.text)
        self.assertIn(inicio.json()["id"], [item["id"] for item in historial.json()])

        evidencia = self.cliente.post(
            "/archivos/evidencias",
            headers=self.encabezados,
            files={"archivo": ("evidencia.png", b"\x89PNG\r\n", "image/png")},
        )
        self.assertEqual(evidencia.status_code, 200, evidencia.text)
        self.assertTrue(evidencia.json()["url"].startswith("/evidencias/"))


if __name__ == "__main__":
    unittest.main()
