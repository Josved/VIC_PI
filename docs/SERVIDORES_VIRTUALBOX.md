# Operación de los servidores VIC en VirtualBox

Los comandos de este documento se ejecutan en PowerShell desde Windows.

## Direcciones

| Servicio | Dirección |
| --- | --- |
| Aplicación HTTPS en esta computadora | `https://127.0.0.1:8443` |
| Aplicación HTTPS en la LAN actual | `https://10.156.144.17:8443` |
| Grafana | `https://127.0.0.1:8443/grafana/` |
| SSH público | `127.0.0.1:2222` |
| SSH privado | `127.0.0.1:2223` |

El certificado del laboratorio es autofirmado, por lo que el navegador puede
mostrar una advertencia. La IP de la LAN puede cambiar al conectarse a otra red;
se obtiene con `ipconfig` buscando la dirección IPv4 del adaptador Wi-Fi.

Grafana también queda disponible a través de la URL activa de Cloudflare
agregando `/grafana/`. Sus paneles muestran las dos réplicas de la API, ambos
servidores, los contenedores Docker y el estado de Prometheus. Las credenciales
se conservan únicamente en `C:\PROGRAMACION\VIRTUALIZACION\vic-servidores\CREDENCIALES-LOCALES.txt`.

Prometheus no se publica directamente en Internet. Para revisar sus objetivos
desde la laptop se puede crear un túnel SSH y abrir
`http://127.0.0.1:19090/targets`:

```powershell
ssh -N -L 19090:127.0.0.1:9090 -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2223 vicadmin@127.0.0.1
```

## Encender

Primero se inicia el servidor privado y después el público:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm "vic-privado" --type headless
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm "vic-publico" --type headless
```

Comprobar cuáles están encendidos:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list runningvms
```

## Entrar por SSH

```powershell
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2222 vicadmin@127.0.0.1
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2223 vicadmin@127.0.0.1
```

No existe contraseña de sistema habilitada: el acceso administrativo utiliza
exclusivamente la llave privada local.

## Verificar los contenedores

Servidor público:

```powershell
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2222 vicadmin@127.0.0.1 "cd /opt/vic/infra/servidor-publico && sudo docker compose ps"
```

Servidor privado:

```powershell
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2223 vicadmin@127.0.0.1 "cd /opt/vic/infra/servidor-privado && sudo docker compose ps"
```

## Evidencia rápida de seguridad y monitoreo

```powershell
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2222 vicadmin@127.0.0.1 "sudo ufw status verbose"
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2223 vicadmin@127.0.0.1 "sudo ufw status verbose"
curl.exe -k -i https://127.0.0.1:8443/api/salud
curl.exe -k -i https://127.0.0.1:8443/api/contenedores
curl.exe -k -i https://127.0.0.1:8443/api/metricas
```

Los resultados esperados son 200 para salud, 401 para la ruta protegida sin
JWT y 404 para las métricas bloqueadas en el servidor público.

## Apagar correctamente

Se apaga primero el servidor público y después el privado:

```powershell
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2222 vicadmin@127.0.0.1 "sudo shutdown -h now"
ssh -i "C:\Users\Josve\.ssh\vic_servers_ed25519" -p 2223 vicadmin@127.0.0.1 "sudo shutdown -h now"
```

Después se confirma que ya no aparecen en la lista:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list runningvms
```

Evita usar **Apagar máquina** desde VirtualBox salvo que el sistema no responda,
porque equivale a cortar la corriente y puede dañar la base de datos.

## Credenciales locales

Las credenciales de Grafana están guardadas fuera del repositorio en:

`C:\PROGRAMACION\VIRTUALIZACION\vic-servidores\CREDENCIALES-LOCALES.txt`

Ese archivo y la llave SSH no deben subirse a Git ni compartirse públicamente.
