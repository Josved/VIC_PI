[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$raizProyecto = Resolve-Path (Join-Path $PSScriptRoot "..")
$directorioRespaldos = Join-Path $raizProyecto "backups"
$nombreRespaldo = "vic-data-{0}.tar.gz" -f (Get-Date -Format "yyyyMMdd-HHmmss")

New-Item -ItemType Directory -Force -Path $directorioRespaldos | Out-Null
Push-Location $raizProyecto

try {
    & docker compose stop backend
    if ($LASTEXITCODE -ne 0) {
        throw "No fue posible detener temporalmente el backend."
    }

    try {
        & docker run --rm `
            --volume "vic_data:/data:ro" `
            --volume "${directorioRespaldos}:/backup" `
            alpine:3.22 `
            tar -czf "/backup/$nombreRespaldo" -C /data .
        if ($LASTEXITCODE -ne 0) {
            throw "No fue posible crear el respaldo."
        }
    }
    finally {
        & docker compose start backend
    }

    Write-Host "Respaldo creado en: $(Join-Path $directorioRespaldos $nombreRespaldo)"
}
finally {
    Pop-Location
}
