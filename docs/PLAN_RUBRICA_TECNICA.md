# Plan de cumplimiento - rúbrica técnica del tercer ciclo

Fecha de revisión: 2 de agosto de 2026

## Arquitectura objetivo

```text
Teléfono / navegador
        |
        | HTTPS :8443
        v
vic-publico (10.20.0.10)
  Nginx + frontend + certificado SSL + balanceador
        |
        | red interna vic-privada
        v
vic-privado (10.20.0.20)
  backend-a + backend-b + SQLite + Prometheus + Grafana
```

El servidor privado no acepta conexiones desde la LAN. El único tráfico de la
aplicación entra por Nginx en el servidor público. Ambos servidores tienen UFW
con denegación de entrada por defecto.

## Matriz de cumplimiento

| Requisito técnico | Estado | Evidencia prevista |
| --- | --- | --- |
| Hash y cifrado | Cumple en código | bcrypt para contraseñas, HMAC para códigos, JWT firmado y TLS para datos en tránsito |
| Servidor público y privado | En instalación | Dos VM de Ubuntu: `vic-publico` y `vic-privado` |
| Prometheus y Grafana | Configurado, falta desplegar | Dashboard VIC, métricas de API, host y contenedores |
| Firewall aplicado y monitoreado | Configurado, falta desplegar | Reglas UFW y métricas/logs mostrados en la demostración |
| Protección JWT de la API | Cumple | Rutas protegidas, autorización por rol y revocación por versión de sesión |
| Certificado SSL | Configurado, falta desplegar | Certificado autofirmado para LAN; en nube se cambiará por Let's Encrypt |
| Balanceador de carga | Configurado, falta desplegar | Nginx `least_conn` hacia dos réplicas de FastAPI |
| Aplicación móvil útil | Cumple | QR, GPS, mapas, ruta del recolector, calendario y reportes |
| Diseño móvil profesional | Cumple con mejoras pendientes | Navegación por perfiles; falta una última revisión visual |
| Navegación móvil clara | Cumple | Pestañas por función y restricciones por rol |
| Formularios validados | Cumple | Validación de interfaz y esquemas Pydantic en la API |
| Datos móviles visibles en Web | Cumple | Aplicación web y móvil consumen la misma API y BD |
| Web, API y BD en nube | Pendiente | Se realizará después de validar la infraestructura en LAN |
| Aplicación móvil 100% funcional | En preparación | Funciones principales listas; push remoto requiere development build y FCM |
| Teléfono para evaluadores | Pendiente de presentación | Instalar la compilación final y preparar una cuenta por perfil |

## Evidencias que se deben capturar

1. VirtualBox mostrando las dos VM encendidas.
2. `ufw status verbose` en cada servidor.
3. Acceso HTTPS y detalle del certificado.
4. Respuesta protegida `401` sin JWT y respuesta válida con JWT.
5. Nginx distribuyendo tráfico entre las dos réplicas.
6. Grafana mostrando disponibilidad, solicitudes, latencia, CPU y contenedores.
7. Un cambio hecho desde el teléfono reflejado inmediatamente en la web.

No se debe marcar como cumplido el alojamiento en nube hasta que el despliegue
externo esté terminado y verificado.
