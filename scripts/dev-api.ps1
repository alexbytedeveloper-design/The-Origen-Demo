# Arranca la API en modo desarrollo (SQLite por defecto).
# Uso: npm run dev:api  ·  o  powershell -File scripts/dev-api.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
Set-Location $backend

# Carga .env de la raíz sin dependencias extra.
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$' -and $_ -notmatch '^\s*#') {
            $name = $Matches[1]
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "sqlite+aiosqlite:///./origen.db"
}
if (-not $env:JWT_SECRET) {
    Write-Warning "JWT_SECRET no definido: se usará uno efímero (las sesiones se pierden al reiniciar)."
}

$venv = Join-Path $backend ".venv"
if (-not (Test-Path $venv)) {
    python -m venv $venv
}

$python = Join-Path $venv "Scripts\python.exe"
& $python -m pip install --quiet --upgrade pip
& $python -m pip install --quiet -r requirements.txt

Write-Host "The Origen API → http://127.0.0.1:8000/api/docs" -ForegroundColor Yellow
& $python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
