$ErrorActionPreference = 'Stop'
$plantilla = Join-Path $PSScriptRoot 'cloudformation-vic.yaml'

if (-not (Test-Path -LiteralPath $plantilla)) {
    throw "No se encontró $plantilla"
}

$contenido = Get-Content -LiteralPath $plantilla -Raw -Encoding UTF8
$tiposProhibidos = @(
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
    'AWS::RDS::DBInstance',
    'AWS::EC2::NatGateway',
    'AWS::EC2::EIP'
)

foreach ($tipo in $tiposProhibidos) {
    if ($contenido.Contains($tipo)) {
        throw "La simulación contiene un recurso con riesgo de costo no aprobado: $tipo"
    }
}

$instancias = ([regex]::Matches($contenido, 'Type:\s+AWS::EC2::Instance')).Count
if ($instancias -ne 2) {
    throw "Se esperaban exactamente dos instancias EC2 y se encontraron $instancias."
}

$cfnLint = Get-Command cfn-lint -ErrorAction SilentlyContinue
if ($cfnLint) {
    & $cfnLint.Source $plantilla
    if ($LASTEXITCODE -ne 0) {
        throw 'cfn-lint encontró errores en la plantilla.'
    }
    Write-Host 'Plantilla validada con cfn-lint. No se crearon recursos.' -ForegroundColor Green
} else {
    Write-Host 'Validación preventiva correcta. Instala cfn-lint para validar el esquema completo.' -ForegroundColor Yellow
}

Write-Host 'NO se ejecutó aws cloudformation deploy.' -ForegroundColor Cyan
