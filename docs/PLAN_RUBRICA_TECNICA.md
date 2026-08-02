# Cumplimiento de la rúbrica técnica del tercer ciclo

Fecha de validación: 2 de agosto de 2026

## Arquitectura implementada

```text
Teléfono / navegador
        |
        | HTTPS :8443
        v
vic-publico (10.20.0.10)
  Nginx + frontend + certificado TLS + balanceador
        |
        | red interna vic-privada
        v
vic-privado (10.20.0.20)
  backend-a + backend-b + SQLite + Prometheus + Grafana
```

El servidor privado no publica la API, la base de datos ni Prometheus en la
LAN. El tráfico de la aplicación entra por Nginx en el servidor público. Ambos
servidores tienen UFW activo y deniegan por defecto las conexiones entrantes.
SSH solo acepta la llave del usuario `vicadmin`; el acceso por contraseña y el
inicio de sesión de `root` están deshabilitados.

## Matriz de cumplimiento

| Requisito técnico | Estado | Evidencia actual |
| --- | --- | --- |
| Hash y cifrado | Cumple | bcrypt para contraseñas, HMAC para códigos, JWT firmado y TLS para datos en tránsito |
| Servidor público y privado | Cumple en LAN | Dos VM Ubuntu independientes: `vic-publico` y `vic-privado`, enlazadas por la red interna `vic-privada` |
| Prometheus y Grafana | Cumple | Prometheus consulta cinco objetivos activos; Grafana carga el panel `VIC - Estado general` |
| Firewall aplicado y monitoreado | Cumple | UFW activo: público 22/80/443; privado limita 8001, 8002 y 3000 a `10.20.0.10` |
| Protección JWT de la API | Cumple | `/api/contenedores` devuelve 401 sin token; existen autorización por rol y revocación por versión de sesión |
| Certificado SSL/TLS | Cumple en LAN | Nginx usa TLS 1.2/1.3 y certificado autofirmado con vigencia de un año; en nube se sustituirá por Let's Encrypt |
| Balanceador de carga | Cumple | Nginx usa `least_conn` y distribuye solicitudes entre `backend-a` y `backend-b` |
| Aplicación móvil útil | Cumple | QR, GPS, mapas, ruta del recolector, calendario y reportes |
| Diseño móvil profesional | Cumple con revisión final pendiente | Navegación y pantallas separadas por perfil |
| Navegación móvil clara | Cumple | Pestañas por función y restricciones por rol |
| Formularios validados | Cumple | Validación en interfaz y esquemas Pydantic en la API |
| Datos móviles visibles en Web | Cumple | Aplicación web y móvil consumen la misma API y base de datos |
| Web, API y BD en nube | Pendiente | La separación y el despliegue LAN están listos; todavía falta contratar/configurar el proveedor público |
| Aplicación móvil 100 % funcional | En preparación | Funciones principales listas; push remoto requiere development build y FCM |
| Teléfono para evaluadores | Pendiente de presentación | Falta instalar la compilación final y preparar una cuenta por perfil |

## Validación ejecutada

| Prueba | Resultado esperado | Resultado |
| --- | --- | --- |
| `GET https://127.0.0.1:8443/` | Frontend disponible | 200 |
| `GET /api/salud` | API disponible a través del balanceador | 200 |
| `GET /api/contenedores` sin JWT | Acceso rechazado | 401 |
| `GET /api/metricas` desde el público | Métricas no expuestas | 404 |
| `GET /grafana/` | Redirección al acceso de Grafana | 301 |
| Prometheus | Todos los objetivos disponibles | 5 de 5 en estado `up` |
| Datos migrados | Información de demostración en el privado | 4 usuarios, 6 contenedores, 5 rutas y 3 reportes |

La base de datos anterior al reemplazo quedó respaldada dentro del servidor
privado en `/opt/vic/backups/vic-antes-migracion.db`.

## Evidencias para la presentación

1. VirtualBox mostrando `vic-publico` y `vic-privado` encendidas.
2. `sudo ufw status verbose` en cada servidor.
3. Acceso HTTPS y detalle del certificado.
4. Respuesta 401 sin JWT y acceso correcto al iniciar sesión.
5. Logs de las dos réplicas después de enviar varias solicitudes.
6. Grafana mostrando disponibilidad, solicitudes, latencia, CPU y contenedores.
7. Un cambio hecho desde el teléfono reflejado inmediatamente en la web.

El alojamiento en nube debe permanecer como pendiente hasta desplegarlo y
verificarlo en un proveedor externo.
