# ==============================================================================
# TechCare - Full-Stack Application Launcher (Spring Boot + React)
# ==============================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "       Starting TechCare Application Suite       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$MVN_PATH = "C:\Program Files\Apache NetBeans\java\maven\bin\mvn.cmd"
if (-not (Test-Path $MVN_PATH)) {
    if (Get-Command mvn -ErrorAction SilentlyContinue) {
        $MVN_PATH = "mvn"
    }
}

$ROOT_DIR = $PSScriptRoot
$BACKEND_DIR = "$PSScriptRoot\backend"
$FRONTEND_DIR = "$PSScriptRoot\frontend"
$ENV_FILE = "$ROOT_DIR\.env"

# 1. Stop stale processes holding ports 8080 and 5173
Write-Host "[1/3] Checking and freeing ports 8080 and 5173..." -ForegroundColor Yellow
$p8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($p8080) {
    Write-Host "  Stopping previous backend process (PID $p8080)..." -ForegroundColor Yellow
    Stop-Process -Id $p8080 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$p5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($p5173) {
    Write-Host "  Stopping previous frontend process (PID $p5173)..." -ForegroundColor Yellow
    Stop-Process -Id $p5173 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 2. Load .env into current process environment if present
if (Test-Path $ENV_FILE) {
    Write-Host "[2/3] Loading environment configuration from .env..." -ForegroundColor Yellow
    Get-Content $ENV_FILE | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $varName = $parts[0].Trim()
            $varValue = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($varName, $varValue, [System.EnvironmentVariableTarget]::Process)
        }
    }
} else {
    Write-Host "[Env] Warning: .env file not found. Ensure environment variables are set." -ForegroundColor Red
}

# 3. Start Spring Boot Backend in a separate window, passing environment variables
Write-Host "[3/3] Launching Spring Boot Backend on http://localhost:8080..." -ForegroundColor Green

$backendScript = @"
`$host.ui.RawUI.WindowTitle = 'TechCare Backend (Spring Boot)'
cd '$BACKEND_DIR'
if (Test-Path '$ENV_FILE') {
    Get-Content '$ENV_FILE' | ForEach-Object {
        `$line = `$_.Trim()
        if (`$line -and -not `$line.StartsWith('#') -and `$line.Contains('=')) {
            `$parts = `$line.Split('=', 2)
            [System.Environment]::SetEnvironmentVariable(`$parts[0].Trim(), `$parts[1].Trim(), [System.EnvironmentVariableTarget]::Process)
        }
    }
}
Write-Host 'Starting TechCare Spring Boot API...' -ForegroundColor Green
& '$MVN_PATH' spring-boot:run
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# 4. Start React + TypeScript Frontend in a separate window
Write-Host "Launching React Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'TechCare Frontend (React + Vite)'; cd '$FRONTEND_DIR'; Write-Host 'Starting TechCare Frontend...' -ForegroundColor Cyan; npm run dev"

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "All services initiated!" -ForegroundColor Yellow
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8080/api" -ForegroundColor White
Write-Host "=================================================`n" -ForegroundColor Cyan
