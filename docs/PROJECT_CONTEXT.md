# VIC - Contexto tecnico del proyecto

Ultima actualizacion: 2026-07-06

## Objetivo

VIC es una app movil para que ciudadanos puedan:

- iniciar sesion y seleccionar rol;
- consultar inicio, comunidad, calendario y anuncios;
- localizar contenedores en mapa o lista;
- reportar contenedores por QR o numero de serie.

## Stack acordado

- Frontend: React Native, Expo, Expo Go, Expo Web y TypeScript.
- Navegacion: React Navigation.
- Formularios: React Hook Form.
- Validacion: Zod.
- HTTP: Axios.
- Sesion local: AsyncStorage.
- Backend: FastAPI, SQLAlchemy, SQLite, JWT.

## Estructura del repo

- `frontend/`: aplicacion Expo.
- `backend/`: API FastAPI.
- `docs/`: documentacion tecnica para el equipo.
- `README.md`: arranque rapido del proyecto.

## Comandos principales

### Backend

Desde PowerShell:

```powershell
cd D:\GITT\VIC_PI\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Si el entorno virtual no existe:

```powershell
cd D:\GITT\VIC_PI\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Frontend Web

Usar esta opcion para probar el modulo de autenticacion en la laptop:

```powershell
cd D:\GITT\VIC_PI\frontend
$env:EXPO_PUBLIC_API_URL="http://127.0.0.1:8000"
npx expo start --web -c
```

### Frontend Expo Go

Usar esta opcion para probar en celular fisico. La computadora y el telefono deben estar en la misma red WiFi:

```powershell
cd D:\GITT\VIC_PI\frontend
$env:EXPO_PUBLIC_API_URL="http://TU_IP_LOCAL:8000"
npm start
```

Importante: la URL debe incluir `http://`. Ejemplo correcto:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.7:8000"
```

Ejemplo incorrecto:

```powershell
$env:EXPO_PUBLIC_API_URL="192.168.0.7:8000"
```

Si falta `http://`, Axios no construye bien la peticion y la app puede parecer que no hace nada.

## Paleta y marca

La interfaz usa los colores del logo VIC:

- Verde principal: `#0B8F3A`
- Verde profundo: `#08712F`
- Verde claro: `#43B649`
- Naranja principal: `#FF7A00`
- Naranja profundo: `#F25A00`
- Fondo: `#FFFFFF`
- Texto principal: `#17332A`

La tipografia se mantiene con la familia del sistema para evitar problemas en Expo Go. Si despues se agrega una fuente oficial, debe registrarse una sola vez en `frontend/src/shared/theme/typography.ts`.

## Modulos y responsables

### Modulo 1: Autenticacion

Carpeta principal: `frontend/src/features/auth`

Pantallas incluidas:

- Login
- Registro
- Recuperar contrasena
- Seleccion de rol

Endpoints esperados:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

Estado actual del modulo 1:

- Login funcional contra backend.
- Registro funcional contra backend.
- Seleccion de rol funcional antes de registro.
- Recuperacion de contrasena funcional como solicitud basica.
- `forgot-password` muestra confirmacion, pero todavia no envia correo real ni genera token de recuperacion.
- Sesion persistida con AsyncStorage.
- Cerrar sesion disponible desde Perfil.
- Errores de API visibles en pantalla.

### Modulo 2: Inicio y comunidad

Carpeta sugerida: `frontend/src/features/community`

Pantallas:

- Home
- Calendario de recoleccion
- Detalle de dia de recoleccion
- Anuncios y notificaciones

### Modulo 3: Contenedores y mapa

Carpeta sugerida: `frontend/src/features/containers`

Pantallas:

- Mapa
- Lista de contenedores
- Detalle de contenedor
- Ubicacion/permisos o contenedores cercanos

### Modulo 4: Reportes de contenedor

Carpeta sugerida: `frontend/src/features/reports`

Pantallas:

- Elegir QR o numero de serie
- Escanear QR
- Captura manual de numero de serie
- Formulario de reporte con motivo, evidencia y confirmacion

## Reglas de trabajo

