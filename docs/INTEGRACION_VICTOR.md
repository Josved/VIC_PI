# Integración del avance de Víctor

Fecha: 2026-07-30

## Fuente revisada

- Archivo: `VIC_PI-victor.zip`
- SHA-256:
  `F90DAA57A0BA4F08E44DCF340F8895CC2E86B30DD6F71F57183F0B97038C0B95`
- El ZIP fue analizado con Microsoft Defender y extraído fuera del repositorio.
- Base de comparación: commit `1c9390f`.
- Respaldo del trabajo previo a la integración: commit `dee669e`.

## Avances encontrados

Víctor agregó:

- dependencia reutilizable para exigir roles;
- modelo, esquemas y endpoints de reportes;
- permisos de recolector/administrador para administrar contenedores;
- formulario móvil de reporte con lector QR;
- historial de reportes del usuario;
- validación de nombres y límite de contraseña;
- registro público limitado al rol ciudadano.

## Decisiones de integración

Se conservaron sin reemplazo:

- Google Maps real;
- ubicación GPS del dispositivo;
- alta y actualización por código QR;
- cálculo de cercanía por Haversine;
- historial de cada detección;
- Docker, volumen SQLite y configuración LAN.

Se adaptaron:

- los reportes usan `codigo_qr` en lugar de una serie separada;
- ciudadanos consultan y reportan, pero no registran contenedores;
- recolectores y administradores registran contenedores por QR;
- recolectores y administradores ven todos los reportes y actualizan su estado;
- el escáner QR existente se reutiliza tanto para alta como para reportes.

No se copiaron:

- el mapa aproximado dibujado con posiciones relativas, porque el proyecto ya
  utiliza mapas nativos reales;
- el modelo alternativo de contenedor con serie y porcentaje de llenado, porque
  reemplazaba campos QR/GPS y rompía la base persistente existente;
- la selección pública de roles, porque permitía autoasignarse administrador.

## Evidencia de validación

- 6 pruebas backend aprobadas.
- Expo Doctor: 18/18.
- Bundles web, Android e iOS generados.
- Backend y frontend Docker saludables.
- Flujo HTTP real:
  - ciudadano intentando alta QR: `403`;
  - recolector creando contenedor: correcto;
  - ciudadano creando reporte: pendiente;
  - administrador cambiando a en revisión: correcto;
  - recolector cambiando a resuelto: correcto;
  - registro público solicitando rol administrador: `422`.

Los contenedores y reportes temporales usados por la prueba fueron retirados al
terminar. Las cuentas locales de prueba no se guardan en Git.
