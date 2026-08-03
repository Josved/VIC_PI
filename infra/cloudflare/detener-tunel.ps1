$ErrorActionPreference = 'Stop'

$procesos = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" |
    Where-Object { $_.CommandLine -match 'tunnel' -and $_.CommandLine -match '127\.0\.0\.1:8443' }

if (-not $procesos) {
    Write-Host 'No hay un tunel temporal de VIC ejecutandose.'
    exit 0
}

foreach ($proceso in $procesos) {
    Stop-Process -Id $proceso.ProcessId
    Write-Host "Tunel VIC detenido (PID $($proceso.ProcessId))."
}
