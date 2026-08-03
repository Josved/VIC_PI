# Cuentas y servicios para generar el APK de VIC

Este documento separa lo obligatorio para compilar un APK de lo que se necesita para habilitar todos los servicios de la aplicación.

## 1. Cuenta Expo (obligatoria para EAS Build)

- Crear una cuenta gratuita en <https://expo.dev/signup>.
- Se recomienda usar el correo del proyecto y activar la autenticación de dos factores.
- No compartir la contraseña por chat ni guardarla en el repositorio.
- Después, en la computadora del proyecto, ejecutar:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\frontend"
npx eas-cli@latest login
npx eas-cli@latest whoami
```

Cuando la sesión esté lista se vincula VIC con EAS. Ese proceso generará el `EAS_PROJECT_ID` y permitirá que EAS administre el certificado de firma Android.

## 2. Proyecto Firebase (necesario para notificaciones reales en Android)

- Ingresar a <https://console.firebase.google.com/> con la cuenta Google del proyecto.
- Crear un proyecto llamado, por ejemplo, `vic-pi`.
- Agregar una aplicación Android con el paquete exacto `com.josved.vic`.
- Descargar `google-services.json`.
- Crear una cuenta de servicio para FCM V1 y descargar su llave JSON.

Los dos archivos JSON son secretos. Deben guardarse fuera del repositorio, por ejemplo en:

```text
C:\PROGRAMACION\PI\credenciales-vic\
```

No se deben enviar por WhatsApp, subir a GitHub ni pegar en documentación pública.

## 3. Google Cloud Maps (necesario para que el mapa funcione dentro del APK)

- Puede utilizarse el mismo proyecto creado por Firebase.
- Habilitar `Maps SDK for Android`.
- Después del primer build, copiar desde EAS la huella SHA-1 del certificado Android.
- Crear una API key restringida por:
  - paquete: `com.josved.vic`;
  - huella SHA-1 del certificado de VIC;
  - API permitida: únicamente `Maps SDK for Android`.

Google Cloud puede solicitar una cuenta de facturación aunque el uso de una demostración permanezca dentro de la cuota gratuita. Si el equipo no quiere registrar una tarjeta, antes del APK se puede evaluar migrar el mapa móvil a una alternativa basada en OpenStreetMap.

## 4. Correo de VIC (ya existente)

El correo del proyecto se utiliza para verificación de identidad y recuperación de contraseña. Su contraseña de aplicación SMTP se configura solamente en el servidor privado; nunca dentro del APK.

## 5. Google Play Console (no es necesaria para el APK de demostración)

Un APK de distribución interna puede descargarse desde el enlace de EAS e instalarse directamente en los teléfonos de prueba. Solo hace falta una cuenta de Google Play Console si posteriormente se desea publicar VIC en Play Store.

## Orden recomendado

1. Crear la cuenta Expo.
2. Iniciar sesión con EAS y vincular el proyecto.
3. Generar el primer APK interno y conservar el certificado de firma.
4. Crear Firebase y configurar FCM.
5. Configurar Maps con el paquete y la huella SHA-1.
6. Generar el APK final de pruebas.

El administrador del proyecto debe conservar acceso a Expo, Firebase y al correo de VIC. Los demás integrantes deben agregarse como colaboradores con sus propias cuentas cuando el servicio lo permita.
