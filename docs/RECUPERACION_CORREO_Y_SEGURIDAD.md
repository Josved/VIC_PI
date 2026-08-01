# Recuperación de contraseña y correo real

VIC envía un código aleatorio de ocho caracteres al correo registrado. El código:

- vence después de 15 minutos;
- se almacena únicamente como un hash HMAC;
- solo puede utilizarse una vez;
- se bloquea después de cinco intentos fallidos;
- queda invalidado cuando se solicita otro código.

La API responde de la misma forma aunque el correo no esté registrado y limita cada destino a tres solicitudes por hora, con un minuto entre correos. Al cambiar la contraseña se invalidan las sesiones anteriores.

## Configurar Gmail por SMTP

No guardes credenciales reales en Git. Copia estas variables en el archivo local `.env` de la raíz:

```dotenv
VIC_SMTP_HOST=smtp.gmail.com
VIC_SMTP_PORT=587
VIC_SMTP_USERNAME=tu-correo@gmail.com
VIC_SMTP_PASSWORD=contraseña-de-aplicacion-de-16-caracteres
VIC_SMTP_FROM_EMAIL=tu-correo@gmail.com
VIC_SMTP_FROM_NAME=VIC
VIC_SMTP_USE_STARTTLS=true
VIC_SMTP_USE_SSL=false
```

Para Gmail, activa la verificación en dos pasos y crea una contraseña de aplicación. No uses la contraseña normal de tu cuenta. Después reconstruye el backend:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
docker compose up -d --build backend frontend
docker compose logs -f backend
```

Si se usa otro proveedor, cambia host, puerto y el modo TLS según sus instrucciones. `VIC_SMTP_USE_SSL=true` suele corresponder al puerto 465; STARTTLS suele usar el 587.

## Seguridad de la aplicación

- En Android/iOS, el JWT de sesión se guarda con `expo-secure-store` y se migra automáticamente desde AsyncStorage.
- En web, el almacenamiento sigue usando AsyncStorage porque SecureStore no está disponible en navegador. Para producción web conviene evolucionar a cookies `HttpOnly`, `Secure` y `SameSite` servidas por el backend.
- Docker rechaza un secreto JWT predeterminado o menor de 32 caracteres.
- Para producción, define orígenes CORS concretos en vez de `*` y sirve toda la aplicación mediante HTTPS.
