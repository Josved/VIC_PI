# Auditoría técnica y funcional de VIC

Fecha de revisión: 2026-08-02

## Resultado

El proyecto unificado contiene autenticación segura por correo, tres perfiles con permisos diferenciados, contenedores geográficos, reportes ciudadanos, calendario y mapas de rutas, operación GPS del recolector y un panel administrativo ampliado.

La integración conserva los cambios de `main` y de `josved-seguridad-recuperacion`.

## Funciones verificadas

- Registro ciudadano sin posibilidad de elegir un rol privilegiado.
- Verificación de correo con código real, vencimiento, uso único y límites.
- Inicio de sesión, suspensión de cuentas y revocación de sesiones.
- Recuperación real de contraseña mediante SMTP.
- SecureStore para sesión nativa.
- Registro QR y actualización geográfica de contenedores.
- Consulta por distancia y mapa.
- Panel admin para crear, editar y eliminar contenedores e historial.
- Protección de eliminaciones cuando existen reportes, rutas u operaciones relacionadas.
- Reportes separados por rol: el ciudadano consulta; recolector/admin atienden y responden.
- Rutas semanales, calles reales, orden de puntos, horario, placa y asignación.
- Calendario ciudadano con mapa del recorrido.
- Recorrido del recolector, GPS, paradas, incidencias e historial.
- Docker con API, frontend Nginx y SQLite persistente.

## Seguridad comprobada

- Contraseñas con bcrypt.
- JWT firmado, con expiración y versión de sesión.
- Códigos sensibles almacenados como HMAC, no en texto plano.
- Respuestas genéricas contra enumeración en recuperación y reenvío.
- Límites de solicitudes e intentos.
- CORS restringible por ambiente y secretos de producción validados.
- Acciones administrativas protegidas por rol.
- Credenciales SMTP excluidas mediante `.gitignore`.

## Pendientes reales

- Publicar la Web y la API en el proveedor gratuito elegido.
- Generar y probar la APK Android cuando estén disponibles la URL pública y los teléfonos.
- Evaluar migración de SQLite a PostgreSQL cuando haya varios usuarios concurrentes en producción.
- Actualizar Expo en una tarea independiente; `npm audit` reporta avisos moderados en dependencias internas de las herramientas Expo y la corrección automática propone cambios incompatibles.
- Sustituir OSRM/Nominatim públicos por servicios locales si la LAN debe funcionar sin internet.

## Evidencia de validación

- Pruebas automatizadas combinadas del backend aprobadas.
- Exportación web de Expo aprobada.
- Construcción Docker de backend y frontend aprobada.
- Migraciones aplicadas conservando usuarios y datos existentes.
- SMTP probado mediante envío real.

Consultar `docs/CONTEXTO_INTERNO.md` y `docs/RECUPERACION_CORREO_Y_SEGURIDAD.md` para el detalle operativo.
