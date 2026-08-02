# VIC

Aplicacion movil universitaria para localizar contenedores de reciclaje, consultar calendarios de recoleccion, reportar contenedores y recibir avisos comunitarios.

## Estructura

- `frontend/`: app movil React Native con Expo Go en JavaScript.
- `backend/`: API FastAPI con SQLAlchemy, SQLite y JWT.
- `docs/`: documentacion tecnica y acuerdos para el equipo.

Estructura principal del frontend:

- `App.js`: conecta la navegacion y decide si mostrar login o app principal.
- `index.js`: arranque de Expo.
- `Pantallas/`: pantallas visibles de la app.
- `componentes/`: botones, campos, tema, logo, conexion API y sesion.

## Inicio rapido

Frontend:

```powershell
cd frontend
npm install
npm start
```

Usar Expo Go desde el celular y escanear el QR.

Para probar autenticacion en navegador:

```powershell
cd frontend
$env:EXPO_PUBLIC_API_URL="http://127.0.0.1:8000"
npx expo start --web -c
```

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.principal:aplicacion --host 0.0.0.0 --port 8000 --reload
```

La API queda por defecto en `http://127.0.0.1:8000`.

## Docker y despliegue LAN

El proyecto incluye un despliegue completo para la aplicación web, la API y la
base SQLite persistente:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

- Web: `http://127.0.0.1:8080`
- API: `http://127.0.0.1:8000`
- Swagger por el proxy web: `http://127.0.0.1:8080/api/docs`
- Evidencias por el proxy web: `http://127.0.0.1:8080/evidencias/...`

En Windows también se puede controlar todo desde un solo script:

```powershell
.\scripts\docker.ps1 iniciar
.\scripts\docker.ps1 verificar
.\scripts\docker.ps1 logs
.\scripts\docker.ps1 apagar
```

El comando `apagar` conserva la base, las evidencias y los volúmenes.

Consultar [docs/DESPLIEGUE_LAN.md](docs/DESPLIEGUE_LAN.md) antes de instalar en
un servidor.

## Mapa, GPS y códigos QR

La aplicación móvil solicita ubicación, muestra Google Maps, escanea códigos QR
y guarda o actualiza la posición del contenedor en la API. Los contenedores
cercanos se calculan por distancia y se muestran ordenados.

La creación de claves de Google Cloud y las pruebas en Android/iOS están
documentadas en [docs/MAPAS_QR.md](docs/MAPAS_QR.md).

La evidencia automatizada y las pruebas físicas pendientes están separadas en
[docs/VALIDACION_MAPAS_QR.md](docs/VALIDACION_MAPAS_QR.md).

## Perfiles y reportes

- Los registros públicos siempre crean un perfil `citizen`.
- Todo usuario autenticado puede registrar o actualizar la ubicación de un
  contenedor por QR y enviar reportes.
- `collector` y `admin` pueden consultar todos los reportes, tomarlos y
  resolverlos con una respuesta obligatoria para el ciudadano.
- Los ciudadanos solo consultan sus propios reportes, lo que escribieron, su
  estado y la respuesta del equipo; no pueden atenderlos ni cambiar su estado.
- La pantalla Reportes permite seleccionar un contenedor por QR o por búsqueda,
  enviar motivo y comentario, y consultar el seguimiento.

## Rutas y calendario semanal

- `collector` y `admin` tienen una pestaña para crear, editar, activar o pausar
  rutas semanales.
- Cada ruta define nombre, zona, día, hora aproximada y una lista ordenada de
  contenedores.
- Los ciudadanos consultan las rutas activas desde Inicio.
- Los días con recolección aparecen en verde y abren un detalle con horario,
  zona, cantidad de contenedores y un mapa desplegable del recorrido sobre
  calles reales.
- El administrador asigna cada ruta a un recolector activo.
- El recolector inicia el recorrido, comparte GPS, atiende u omite paradas,
  registra incidencias y finaliza o cancela el servicio.
- El ciudadano consulta el progreso y la ubicación del recolector durante un
  recorrido activo; la pantalla se actualiza automáticamente.

## Administración de personal

- El registro público nunca permite elegir un rol privilegiado.
- Admin crea cuentas autorizadas con contraseña temporal.
- Admin cambia roles, suspende o reactiva cuentas y restablece contraseñas.
- Las cuentas suspendidas pierden acceso incluso si conservan un JWT anterior.
- Cada usuario puede cambiar su contraseña desde Perfil.

## Rutas viales, direcciones y vehículos

- Las rutas se calculan sobre calles reales con OSRM y datos de OpenStreetMap.
- El administrador puede agregar puntos de inicio, paso y fin desde el mapa o
  buscando una dirección, y puede cambiar el orden de toda la secuencia.
- Cada contenedor conserva coordenadas y una dirección legible obtenida por
  geocodificación inversa.
- Se guardan geometría, distancia, duración y ETA acumulado de cada parada.
- Los vehículos son deliberadamente sencillos: solamente placa y estado
  activo/inactivo.
- El mapa completo también funciona en web mediante Leaflet/OpenStreetMap.
- Durante el servicio se detecta cercanía a la siguiente parada y desvío de la
  ruta, se puede abrir navegación externa y recalcular el tramo restante.
- El recolector puede tomar una fotografía de incidencia, trabajar
  temporalmente sin conexión y sincronizar acciones al recuperar la red.
- El GPS en segundo plano está preparado para una compilación de desarrollo o
  producción; Expo Go mantiene el rastreo únicamente en primer plano.
- El ciudadano recibe ETA, distancia, placa, avance y ubicación del recorrido.
- Expo Go muestra los avisos dentro de la aplicación sin cargar el módulo push;
  las notificaciones del sistema se activan en compilaciones de desarrollo o
  producción, porque Android dejó de admitir push remoto en Expo Go desde SDK 53.

El backend usa el servicio público de OSRM por defecto. Para operar el motor
vial completamente dentro de la LAN, consultar
[docs/DESPLIEGUE_LAN.md](docs/DESPLIEGUE_LAN.md).

La integración del módulo preparado por Víctor está documentada en
[docs/INTEGRACION_VICTOR.md](docs/INTEGRACION_VICTOR.md).

## Documentacion del equipo

Leer primero [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md).

La revisión de funciones, base de datos y pendientes está en
[docs/AUDITORIA_TECNICA.md](docs/AUDITORIA_TECNICA.md).

La separación entre la preparación actual y los requisitos que se comenzarán a
implementar después está en
[docs/PREPARACION_RUBRICA_3ER_CICLO.md](docs/PREPARACION_RUBRICA_3ER_CICLO.md).
