# Start Flask Backend Server (uses the project's virtual environment)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Error "Virtual environment not found at $python. Create it with: python -m venv .venv && .venv\Scripts\pip install -r backend/requirements.txt"
    exit 1
}
Push-Location $root
try {
    & $python (Join-Path $root "backend\server.py")
}
finally {
    Pop-Location
}
