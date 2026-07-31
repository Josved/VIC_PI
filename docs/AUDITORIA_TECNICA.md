# Auditoría técnica y funcional de VIC

Fecha de revisión: 2026-07-30

## Resumen

VIC tiene autenticación, navegación móvil, contenedores geográficos persistidos,
historial de detecciones QR, reportes con seguimiento por rol y rutas semanales
administradas por recolectores. Los avisos todavía son datos locales.

## Acciones disponibles

### Autenticación

- Registrar una cuenta pública, siempre como ciudadano.
- Iniciar sesión.
- Conservar la sesión localmente con AsyncStorage.
- Consultar el usuario autenticado mediante la API.
- Cerrar sesión.
- Solicitar recuperación de contraseña.
- Cambiar la contraseña desde Perfil.
- Bloquear inmediatamente cuentas suspendidas.

La solicitud de recuperación sólo devuelve una confirmación. Todavía no genera
un token, no envía correo y no cambia la contraseña.

Los perfiles recolector y administrador se asignan desde una pantalla exclusiva
para Admin. Las cuentas nuevas reciben una contraseña temporal y quedan marcadas
para cambiarla.

### Inicio y comunidad

- Consultar avisos locales.
- Consultar desde la API un calendario semanal de rutas activas.
- Identificar en verde los días con recolección.
- Abrir el detalle de un día con hora aproximada, zona y contenedores.

Todavía no existen tablas ni endpoints para administrar avisos.

### Contenedores

- Solicitar ubicación GPS en primer plano.
- Mostrar Google Maps en Android e iOS.
- Escanear un QR con la cámara.
- Crear o actualizar la ubicación persistida del contenedor.
- Guardar un historial de cada detección.
- Consultar contenedores dentro de 1, 5 o 10 kilómetros.
- Ordenar por distancia y seleccionar marcadores o elementos de la lista.
- Permitir el registro o actualización por QR a cualquier usuario autenticado.

### Rutas semanales

- Crear rutas con nombre, zona, día y hora aproximada.
- Seleccionar y ordenar los contenedores del recorrido.
- Editar, activar o pausar rutas.
- Limitar la gestión a recolectores y administradores.
- Permitir que los ciudadanos consulten únicamente las rutas activas.
- Asignar un recolector responsable a cada ruta.
- Iniciar y finalizar recorridos con una copia ordenada de sus paradas.
- Compartir GPS durante el recorrido.
- Marcar paradas como recolectadas, omitidas o con incidencia.
- Mostrar al ciudadano estado, progreso y ubicación del recorrido.

### Administración

- Crear cuentas autorizadas de ciudadano, recolector o administrador.
- Cambiar roles.
- Suspender y reactivar cuentas.
- Restablecer contraseñas temporales.
- Consultar incidencias operativas.

### Reportes

- Seleccionar un contenedor por QR, código o ID.
- Registrar motivo, comentario y enlace de evidencia opcional.
- Consultar los reportes propios.
- Permitir a recolectores y administradores consultar todos los reportes.
- Cambiar el estado a pendiente, en revisión o resuelto.

### Perfil

- Muestra los datos, rol y capacidades de la sesión.
- Ofrece acceso directo a Rutas para recolector y administrador.
- Permite cerrar sesión.

## API existente

- `GET /`: estado básico del servicio.
- `GET /salud`: comprobación para Docker.
- `POST /autenticacion/registro`: crea usuario y devuelve JWT.
- `POST /autenticacion/iniciar-sesion`: autentica y devuelve JWT.
- `POST /autenticacion/recuperar-contrasena`: confirmación simulada.
- `POST /autenticacion/restablecer-contrasena`: endpoint simulado.
- `GET /autenticacion/mi-usuario`: devuelve el usuario del JWT.
- `POST /autenticacion/cambiar-contrasena`: cambia la contraseña autenticada.
- `POST /contenedores/registrar-qr`: alta o actualización por QR y GPS.
- `GET /contenedores/cercanos`: consulta autenticada por radio y distancia.
- `GET /contenedores`: lista autenticada.
- `GET /contenedores/{id}`: detalle autenticado.
- `POST /reportes`: crea un reporte autenticado.
- `GET /reportes/mios`: lista los reportes del usuario.
- `GET /reportes`: lista global para recolector y administrador.
- `PATCH /reportes/{id}/estado`: actualiza estado con rol autorizado.
- `GET /rutas`: calendario de rutas activas para usuarios autenticados.
- `GET /rutas/mias`: rutas gestionables por recolector o administrador.
- `POST /rutas`: crea una ruta semanal.
- `PATCH /rutas/{id}`: edita, activa o pausa una ruta autorizada.
- `GET /administracion/usuarios`: lista cuentas para Admin.
- `POST /administracion/usuarios`: crea una cuenta autorizada.
- `PATCH /administracion/usuarios/{id}`: cambia rol o estado.
- `POST /administracion/usuarios/{id}/restablecer-contrasena`: crea una clave
  temporal.
