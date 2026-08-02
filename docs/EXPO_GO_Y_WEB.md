# Uso de VIC en Expo Go y en la Web

La entrega móvil se presentará mediante Expo Go. No se generará APK, Android
App Bundle ni development build.

## Expo Go en la misma red Wi-Fi

En `frontend/.env`, `EXPO_PUBLIC_API_URL` debe apuntar al backend accesible
desde el teléfono. Después se inicia Metro en modo LAN:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\frontend"
npx expo start --lan --clear --port 8081
```

El teléfono abre el código QR con Expo Go. Si el puerto está ocupado se puede
aceptar el siguiente puerto que proponga Expo o cerrar el proceso anterior.

## Web del laboratorio

Con las VM encendidas, la versión Web se encuentra en:

- `https://127.0.0.1:8443`
- `https://10.156.144.17:8443` desde la LAN actual

El certificado es autofirmado y el navegador mostrará una advertencia. La IP
de Wi-Fi puede cambiar; debe verificarse con `ipconfig`.

## Web pública futura

La plantilla de `infra/aws/cloudformation-vic.yaml` deja preparada la Web y su
API en una dirección pública de AWS. No se ha ejecutado para evitar cualquier
consumo o cargo.

## Límite de notificaciones

Expo Go no permite notificaciones push remotas en Android con la versión
actual de Expo. VIC detecta Expo Go y evita cargar esa funcionalidad, por lo
que la aplicación abre sin el error rojo de `expo-notifications`. Los estados,
mensajes dentro de la interfaz, calendario y actualización de datos continúan
funcionando.
