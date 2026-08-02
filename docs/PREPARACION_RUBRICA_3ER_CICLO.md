# Preparación para la rúbrica del tercer ciclo

> Documento histórico del 31 de julio. El estado vigente está en
> `docs/PLAN_RUBRICA_TECNICA.md`.

Fecha de revisión: 2026-07-31

## Alcance

La rúbrica fue revisada para ordenar el trabajo, pero sus requisitos pendientes
no se implementaron durante esta preparación. El objetivo de esta etapa fue
dejar Docker, el código, las pruebas y la documentación en un estado estable
para comenzar mañana sin mezclar cambios de infraestructura con cambios de
evaluación.

## Línea base ya disponible

- Contraseñas almacenadas mediante hash bcrypt.
- Autenticación y autorización por roles mediante JWT.
- Aplicación Expo con funciones nativas de cámara, QR, ubicación,
  notificaciones y rastreo del recolector.
- API FastAPI con validación Pydantic y base SQLite persistente.
- Aplicación web, API y motor vial opcional preparados con Docker Compose.
- Información del recorrido móvil visible también en la aplicación web.
- Pruebas automatizadas de autenticación, permisos, contenedores, reportes,
  rutas y operación.

Esta lista representa una base técnica. No debe marcarse automáticamente como
evidencia final de la rúbrica hasta probar cada punto en el entorno que se
presentará.

## Requisitos técnicos que se abordarán después

| Requisito de la rúbrica | Estado para comenzar | Primera evidencia necesaria |
| --- | --- | --- |
| Mostrar hash y cifrado funcionando | Parcial: existe bcrypt; falta definir qué información requiere cifrado reversible | Demostración y explicación de amenazas |
| Dos servidores, uno público y otro privado | Pendiente | Diagrama, redes y despliegue reproducible |
| Prometheus y Grafana | Pendiente | Métricas de API, host y contenedores |
| Firewall aplicado y monitoreado | Pendiente | Política, reglas y registros |
| Protección de API con JWT | Parcial: JWT y roles existen | Casos autorizados, rechazados, expiración y secreto seguro |
| Certificado SSL | Pendiente | Dominio, certificado válido y renovación |
| Balanceador de carga | Pendiente | Dos réplicas compatibles y prueba de distribución |
| Utilidad móvil real | Base funcional | Guion completo en un teléfono |
| Diseño móvil profesional | Revisión pendiente | Prueba en distintos tamaños y lista de ajustes |
| Navegación móvil clara | Revisión pendiente | Prueba con usuarios y flujo de demostración |
| Formularios validados antes de BD | Parcial: API validada | Matriz por formulario y pruebas negativas |
| Datos móviles reflejados en web | Base funcional | Demostración sincronizada y evidencia grabada |
| Web, API y BD alojados en nube | Pendiente | Proveedor, arquitectura y comprobaciones |
| Aplicación móvil y API 100 % funcionales | En validación continua | Lista de aceptación sin pendientes críticos |
| Teléfono funcional entregado a evaluadores | Pendiente de presentación | APK instalada, sesión preparada y plan alterno |

## Orden recomendado para mañana

1. Congelar un escenario de demostración y sus datos de prueba.
2. Diseñar la arquitectura pública/privada antes de elegir servicios.
3. Definir el modelo de amenazas y cerrar la configuración JWT.
4. Preparar TLS y firewall en el punto de entrada.
5. Añadir métricas, Prometheus y Grafana.
6. Evaluar la migración de SQLite a PostgreSQL antes de usar réplicas.
7. Incorporar el balanceador solamente cuando la API y la BD soporten
   concurrencia entre instancias.
8. Desplegar en nube y ejecutar pruebas de aceptación.
9. Preparar el teléfono, el guion de máximo 10 minutos y la participación de
   todos los integrantes.

## Evidencia que conviene reunir

- Capturas y comandos reproducibles de cada servicio.
- Diagrama con servidor público, servidor privado, puertos y flujo de datos.
- Pruebas de acceso permitido y denegado.
- Paneles de métricas y registros de alertas.
- Resultado de pruebas automatizadas y prueba física en Android.
- Video corto de respaldo por si falla la red durante la exposición.
- Lista de credenciales de demostración sin secretos reales.

## Condiciones para iniciar la implementación

- Definir qué proveedor de nube se usará.
- Confirmar si habrá dominio propio para SSL.
- Conocer los recursos disponibles para dos servidores y monitoreo.
- Decidir si PostgreSQL sustituirá a SQLite.
- Acordar quién presenta cada parte y qué teléfono se entregará.

## Riesgo técnico registrado

`expo-doctor` aprueba las 18 comprobaciones del proyecto. Al 2 de agosto,
`npm audit` reporta 15 avisos moderados transitivos del ecosistema Expo/React
Native, sin avisos altos o críticos. La corrección automática propone regresar
a una versión incompatible de Expo, por lo que no se ejecutó
`npm audit fix --force`.
