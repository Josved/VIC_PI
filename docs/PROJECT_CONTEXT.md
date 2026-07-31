# VIC - Contexto tecnico del proyecto

Ultima actualizacion: 2026-07-06

## Objetivo

VIC es una app movil para que ciudadanos puedan:

- iniciar sesion y seleccionar rol;
- consultar inicio, comunidad, calendario y anuncios;
- localizar contenedores en mapa o lista;
- reportar contenedores por QR o numero de serie.

## Stack acordado

- Frontend: React Native, Expo, Expo Go, Expo Web y JavaScript.
- Navegacion: React Navigation.
- Formularios: estados simples con `useState`.
- Validacion: validaciones basicas en cada pantalla.
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
.\.venv\Scripts\python.exe -m uvicorn app.principal:aplicacion --host 0.0.0.0 --port 8000 --reload
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

La tipografia se mantiene con la familia del sistema para evitar problemas en Expo Go. Si despues se agrega una fuente oficial, debe registrarse desde `frontend/componentes/tema.js`.

## Modulos y responsables

### Modulo 1: Autenticacion

Carpeta principal: `frontend/Pantallas`

Pantallas incluidas:

- Login
- Registro
- Recuperar contrasena
- Seleccion de rol

Endpoints esperados:

- `POST /autenticacion/registro`
- `POST /autenticacion/iniciar-sesion`
- `POST /autenticacion/recuperar-contrasena`
- `POST /autenticacion/restablecer-contrasena`
- `GET /autenticacion/mi-usuario`

Estado actual del modulo 1:

- Login funcional contra backend.
- Registro funcional contra backend.
- Seleccion de rol funcional antes de registro.
- Recuperacion de contrasena funcional como solicitud basica.
- `recuperar-contrasena` muestra confirmacion, pero todavia no envia correo real ni genera token de recuperacion.
- Sesion persistida con AsyncStorage.
- Cerrar sesion disponible desde Perfil.
- Errores de API visibles en pantalla.

### Modulo 2: Inicio y comunidad

Carpeta principal: `frontend/Pantallas`

Pantallas:

- Home
- Calendario de recoleccion
- Detalle de dia de recoleccion
- Anuncios y notificaciones

Estado actual del modulo 2:

- Integrado en `frontend/Pantallas/PantallaInicio.js` con la propuesta de Toño.
- Incluye bienvenida, anuncios, calendario semanal dinámico y detalle de día
  en modal.
- Consulta rutas activas desde la API y marca en verde los días de recolección.

### Modulo 3: Contenedores y mapa

Carpeta principal: `frontend/Pantallas`

Pantallas:

- Mapa
- Lista de contenedores
- Detalle de contenedor
- Ubicacion/permisos o contenedores cercanos

Estado actual del modulo 3:

- Implementado en `frontend/Pantallas/PantallaContenedores.js`.
- Incluye mapa visual con pines seleccionables.
- Incluye lista de contenedores.
- Incluye detalle del contenedor seleccionado.
- Incluye estado de ubicacion/permisos y contenedores cercanos.
- Los datos se consultan desde la API y cualquier usuario autenticado puede
  registrar o actualizar la ubicación de un contenedor mediante QR y GPS.

### Modulo 4: Reportes de contenedor

Carpeta principal: `frontend/Pantallas`

Pantallas:

- Elegir QR o numero de serie
- Escanear QR
- Captura manual de numero de serie
- Formulario de reporte con motivo, evidencia y confirmacion

Estado actual del modulo 4:

- Implementado en `frontend/Pantallas/PantallaReportes.js`.
- Ciudadanos consultan sus reportes; recolectores y administradores consultan
  todos y actualizan su estado.

### Modulo 5: Rutas de recoleccion

- Implementado en `frontend/Pantallas/PantallaRutas.js`.
- Recolectores y administradores crean y editan rutas semanales con día, hora,
  zona y contenedores ordenados.
- Las rutas activas alimentan el calendario del ciudadano.
- Admin asigna un responsable; el recolector inicia el recorrido, transmite GPS,
  atiende paradas, registra incidencias y cierra el servicio.
