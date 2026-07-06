# VIC

Aplicacion movil universitaria para localizar contenedores de reciclaje, consultar calendarios de recoleccion, reportar contenedores y recibir avisos comunitarios.

## Estructura

- `frontend/`: app movil React Native con Expo Go y TypeScript.
- `backend/`: API FastAPI con SQLAlchemy, SQLite y JWT.
- `docs/`: documentacion tecnica y acuerdos para el equipo.

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
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

La API queda por defecto en `http://127.0.0.1:8000`.

## Documentacion del equipo

Leer primero [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md).



el bueno:
 .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload