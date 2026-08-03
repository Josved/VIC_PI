param(
    [string]$Origen = 'https://127.0.0.1:8443'
)

$ErrorActionPreference = 'Stop'

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    $rutaInstalada = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
    if (-not (Test-Path -LiteralPath $rutaInstalada)) {
        throw 'cloudflared no esta instalado. Ejecuta: winget install --id Cloudflare.cloudflared --exact'
    }
    $ejecutable = $rutaInstalada
} else {
    $ejecutable = $cloudflared.Source
}

Write-Host 'Iniciando el tunel temporal de VIC...'
Write-Host 'Deja esta terminal abierta. Presiona Ctrl+C para apagar el tunel.'
Write-Host "Origen local: $Origen"

& $ejecutable tunnel --no-autoupdate --url $Origen --no-tls-verify --loglevel info
