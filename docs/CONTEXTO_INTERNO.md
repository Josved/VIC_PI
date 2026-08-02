# Contexto Interno del Proyecto VIC

> Archivo de referencia para el equipo y para la asistencia automática. Usar cada vez que se trabaje en el proyecto para mantener el contexto.

## Objetivo del proyecto

VIC es una aplicación móvil universitaria para:
- localizar contenedores de reciclaje,
- consultar calendarios de recolección,
- reportar contenedores y situaciones,
- gestionar rutas de recolección y personal,
- administrar usuarios, vehículos y recorridos.

## Estructura general del repositorio

- `backend/`: API en Python con FastAPI, SQLAlchemy y SQLite.
- `frontend/`: aplicación Expo React Native en JavaScript con soporte móvil y web.
- `docs/`: documentación técnica y de despliegue.
- `scripts/`: utilidades de PowerShell para Docker y respaldo.
- `compose.yaml`, `compose.osrm.yaml`: despliegue Docker del backend, frontend y servicios.

## Stack principal

### Backend
- Python 3.14
- FastAPI
- Uvicorn
- SQLAlchemy 2
- Pydantic v2
- SQLite
- JWT con `python-jose`
- Hashing con `bcrypt` y `passlib`
- Soporte de multipart para cargas de archivos

### Frontend
- Expo (React Native)
- React 19
- React Navigation
- Axios para HTTP
- Expo Location, Camera, Image Picker, Notifications, Task Manager
- Leaflet y `react-native-maps` para mapas
- `@react-native-async-storage/async-storage` para sesión local

## Archivos y carpetas clave

### Backend importantes
- `backend/app/principal.py`: entrada de la aplicación, configuración CORS, rutas y archivos estáticos.
- `backend/app/configuracion.py`: parámetros de entorno, URLs de Servicios OSRM/Nominatim y rutas de evidencia.
- `backend/app/base_datos.py`: sesión de SQLAlchemy y conexión a SQLite.
- `backend/app/autenticacion.py`: registro, inicio de sesión, token JWT, validación de usuario y control de cuentas.
- `backend/app/contenedores.py`: registro de contenedores por QR, consulta de contenedores cercanos, detalle y listado.
- `backend/app/reportes.py`: creación de reportes, consulta propios y de administradores, cambio de estado.
- `backend/app/rutas.py`: creación/actualización de rutas, asignación de recolectores, configuración vial y cálculo de recorridos.
- `backend/app/operacion.py`: inicio y seguimiento de recorridos, ubicación en tiempo real, historial, incidencias y cancelaciones.
- `backend/app/administracion.py`: gestión de usuarios, roles, suspensión, restablecimiento de contraseñas y vehículos.
- `backend/app/geografia.py`: geocodificación inversa y búsqueda de direcciones con Nominatim.
- `backend/app/modelos.py`: definición del modelo de datos y tablas principales.
- `backend/app/esquemas.py`: contratos de entrada/salida de la API.

### Frontend importantes
- `frontend/App.js`: raíz de navegación y selección de flujo entre sesión y app principal.
- `frontend/componentes/ContextoSesion.js`: proveedor de sesión, almacenamiento local de token y refresco de usuario.
- `frontend/componentes/conexionApi.js`: configuración de Axios y manejo de token Authorization.
- `frontend/componentes/tema.js`: paleta de colores y espaciado global.
- `frontend/Pantallas/`: pantallas principales del app.
  - `PantallaInicio.js`: calendario, avisos, notificaciones y estado de rutas.
  - `PantallaContenedores.js`: mapa de contenedores, permisos de ubicación, búsqueda cercana y registro QR.
  - `PantallaReportes.js`: envío y consulta de reportes.
  - `PantallaRutas.js`: administración de rutas, edición y seguimiento para roles collector/admin.
  - `PantallaAdministracion.js`: administración de usuarios y vehículos para admin.
  - `PantallaPerfil.js`: datos de usuario y cierre de sesión.
  - `PantallaInicioSesion.js`, `PantallaRegistro.js`, `PantallaRecuperarContrasena.js`: flujo de autenticación.

## Roles y permisos

- `citizen`: usuario básico. Puede registrar contenedores por QR, ver contenedores cercanos, consultar calendario, enviar reportes y ver su perfil.
- `collector`: recolector. Puede ver rutas, iniciar recorridos, actualizar ubicación, atender paradas, registrar incidencias y ver el historial.
- `admin`: administrador. Puede gestionar usuarios, asignar roles, suspender cuentas, restablecer contraseñas, gestionar vehículos, ver todas las rutas y reportes.

## Modelo de datos resumen

