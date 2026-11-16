# Prueba de carga contra una API ya arrancada.
# Uso: npm run stress:api
#      npm run stress:api -- --requests 500 --concurrency 32

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$script = Join-Path $PSScriptRoot "stress_api.py"

$venv = Join-Path $backend ".venv"
if (-not (Test-Path $venv)) {
    python -m venv $venv
}

$python = Join-Path $venv "Scripts\python.exe"
& $python -c "import httpx" 2>$null
if ($LASTEXITCODE -ne 0) {
    & $python -m pip install --quiet -r (Join-Path $backend "requirements.txt")
}

& $python $script @args
exit $LASTEXITCODE