- No mezclar modulos en la misma carpeta.
- Compartir solo componentes genericos en `frontend/src/shared`.
- Mantener colores, espaciados y tipografia desde `frontend/src/shared/theme`.
- Crear ramas por modulo, por ejemplo `feature/auth`, `feature/community`, `feature/containers`, `feature/reports`.
- Antes de hacer merge, ejecutar `npm run typecheck` en frontend y probar flujo principal en Expo Go.
- No subir `.env`, bases SQLite, `.venv`, `node_modules` ni archivos temporales.
- Para probar en web, usar `http://127.0.0.1:8000`.
- Para probar en Expo Go, usar la IP local de la computadora con `http://`.
- Si se cambia una variable `EXPO_PUBLIC_*`, reiniciar Expo. Si algo raro persiste, usar `npx expo start --web -c`.

## Componentes compartidos

Los componentes reutilizables viven en `frontend/src/shared/components`:

- `Button`: boton principal/secondary/ghost.
- `TextField`: input controlado con React Hook Form.
- `Screen`: layout base con SafeArea y scroll.
- `VicLogo`: representacion temporal del logo usando iconos y colores VIC.

Tokens visuales:

- `frontend/src/shared/theme/colors.ts`
- `frontend/src/shared/theme/spacing.ts`
- `frontend/src/shared/theme/typography.ts`

API compartida:

- `frontend/src/shared/api/http.ts`: instancia Axios.
- `frontend/src/shared/api/errors.ts`: normalizacion de errores visibles.
- `frontend/src/shared/config/env.ts`: lectura de `EXPO_PUBLIC_API_URL`.

## Backend actual

Carpeta principal: `backend/app`

- `main.py`: crea la app, CORS, routers y tablas.
- `auth.py`: endpoints de autenticacion.
- `models.py`: modelo SQLAlchemy `Usuario`.
- `schemas.py`: esquemas Pydantic.
- `security.py`: hash de password y JWT.
- `database.py`: engine SQLite y sesiones.
- `config.py`: configuracion basica.

Dependencias importantes:

- `bcrypt==4.0.1` esta fijado porque `passlib 1.7.4` presenta problemas con versiones nuevas de `bcrypt`.
- `httpx2` esta incluido para pruebas con `TestClient` en la version actual de Starlette/FastAPI.

La base local `backend/vic.db` se genera automaticamente y NO debe subirse a Git.

## Estado actual

- Repo inicializado con estructura base.
- Frontend Expo creado.
- Navegacion principal y autenticacion listas.
- Backend FastAPI base agregado con endpoints de autenticacion.
- Pantallas placeholder agregadas para modulos 2, 3 y 4.
- Frontend y backend probados en web.
- `npm run typecheck` pasa correctamente.

## Flujo probado el 2026-07-06

Se valido:

- Backend en `http://127.0.0.1:8000`.
- Swagger en `/docs`.
- Registro de usuario.
- Inicio de sesion.
- Persistencia de sesion.
- Cierre de sesion.
- Recuperacion de contrasena con mensaje de confirmacion.
- Correccion de `EXPO_PUBLIC_API_URL` con protocolo `http://`.

## Pendientes conocidos

- Reemplazar `VicLogo` temporal por el archivo oficial del logo si el equipo entrega el PNG/SVG.
- Implementar recuperacion real de contrasena con token, expiracion y envio de correo si el alcance lo exige.
- Probar en Expo Go fisico antes de entrega final, sobre todo si despues se agregan camara, QR, ubicacion o mapa.
- Agregar pruebas automatizadas si el profesor/equipo las solicita.
- Crear documentacion final de capturas para Zeroheight cuando el flujo definitivo este cerrado.

## Checklist antes de commit

- Ejecutar `npm run typecheck` en `frontend`.
- Confirmar que backend corre con Uvicorn.
- Probar registro/login/logout al menos una vez.
- Verificar que Git NO incluya:
  - `backend/.venv/`
  - `backend/vic.db`
  - `backend/app/__pycache__/`
  - `frontend/node_modules/`
  - `frontend/.expo/`

Comando sugerido:

```bash
git add .gitignore README.md backend docs frontend
git status
git commit -m "Initial VIC app structure with auth module"
```
