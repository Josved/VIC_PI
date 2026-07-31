# Despliegue de VIC con Docker en una red LAN

## Requisitos del servidor

- Docker Engine o Docker Desktop con Docker Compose.
- Puertos TCP configurados en `VIC_WEB_PORT` y `VIC_API_PORT` disponibles
  (`8080` y `8000` por defecto).
- Una dirección IP fija o reservada por DHCP.

## Configuración inicial

Desde la raíz del proyecto:

```powershell
Copy-Item .env.example .env
```

Editar `.env` y reemplazar `VIC_JWT_SECRET`. El archivo `.env` está excluido de
Git.

## Construir e iniciar

```powershell
docker compose up -d --build
docker compose ps
```

Servicios:

- Aplicación web: `http://IP_DEL_SERVIDOR:VIC_WEB_PORT`
- Swagger mediante proxy: `http://IP_DEL_SERVIDOR:VIC_WEB_PORT/api/docs`
- API directa para Expo Go: `http://IP_DEL_SERVIDOR:VIC_API_PORT`

Para Expo Go, configurar:

```powershell
$env:EXPO_PUBLIC_API_URL="http://IP_DEL_SERVIDOR:VIC_API_PORT"
npm start
```

En la estación de desarrollo validada se usan `VIC_WEB_PORT=18080` y
`VIC_API_PORT=18000`, por lo que Expo Go apunta a
`http://192.168.100.18:18000`. En el servidor LAN se pueden conservar los
valores por defecto o elegir otros puertos libres.

## Operación

Ver registros:

```powershell
docker compose logs -f
```

Reiniciar:

```powershell
docker compose restart
```

Actualizar después de recibir cambios:

```powershell
git pull
docker compose up -d --build
```

Detener sin borrar la base:

```powershell
docker compose down
```

No usar `docker compose down -v` en el servidor: la opción `-v` elimina el
volumen que contiene SQLite.

## Copia de seguridad de SQLite

La base vive en el volumen `vic_data`. Antes de automatizar respaldos, detener
temporalmente el backend para obtener una copia consistente:

```powershell
docker compose stop backend
docker run --rm -v vic_data:/data -v "${PWD}:/backup" alpine `
  cp /data/vic.db /backup/vic-backup.db
docker compose start backend
```

Guardar los respaldos fuera del servidor principal.

## Firewall

Permitir `VIC_WEB_PORT/TCP` para los usuarios de la aplicación. Permitir
`VIC_API_PORT/TCP` solamente si se usará Expo Go o acceso directo a la API.
En la estación de desarrollo existe la regla `VIC Mobile LAN`, limitada al
perfil privado y a TCP `8081` (Expo) y `18000` (API). En la etapa de seguridad
se deben restringir orígenes CORS, puertos, credenciales, TLS, cabeceras y
permisos de los contenedores.

## Migración a otro servidor

1. Copiar o clonar el repositorio.
2. Copiar el `.env` por un canal seguro.
3. Restaurar `vic.db` dentro del volumen `vic_data`.
4. Ejecutar `docker compose up -d --build`.
5. Verificar `/api/salud`, `/api/docs` y la aplicación web.