- El ciudadano consulta avance y ubicación en el detalle del calendario.

### Modulo 6: Administración

- Implementado en `frontend/Pantallas/PantallaAdministracion.js`.
- Admin crea personal autorizado, cambia roles, suspende o reactiva cuentas y
  restablece contraseñas temporales.
- Admin consulta incidencias operativas.

## Reglas de trabajo

- Guardar pantallas visibles en `frontend/Pantallas`.
- Compartir solo componentes genericos en `frontend/componentes`.
- Mantener colores y espaciados desde `frontend/componentes/tema.js`.
- Crear ramas por modulo, por ejemplo `feature/auth`, `feature/community`, `feature/containers`, `feature/reports`.
- Antes de hacer merge, ejecutar `npm run typecheck` en frontend y probar flujo principal en Expo Go.
- No subir `.env`, bases SQLite, `.venv`, `node_modules` ni archivos temporales.
- Para probar en web, usar `http://127.0.0.1:8000`.
- Para probar en Expo Go, usar la IP local de la computadora con `http://`.
- Si se cambia una variable `EXPO_PUBLIC_*`, reiniciar Expo. Si algo raro persiste, usar `npx expo start --web -c`.

## Componentes compartidos

Los componentes reutilizables viven en `frontend/componentes`:

- `Boton`: boton principal, secundario o fantasma.
- `CampoTexto`: entrada de texto simple.
- `PantallaBase`: layout base con SafeArea y scroll.
- `LogoVIC`: representacion temporal del logo usando iconos y colores VIC.
- `ContextoSesion`: guarda usuario, token y funciones de sesion.
- `PanelRecorrido`: operación GPS, paradas e incidencias del recolector.
- `MapaRuta`: recorrido, contenedores y ubicación actual en Android/iOS.

Tokens visuales:

- `frontend/componentes/tema.js`

API compartida:

- `frontend/componentes/conexionApi.js`: instancia Axios, lectura de `EXPO_PUBLIC_API_URL` y normalizacion de errores visibles.

## Backend actual

Carpeta principal: `backend/app`

- `principal.py`: crea la aplicacion, CORS, rutas y tablas.
- `autenticacion.py`: endpoints de autenticacion.
- `administracion.py`: control de usuarios, roles y contraseñas temporales.
- `rutas.py`: planeación y asignación semanal.
- `operacion.py`: recorridos, GPS, paradas e incidencias.
- `modelos.py`: usuarios, contenedores, historial GPS, reportes y rutas.
- `esquemas.py`: contratos Pydantic de autenticación, contenedores, reportes y rutas.
- `seguridad.py`: hash de contrasena y JWT.
- `base_datos.py`: motor SQLite y sesiones.
- `configuracion.py`: configuracion basica.

Dependencias importantes:

- `bcrypt==4.0.1` esta fijado porque `passlib 1.7.4` presenta problemas con versiones nuevas de `bcrypt`.
- `httpx2` esta incluido para pruebas con `TestClient` en la version actual de Starlette/FastAPI.

La base local `backend/vic.db` se genera automaticamente y NO debe subirse a Git.

## Estado actual

- Repo inicializado con estructura base.
- Frontend Expo creado.
- Navegacion principal y autenticacion listas.
- Backend FastAPI base agregado con endpoints de autenticacion.
- Modulo 2 integrado en `frontend/Pantallas/PantallaInicio.js`.
- Modulo 3 implementado en `frontend/Pantallas/PantallaContenedores.js`.
- Modulo 4 de reportes implementado.
- Modulo 5 de rutas semanales implementado.
- Modulo 6 de administración y operación en vivo implementado.
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
- Administración de recolectores, asignación de rutas y seguimiento de recorridos.

## Pendientes conocidos

- Reemplazar `LogoVIC` temporal por el archivo oficial del logo si el equipo entrega el PNG/SVG.
- Implementar recuperacion real de contrasena con token, expiracion y envio de correo si el alcance lo exige.
- Probar en Expo Go fisico antes de entrega final, sobre todo si despues se agregan camara, QR, ubicacion o mapa.
- Mantener las pruebas automatizadas al agregar nuevas funciones.
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
