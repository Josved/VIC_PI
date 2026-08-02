# Google Maps, ubicación y registro QR

## Flujo implementado

1. El usuario abre la pestaña **Mapa**.
2. VIC solicita permiso de ubicación en primer plano.
3. El mapa se centra en la posición GPS del teléfono.
4. La aplicación consulta los contenedores guardados dentro del radio elegido.
5. Al pulsar **Escanear QR**, VIC solicita permiso de cámara.
6. Cuando detecta un QR, obtiene una lectura GPS de alta precisión.
7. La API crea el contenedor si el QR es nuevo o actualiza su ubicación si ya
   existía.
8. Cada detección queda además en el historial de ubicaciones.
9. El mapa y la lista se actualizan, ordenados por distancia.

La ubicación guardada es la del teléfono que escanea. Un QR por sí solo no
contiene GPS ni puede medir su posición física; por eso se debe escanear junto
al contenedor.

## Componentes

- `react-native-maps`: mapa nativo.
- `expo-location`: permisos y GPS.
- `expo-camera`: cámara y lectura de QR.
- FastAPI: alta/actualización y consulta por cercanía.
- SQLite: posición vigente e historial de detecciones.

Versiones instaladas para Expo SDK 54:

- `react-native-maps` 1.20.1
- `expo-location` 19.0.8
- `expo-camera` 17.0.10

Documentación oficial:

- [Mapas en Expo](https://docs.expo.dev/versions/v54.0.0/sdk/map-view/)
- [Ubicación en Expo](https://docs.expo.dev/versions/latest/sdk/location/)
- [Cámara y códigos QR en Expo](https://docs.expo.dev/versions/v54.0.0/sdk/camera/)
- [Maps SDK para Android](https://developers.google.com/maps/documentation/android-sdk/get-api-key)
- [Maps SDK para iOS](https://developers.google.com/maps/documentation/ios-sdk/get-api-key)

## Google Cloud para una compilación propia futura

Esta sección aplica a la APK Android si se utiliza una clave propia de Google
Maps. La Web conserva Leaflet/OpenStreetMap.

Crear un proyecto de Google Cloud con facturación habilitada y activar:

- Maps SDK for Android.
- Maps SDK for iOS.

Crear dos claves distintas.

### Android

Restringir la clave como aplicación Android:

- Package: `com.josved.vic`
- SHA-1: huella del certificado que firma la APK/AAB.
- API permitida: Maps SDK for Android.

### iOS

Restringir la clave como aplicación iOS:

- Bundle ID: `com.josved.vic`
- API permitida: Maps SDK for iOS.

Las claves de aplicaciones móviles terminan incluidas en el binario. Su
protección real depende de las restricciones de paquete, certificado, bundle
ID y API.

## Desarrollo local y Expo Go

Copiar el archivo de ejemplo:

```powershell
cd frontend
Copy-Item .env.example .env
```

Configurar la IP del backend en la LAN:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
VIC_ALLOW_INSECURE_HTTP=true
GOOGLE_MAPS_ANDROID_API_KEY=clave_android
GOOGLE_MAPS_IOS_API_KEY=clave_ios
```

Después:

```powershell
npm start
```

Expo Go incluye los módulos necesarios para probar el mapa, ubicación y cámara.
El teléfono y el servidor deben estar en la misma red. El firewall debe permitir
el puerto de la API.

`VIC_ALLOW_INSECURE_HTTP=true` identifica la configuración de laboratorio. La
URL HTTP solo debe utilizarse en una red privada; la Web publicada usa HTTPS.

## Build instalable

El perfil `preview` de `frontend/eas.json` genera la APK que se instalará en los
teléfonos de la presentación.

Configurar en el entorno `preview` de EAS:

- `EXPO_PUBLIC_API_URL`
- `GOOGLE_MAPS_ANDROID_API_KEY`
- `GOOGLE_MAPS_IOS_API_KEY`

El perfil interno ya configura HTTP LAN para Android y las excepciones ATS
locales necesarias en iOS. El perfil de producción no contiene esas
excepciones.

Ejemplo:

```powershell
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value http://IP_SERVIDOR:8000 --environment preview --visibility plaintext
npx eas-cli@latest env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value CLAVE --environment preview --visibility sensitive
npx eas-cli@latest env:create --name GOOGLE_MAPS_IOS_API_KEY --value CLAVE --environment preview --visibility sensitive
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

## Formato QR

La API acepta cualquier texto no vacío de hasta 200 caracteres y lo usa como
identificador único. Para evitar colisiones se recomienda:

```text
VIC:CONTENEDOR:<UUID>
```

Ejemplo:

```text
VIC:CONTENEDOR:550e8400-e29b-41d4-a716-446655440000
```

No reutilizar el mismo QR en dos contenedores físicos.

El repositorio incluye `frontend/assets/qr-contenedor-prueba.png`, cuyo
contenido es:

```text
VIC:CONTENEDOR:PRUEBA-001
```

Debe usarse sólo para validar el escáner, no como etiqueta definitiva.

## API

Todos los endpoints requieren JWT:

- `POST /contenedores/registrar-qr`
- `GET /contenedores/cercanos`
- `GET /contenedores`

Ejemplo de registro:

```json
{
  "codigo_qr": "VIC:CONTENEDOR:550e8400-e29b-41d4-a716-446655440000",
  "latitud": 19.4326,
  "longitud": -99.1332,
  "precision_m": 5.2
}
```

## Validación física necesaria

Antes de declarar una versión móvil lista para usuarios:

- probar un Android físico con servicios de Google;
- probar un iPhone físico;
- aceptar y rechazar permisos de cámara y ubicación;
- escanear el mismo QR desde dos posiciones y comprobar la actualización;
- verificar que el QR aparezca cerca de la segunda posición;
- probar GPS débil, cámara bloqueada y API sin conexión;
- comprobar las claves restringidas en builds firmados, no sólo Expo Go.
