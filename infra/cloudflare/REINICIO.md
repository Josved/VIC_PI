# Procedimiento de reinicio de VIC

Este archivo es la memoria operativa del proyecto. Debe revisarse cuando se
solicite "inicia VIC", especialmente después de reiniciar la laptop o cambiar
de red Wi-Fi.

## Datos que no dependen de la red Wi-Fi

- Proyecto: `C:\PROGRAMACION\PI\PROYECTO INTEGRADOR`
- Máquina pública de VirtualBox: `vic-publico`
- Máquina privada de VirtualBox: `vic-privado`
- Entrada HTTPS local: `https://127.0.0.1:8443`
- Salud pública: `https://127.0.0.1:8443/salud-publica`
- Salud del backend privado: `https://127.0.0.1:8443/api/salud`
- Proyecto EAS: `@vicexpo12345s-team/vic`
- Perfil Android instalable: `preview`

Cloudflare se conecta a `127.0.0.1:8443`. Por eso no es necesario cambiar la
IP privada de la nueva red Wi-Fi. La red solamente debe tener acceso a
Internet.

## Secuencia obligatoria

1. Revisar las máquinas encendidas:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list runningvms
```

2. Si es necesario, encender las dos máquinas:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm "vic-privado" --type headless
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm "vic-publico" --type headless
```

3. Esperar a que ambas inicien y comprobar los dos puntos de salud locales.
   Ambos deben responder con estado HTTP `200`; el segundo también debe indicar
   `"base_datos":"ok"`.

4. Confirmar que no exista otro proceso `cloudflared`. Después iniciar el túnel:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
Set-ExecutionPolicy -Scope Process RemoteSigned
.\infra\cloudflare\iniciar-tunel.ps1
```

5. Copiar la nueva dirección `https://...trycloudflare.com` y comprobar:

```text
https://NUEVA-URL.trycloudflare.com/
https://NUEVA-URL.trycloudflare.com/api/salud
```

6. Si la URL cambió, actualizar `frontend\.env` para Expo Go:

```dotenv
EXPO_PUBLIC_API_URL=https://NUEVA-URL.trycloudflare.com/api
VIC_ALLOW_INSECURE_HTTP=false
```

7. Actualizar el entorno remoto de EAS:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR\frontend"
npx eas-cli env:set preview --name EXPO_PUBLIC_API_URL --value https://NUEVA-URL.trycloudflare.com/api --visibility plaintext --scope project --non-interactive
npx eas-cli env:set preview --name VIC_ALLOW_INSECURE_HTTP --value false --visibility plaintext --scope project --non-interactive
```

8. La web funciona inmediatamente con la URL del túnel. Si la URL cambió, el
   APK anterior dejará de conectar y se debe generar otro:

```powershell
npx eas-cli build --platform android --profile preview
```

9. Verificar la nueva compilación antes de compartirla:

- La web responde `200`.
- `/api/salud` responde `200` y la base de datos está `ok`.
- EAS cargó `EXPO_PUBLIC_API_URL` y `VIC_ALLOW_INSECURE_HTTP`.
- El APK contiene la nueva URL HTTPS y no contiene una IP LAN anterior.

## Apagado

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
.\infra\cloudflare\detener-tunel.ps1
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm "vic-publico" acpipowerbutton
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm "vic-privado" acpipowerbutton
```

No forzar el apagado de las máquinas virtuales salvo que no respondan. La URL
temporal deja de funcionar cuando se detiene `cloudflared`.

## Mejora pendiente

Cuando exista una cuenta gratuita de Cloudflare, configurar una dirección
estable `*.workers.dev` o un dominio propio. Con una URL estable ya no será
necesario reconstruir el APK después de cada reinicio del túnel.