- `usuarios`: usuarios de la app.
- `control_usuarios`: estado activo/suspendido y si requieren cambio de contraseña.
- `contenedores`: contenedores registrados por QR con coordenadas y contador de registros.
- `registros_ubicacion_contenedor`: historial de ubicaciones guardadas por cada registro de QR.
- `reportes`: reportes de contenedores con motivo, comentario, evidencia y estado.
- `rutas_recoleccion`: rutas programadas con día, hora, zona, descripción y estado activo.
- `rutas_contenedores`: contenedores ordenados en cada ruta.
- `asignaciones_ruta`: recolector asignado a una ruta.
- `vehiculos`: vehículos activos/inactivos.
- `ejecuciones_ruta`: recorridos activos o finalizados por recolectores.
- `paradas_ejecucion_ruta`: paradas de cada recorrido y su estado.
- `ubicaciones_ejecucion_ruta`: ubicaciones GPS registradas durante los recorridos.
- `incidencias_operativa`: incidencias o problemas creados por el recolector.
- `puntos_ruta`, `configuracion_ruta_vial`, `ruta_ejecucion_vial`: datos de cálculo de ruta vial y geometría.

## Endpoints más importantes

### Autenticación
- `POST /autenticacion/registro`
- `POST /autenticacion/iniciar-sesion`
- `POST /autenticacion/recuperar-contrasena`
- `POST /autenticacion/restablecer-contrasena`
- `GET /autenticacion/mi-usuario`
- `POST /autenticacion/cambiar-contrasena`

### Contenedores
- `POST /contenedores/registrar-qr`
- `GET /contenedores/cercanos`
- `GET /contenedores/{contenedor_id}`
- `GET /contenedores`

### Reportes
- `POST /reportes`
- `GET /reportes/mios`
- `GET /reportes`
- `PATCH /reportes/{reporte_id}/estado`

### Rutas y operación
- `GET /rutas`
- `GET /rutas/mias`
- `POST /rutas`
- `PATCH /rutas/{ruta_id}`
- `POST /rutas/{ruta_id}/recalcular`
- `GET /operacion/mi-recorrido-activo`
- `GET /operacion/historial`
- `GET /operacion/ejecuciones/{ejecucion_id}`
- `POST /operacion/rutas/{ruta_id}/iniciar`
- `POST /operacion/ejecuciones/{ejecucion_id}/ubicacion`
- `PATCH /operacion/ejecuciones/{ejecucion_id}/paradas/{parada_id}`
- `POST /operacion/ejecuciones/{ejecucion_id}/incidencias`
- `POST /operacion/ejecuciones/{ejecucion_id}/cancelar`

### Administración
- `GET /administracion/usuarios`
- `GET /administracion/recolectores`
- `POST /administracion/usuarios`
- `PATCH /administracion/usuarios/{usuario_id}`
- `POST /administracion/usuarios/{usuario_id}/restablecer-contrasena`
- `GET /administracion/vehiculos`
- `POST /administracion/vehiculos`
- `PATCH /administracion/vehiculos/{vehiculo_id}`

### Geografía
- `GET /geografia/direccion`
- `GET /geografia/buscar`

## Ejecución y ambiente local

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.principal:aplicacion --host 0.0.0.0 --port 8000 --reload
```

### Frontend Web
```powershell
cd frontend
$env:EXPO_PUBLIC_API_URL="http://127.0.0.1:8000"
npx expo start --web -c
```

### Frontend Expo Go
```powershell
cd frontend
$env:EXPO_PUBLIC_API_URL="http://<IP_LOCAL>:8000"
npm start
```

## Notas importantes

- El backend usa SQLite por defecto en `sqlite:///./vic.db`.
- La recuperación de contraseña está preparada, pero el envío de correo y el token real no están implementados.
- La app móvil usa `AsyncStorage` para persistir la sesión.
- `frontend/componentes/conexionApi.js` define `URL_API` usando `EXPO_PUBLIC_API_URL`.
- La geocodificación usa Nominatim y la ruta vial usa OSRM por defecto.
- Las evidencias se sirven como archivos estáticos desde la ruta `configuracion.url_publica_evidencias`.
- `docs/PROJECT_CONTEXT.md` ya existe y cubre parte del proyecto; este documento es la referencia directa y actualizada para el equipo.

## Referencias internas
- `README.md`: arranque rápido y despliegue Docker.
- `docs/PROJECT_CONTEXT.md`: contexto general y reglas de trabajo del equipo.
- `docs/DESPLIEGUE_LAN.md`: despliegue LAN y configuración Docker.
- `docs/MAPAS_QR.md`: configuraciones de mapas, GPS y QR.
- `docs/INTEGRACION_VICTOR.md`: integración con módulo adicional.
- `docs/VALIDACION_MAPAS_QR.md`: pruebas de mapas y QR.

## Para el asistente
Mantener este archivo como el contexto base del proyecto y usarlo en cada sesión.

---

Archivo creado para `VIC_PI` como punto de arranque y referencia rápida.