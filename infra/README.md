# Infraestructura técnica VIC

Esta carpeta divide el sistema en dos servidores de VirtualBox conectados por
la red interna `vic-privada`.

## Topología

| Servidor | Red interna | Exposición | Responsabilidad |
| --- | --- | --- | --- |
| `vic-publico` | `10.20.0.10/24` | HTTP, HTTPS y SSH | Frontend web, terminación TLS y balanceo Nginx |
| `vic-privado` | `10.20.0.20/24` | Solo SSH desde el host | Dos réplicas de API, BD, Prometheus y Grafana |

VirtualBox publica los siguientes puertos del laboratorio:

- `127.0.0.1:2222` -> SSH del servidor público.
- `0.0.0.0:8088` -> HTTP público; redirige a HTTPS.
- `0.0.0.0:8443` -> HTTPS público.
- `127.0.0.1:2223` -> SSH del servidor privado.

La aplicación se abre desde la computadora anfitriona en
`https://localhost:8443`. En la LAN se usa
`https://IP_DEL_EQUIPO:8443`.

## Correspondencia con la rúbrica

- Dos servidores: separación real de entrada pública y servicios privados.
- Hash y cifrado: bcrypt para contraseñas y hashes HMAC para códigos temporales.
- Monitoreo: Prometheus, Grafana, Node Exporter y cAdvisor.
- Firewall: UFW con política de denegación por defecto y métricas de estado,
  reglas y bloqueos exportadas cada 30 segundos.
- JWT: la API conserva la autenticación y autorización por roles con JWT.
- SSL: Nginx termina TLS; el laboratorio usa un certificado autofirmado.
- Balanceador: Nginx distribuye `/api` entre `backend-a` y `backend-b`.

## Orden de instalación

1. Copiar el repositorio a `/opt/vic` en ambos servidores.
2. Copiar el archivo Netplan correspondiente a `/etc/netplan/60-vic.yaml`.
3. Crear `.env` desde `.env.example` en cada servidor.
4. En el privado, ejecutar `sudo bash configurar.sh`.
5. En el público, ejecutar `sudo bash generar-certificado.sh` y después
   `sudo bash configurar.sh`.

Nunca se deben subir a Git los archivos `.env`, las contraseñas SMTP ni la
clave privada del certificado.

La preparación equivalente para AWS, sin crear recursos facturables, se
encuentra en `infra/aws/README.md`.