- `GET /administracion/recolectores`: lista recolectores activos.
- `GET /operacion/mi-recorrido-activo`: recorrido actual del recolector.
- `POST /operacion/rutas/{id}/iniciar`: inicia recorrido y GPS.
- `POST /operacion/ejecuciones/{id}/ubicacion`: guarda posición en vivo.
- `PATCH /operacion/ejecuciones/{id}/paradas/{parada_id}`: atiende una parada.
- `POST /operacion/ejecuciones/{id}/incidencias`: registra una incidencia.
- `POST /operacion/ejecuciones/{id}/finalizar`: completa el recorrido.
- `POST /operacion/ejecuciones/{id}/cancelar`: cancela con motivo.
- `GET /operacion/incidencias`: consulta incidencias autorizadas.
- `GET /docs`: documentación Swagger.

## Base de datos

Motor actual: SQLite.

Archivo local: `backend/vic.db`.

En Docker se guarda en el volumen persistente `vic_data`, dentro del contenedor
como `/data/vic.db`.

La tabla de identidad es `usuarios`:

| Campo | Tipo | Uso |
| --- | --- | --- |
| `id` | INTEGER | Llave primaria |
| `nombre` | VARCHAR(80) | Nombre |
| `apellidos` | VARCHAR(120) | Apellidos |
| `correo` | VARCHAR(180) | Correo único |
| `contrasena_hash` | VARCHAR(255) | Hash bcrypt |
| `rol` | VARCHAR(40) | citizen, collector o admin |
| `creado_en` | DATETIME | Fecha de alta |
| `actualizado_en` | DATETIME | Última actualización |

- `contenedores`: ubicación vigente, precisión, contador y usuarios de alta y
  actualización.
- `registros_ubicacion_contenedor`: historial inmutable de detecciones con
  usuario, GPS, precisión y fecha.
- `reportes`: contenedor, usuario, motivo, comentario, evidencia, estado y
  marcas de tiempo.
- `rutas_recoleccion`: nombre, zona, día, hora, estado, creador y marcas de
  tiempo.
- `rutas_contenedores`: relación ordenada de contenedores por ruta.
- `control_usuarios`: activación y cambio obligatorio de contraseña.
- `asignaciones_ruta`: recolector responsable de cada ruta.
- `ejecuciones_ruta`: recorrido real, estado y última posición.
- `paradas_ejecucion_ruta`: resultado de cada contenedor del recorrido.
- `ubicaciones_ejecucion_ruta`: historial GPS del recolector.
- `incidencias_operativas`: problemas encontrados durante el servicio.
- `detalles_contenedor`: dirección legible y componentes de calle.
- `vehiculos`: placa y estado, sin información innecesaria.
- `configuraciones_ruta_vial`: geometría, distancia, duración y proveedor.
- `puntos_ruta`: secuencia de inicio, contenedores, pasos y fin con ETA.
- `rutas_ejecucion_vial`: geometría y ETA restante después de recalcular.

No existen todavía tablas para tokens de recuperación. Los avisos operativos se
derivan del estado de la ruta y las evidencias se almacenan en el volumen
persistente.

## Limitaciones antes de considerarlo completo

- Implementar recuperación real de contraseña.
- Sustituir la migración compatible de tablas complementarias por Alembic antes
  de una evolución grande del esquema.
- Definir copias de seguridad del volumen SQLite.
- Evaluar PostgreSQL si habrá varios procesos de escritura o crecimiento.
- Realizar la etapa de seguridad antes de exponer el sistema fuera de la LAN.

## Preparación aplicada

- Configuración del backend mediante variables de entorno.
- Base SQLite persistente mediante volumen Docker.
- Endpoint de salud.
- Imagen del backend con FastAPI/Uvicorn.
- Compilación web de Expo y servicio estático con Nginx.
- Proxy `/api` para que el navegador y la API compartan origen.
- Puerto directo de API para pruebas con Expo Go en la LAN.
- Diez pruebas automatizadas de QR ciudadano, administración, suspensión de
  cuentas, GPS, reportes, rutas, recorridos, incidencias y permisos por rol.
