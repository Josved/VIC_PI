# Auditoría técnica y funcional de VIC

Fecha de revisión: 2026-07-30

## Resumen

VIC tiene una base funcional para autenticación y una interfaz navegable para
inicio, contenedores, reportes y perfil. En este momento sólo los usuarios se
guardan en el backend. Los avisos, el calendario y los contenedores son datos
locales de demostración; reportes todavía es una pantalla base.

## Acciones disponibles

### Autenticación

- Seleccionar rol: ciudadano, recolector o administrador.
- Registrar una cuenta.
- Iniciar sesión.
- Conservar la sesión localmente con AsyncStorage.
- Consultar el usuario autenticado mediante la API.
- Cerrar sesión.
- Solicitar recuperación de contraseña.

La solicitud de recuperación sólo devuelve una confirmación. Todavía no genera
un token, no envía correo y no cambia la contraseña.

### Inicio y comunidad

- Consultar avisos locales de demostración.
- Consultar un calendario semanal local.
- Abrir y cerrar el detalle de un día.

No existen tablas ni endpoints para administrar avisos o calendarios.

### Contenedores

- Solicitar ubicación GPS en primer plano.
- Mostrar Google Maps en Android e iOS.
- Escanear un QR con la cámara.
- Crear o actualizar la ubicación persistida del contenedor.
- Guardar un historial de cada detección.
- Consultar contenedores dentro de 1, 5 o 10 kilómetros.
- Ordenar por distancia y seleccionar marcadores o elementos de la lista.

### Reportes

- Incluye el acceso al flujo funcional de registro por QR y GPS.

Todavía no existe el reporte de incidencias con motivo, fotografía, evidencia y
seguimiento.

### Perfil

- Muestra los datos de la sesión.
- Permite cerrar sesión.

## API existente

- `GET /`: estado básico del servicio.
- `GET /salud`: comprobación para Docker.
- `POST /autenticacion/registro`: crea usuario y devuelve JWT.
- `POST /autenticacion/iniciar-sesion`: autentica y devuelve JWT.
- `POST /autenticacion/recuperar-contrasena`: confirmación simulada.
- `POST /autenticacion/restablecer-contrasena`: endpoint simulado.
- `GET /autenticacion/mi-usuario`: devuelve el usuario del JWT.
- `POST /contenedores/registrar-qr`: alta o actualización por QR y GPS.
- `GET /contenedores/cercanos`: consulta autenticada por radio y distancia.
- `GET /contenedores`: lista autenticada.
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

La base revisada tenía cero usuarios. El módulo de mapa agrega:

- `contenedores`: ubicación vigente, precisión, contador y usuarios de alta y
  actualización.
- `registros_ubicacion_contenedor`: historial inmutable de detecciones con
  usuario, GPS, precisión y fecha.

No existen todavía tablas para reportes de incidencias, avisos, calendario,
archivos o tokens de recuperación.

## Limitaciones antes de considerarlo completo

- Completar administración, estados y permisos por rol para contenedores.
- Implementar reportes, estados, evidencia y almacenamiento de archivos.
- Implementar avisos y calendario desde el backend.
- Implementar recuperación real de contraseña.
- Añadir migraciones de esquema; actualmente se usa `create_all`.
- Añadir pruebas automatizadas.
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
