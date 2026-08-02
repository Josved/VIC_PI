# Preparación de la aplicación móvil sin costo

La app ya incluye `expo-dev-client` y tres perfiles de EAS:

| Perfil | Resultado | Uso |
| --- | --- | --- |
| `development` | APK con herramientas de desarrollo | GPS, cámara y notificaciones durante desarrollo |
| `preview` | APK instalable | Demostración interna a evaluadores |
| `production` | Android App Bundle | Publicación futura; no se utilizará por ahora |

## Lo que ya puede validarse sin teléfono

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\frontend"
npm run typecheck
npx expo-doctor
npx expo config --type public
```

## Lo que se hará cuando se utilicen los teléfonos

1. Crear o usar una cuenta gratuita de Expo.
2. Ejecutar `npx eas-cli init` y guardar `EXPO_OWNER` y `EAS_PROJECT_ID`.
3. Crear un proyecto Firebase con el plan Spark, sin asociar facturación.
4. Registrar `com.josved.vic` como aplicación Android.
5. Descargar `google-services.json` dentro de `frontend/`; Git lo ignora.
6. Generar el APK con `npm run build:android:preview`.
7. Instalarlo y probar inicio de sesión, QR, cámara, GPS, rutas, reportes,
   recuperación de contraseña y notificaciones.

FCM aparece como producto sin costo en el plan Spark. No se deben habilitar
Blaze, Cloud Functions ni productos de Google Cloud con facturación.

## Desarrollo con el cliente propio

Después de instalar el APK de desarrollo:

```powershell
npm run start:dev-client -- --lan --clear
```

Desde Expo SDK 53, las notificaciones remotas no funcionan en Expo Go para
Android; requieren este development build. Las notificaciones locales ya
están contempladas por la aplicación.

## Certificado del laboratorio

La plataforma utiliza un certificado autofirmado. Cuando se pruebe en un
teléfono será necesario instalar y confiar en el certificado del laboratorio,
o usar temporalmente la conexión HTTP de desarrollo dentro de una red privada.
Nunca se debe habilitar HTTP inseguro en el perfil `production`.
