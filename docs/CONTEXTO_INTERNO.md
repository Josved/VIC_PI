# Contexto interno del proyecto VIC

Actualizado: 2026-08-02

## Objetivo

VIC es una aplicación Expo/React Native con API FastAPI para gestionar contenedores, reportes ciudadanos, rutas de recolección, operación de recolectores y administración del personal.

## Stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite, JWT, bcrypt y SMTP con TLS.
- Frontend: Expo SDK 54, React Native, React Navigation, Axios, mapas, cámara, ubicación y notificaciones locales.
- Despliegue: Docker Compose, Nginx y volumen persistente `vic_data`.

## Roles

- `citizen`: consulta mapas/calendario, registra ubicación por QR, crea reportes y consulta sus respuestas.
- `collector`: además gestiona rutas asignadas, recorridos, GPS, paradas e incidencias.
- `admin`: administra usuarios, vehículos, reportes, rutas, contenedores e historial de ubicaciones.

El registro público siempre crea ciudadanos. Recolectores y administradores solo pueden ser creados o asignados desde administración.

## Autenticación y seguridad

- Las cuentas ciudadanas nuevas deben verificar su correo mediante un código real de ocho caracteres.
- Los códigos de verificación y recuperación son aleatorios, se guardan como HMAC, vencen, son de un solo uso y tienen límites de solicitudes e intentos.
- La recuperación de contraseña envía correo real por SMTP y revoca las sesiones anteriores.
- Las contraseñas se almacenan con bcrypt; los JWT incluyen expiración y versión de sesión.
- Android/iOS almacena la sesión con `expo-secure-store`; web utiliza AsyncStorage como compatibilidad.
- Docker rechaza secretos JWT predeterminados en producción.
- Las credenciales SMTP solo viven en `.env`, que está ignorado por Git.

## Funciones actuales

### Ciudadano

- Registro y verificación de correo.
- Inicio de sesión, recuperación y cambio de contraseña.
- Mapa y búsqueda de contenedores cercanos.
- Registro/actualización de ubicación mediante QR.
- Creación y seguimiento de reportes propios.
- Calendario semanal de recolección y mapa de la ruta seleccionada.
- Consulta del progreso y ubicación disponible de recorridos.

### Recolector

- Consulta de rutas asignadas.
- Inicio, seguimiento, finalización o cancelación de recorridos.
- Actualización GPS y conservación de historial.
- Atención de paradas e incidencias operativas.
- Consulta del historial de ubicación de contenedores.

### Administrador

- Creación de cuentas autorizadas y contraseñas temporales.
- Cambio de roles, suspensión, reactivación y restablecimiento de contraseña.
- Gestión de vehículos por placa.
- Gestión de reportes y respuestas al ciudadano.
- Creación/edición de rutas, puntos, orden, horarios, vehículo y recolector.
- Alta, edición y eliminación protegida de contenedores.
- Alta, edición y eliminación del historial de ubicaciones.

## Módulos principales

- `backend/app/autenticacion.py`: sesión, verificación de correo y recuperación.
- `backend/app/correo.py`: envío SMTP con TLS.
- `backend/app/contenedores.py`: QR, mapa, CRUD e historial.
- `backend/app/reportes.py`: reportes ciudadanos y atención por roles.
- `backend/app/rutas.py`: calendario, rutas viales, asignaciones y geometría.
- `backend/app/operacion.py`: recorrido, GPS, paradas e incidencias.
- `backend/app/administracion.py`: usuarios y vehículos.
- `backend/app/geografia.py`: direcciones con Nominatim.
- `backend/app/modelos.py`: tablas SQLAlchemy.
- `backend/app/migraciones.py`: compatibilidad con bases SQLite existentes.
- `frontend/componentes/ContextoSesion.js`: sesión y API de autenticación.
- `frontend/componentes/almacenamientoSeguro.js`: SecureStore nativo.
- `frontend/Pantallas/PantallaAdministracion.js`: panel administrativo completo.

## Tablas principales

- `usuarios`, `control_usuarios`.
- `verificaciones_correo`, `recuperaciones_contrasena`.
- `contenedores`, `detalles_contenedor`, `registros_ubicacion_contenedor`.
- `reportes`.
- `rutas_recoleccion`, `rutas_contenedores`, `asignaciones_ruta`.
- `vehiculos`, `configuraciones_ruta_vial`, `puntos_ruta`.
- `ejecuciones_ruta`, `paradas_ejecucion_ruta`, `ubicaciones_ejecucion_ruta`.
- `incidencias_operativas`, `rutas_ejecucion_vial`.

## Estado conocido

- Backend, frontend y base de datos funcionan en Docker.
- SMTP real está configurado localmente y no se versiona.
- La entrega móvil utilizará una APK. Los mensajes y notificaciones locales
  funcionan; el push remoto se configurará opcionalmente con FCM.
- OSRM/Nominatim públicos requieren internet; para LAN sin internet se debe habilitar el servicio OSRM local.
- La versión web se sirve por Nginx con HTTPS autofirmado en la simulación.

## Validación

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\backend"
& .\.venv\Scripts\python.exe -m unittest discover -s tests -v

cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\frontend"
npm run typecheck

cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
docker compose up -d --build
docker compose ps
```

No agregar dependencias descargadas, entornos virtuales, bases de datos, credenciales ni carpetas de herramientas de análisis al repositorio.
