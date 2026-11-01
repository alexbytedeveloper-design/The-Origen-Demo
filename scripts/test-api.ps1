# Ejecuta las pruebas de la API en el entorno virtual del backend.
# Uso: npm run test:api

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
Set-Location $backend

$venv = Join-Path $backend ".venv"
if (-not (Test-Path $venv)) {
    python -m venv $venv
}

$python = Join-Path $venv "Scripts\python.exe"
& $python -m pip install --quiet --upgrade pip
& $python -m pip install --quiet -r requirements.txt

& $python -m pytest
exit $LASTEXITCODE
