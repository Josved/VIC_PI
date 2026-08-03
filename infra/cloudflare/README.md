# Cloudflare Tunnel para VIC

Este modo publica el servidor web de `vic-publico`, que a su vez entrega la
aplicación web y reenvía `/api` al servidor privado. No se expone directamente
la base de datos.

## Iniciar

1. Enciende las máquinas virtuales `vic-publico` y `vic-privado`.
2. Verifica `https://127.0.0.1:8443/salud-publica` y
   `https://127.0.0.1:8443/api/salud`.
3. Ejecuta desde PowerShell:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
.\infra\cloudflare\iniciar-tunel.ps1
```

Cloudflare mostrará una URL HTTPS aleatoria terminada en
`.trycloudflare.com`. La terminal debe permanecer abierta.

## Detener

Presiona `Ctrl+C` en la terminal del túnel o ejecuta:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
.\infra\cloudflare\detener-tunel.ps1
```

## Importante

- La URL temporal cambia cuando se crea un túnel nuevo.
- El perfil `preview` de EAS obtiene `EXPO_PUBLIC_API_URL` desde el entorno
  remoto de Expo. Antes de generar otro APK, actualiza esa variable con la
  URL nueva seguida de `/api`.
- TryCloudflare es apropiado para demostraciones y pruebas, no garantiza
  disponibilidad de producción.

El procedimiento completo que debe seguirse después de reiniciar la laptop o
cambiar de Wi-Fi está guardado en [REINICIO.md](REINICIO.md).
