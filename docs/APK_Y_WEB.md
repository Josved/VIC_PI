# Entrega de VIC como APK y Web

La entrega final utilizará una APK Android instalable y la versión Web servida
por Nginx. Expo Go seguirá siendo útil para revisiones rápidas, pero no será el
medio de entrega a los evaluadores.

## Perfiles Android

| Perfil | Archivo | Uso |
| --- | --- | --- |
| `development` | APK con `expo-dev-client` | Pruebas de cámara, GPS, notificaciones y depuración |
| `preview` | APK independiente | Instalación final en los teléfonos de evaluación |

No se necesita publicar la aplicación en Google Play.

## Preparación sin costo

1. Crear o usar una cuenta Expo con el plan Free.
2. Dentro de `frontend`, ejecutar `npx eas-cli@latest init` una sola vez.
3. Guardar `EXPO_OWNER` y `EAS_PROJECT_ID` en el entorno de EAS.
4. Configurar `EXPO_PUBLIC_API_URL` con la URL pública de la API.
5. Ejecutar `npm run build:android:preview` cuando todo esté validado.
6. Descargar el APK desde el enlace privado de EAS e instalarlo manualmente.

El plan Free ofrece un número limitado de compilaciones de baja prioridad. No
se debe contratar Starter ni añadir opciones de pago para esta simulación.

## Firebase opcional para push remoto

Las notificaciones locales funcionan dentro de la APK sin Expo Go. Para push
remoto se necesita un proyecto Firebase en el plan Spark y el archivo
`google-services.json`. Ese archivo está ignorado por Git y se configura con
`GOOGLE_SERVICES_JSON`.

FCM es opcional para cumplir las funciones principales de la aplicación; puede
configurarse durante las pruebas con los teléfonos.

## Mapas y costo cero

La implementación nativa actual utiliza Google Maps. Una APK independiente
necesita una clave Android restringida para `com.josved.vic`, y Google puede
exigir habilitar facturación aunque el uso de la práctica permanezca dentro de
la cuota gratuita. No se configurará una cuenta facturable sin autorización.

Si el equipo decide no registrar ningún método de pago, antes de compilar se
deberá sustituir el mapa nativo por MapLibre/OpenStreetMap. La versión Web ya
utiliza Leaflet/OpenStreetMap.

## Desarrollo después de instalar el cliente propio

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\frontend"
npm run start:dev-client -- --lan --clear
```

## Web del laboratorio

Con las máquinas virtuales encendidas:

- `https://127.0.0.1:8443`
- `https://10.156.144.17:8443` dentro de la LAN actual

La Web pública en Internet se habilitará al ejecutar la plantilla AWS con la
cuenta gratuita. El certificado del laboratorio permanece autofirmado.
