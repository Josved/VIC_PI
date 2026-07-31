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
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
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

## Documentacion del equipo

Leer primero [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md).

La revisión de funciones, base de datos y pendientes está en
[docs/AUDITORIA_TECNICA.md](docs/AUDITORIA_TECNICA.md).
