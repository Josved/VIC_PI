[CmdletBinding()]
param(
    [ValidateSet("iniciar", "apagar", "reiniciar", "estado", "logs", "verificar")]
    [string]$Accion = "estado",
    [switch]$Osrm
)

$ErrorActionPreference = "Stop"
$raizProyecto = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $raizProyecto

try {
    $archivosCompose = @("-f", "compose.yaml")
    if ($Osrm) {
        $archivosCompose += @("-f", "compose.osrm.yaml")
    }

    switch ($Accion) {
        "iniciar" {
            & docker compose @archivosCompose up -d --build
        }
        "apagar" {
            & docker compose @archivosCompose down
        }
        "reiniciar" {
            & docker compose @archivosCompose restart
        }
        "estado" {
            & docker compose @archivosCompose ps
        }
        "logs" {
            & docker compose @archivosCompose logs -f --tail 150
        }
        "verificar" {
            & docker compose @archivosCompose ps
            if ($LASTEXITCODE -ne 0) {
                throw "No fue posible consultar el estado de Docker."
            }

            $puertoApi = (& docker compose @archivosCompose port backend 8000).Trim()
            $puertoWeb = (& docker compose @archivosCompose port frontend 80).Trim()
            $puertoApi = $puertoApi.Substring($puertoApi.LastIndexOf(":") + 1)
            $puertoWeb = $puertoWeb.Substring($puertoWeb.LastIndexOf(":") + 1)

            $salud = Invoke-RestMethod "http://127.0.0.1:$puertoApi/salud"
            $web = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$puertoWeb/"
            Write-Host "API: $($salud.estado) / BD: $($salud.base_datos)"
            Write-Host "Web: HTTP $($web.StatusCode)"
        }
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose termino con codigo $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
