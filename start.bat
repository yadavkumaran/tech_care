@echo off
setlocal enabledelayedexpansion
title TechCare Launcher
color 0b

echo ===================================================
echo        Starting TechCare Application Suite
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "MVN_PATH=C:\Program Files\Apache NetBeans\java\maven\bin\mvn.cmd"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "ENV_FILE=%ROOT_DIR%.env"

rem 1. Check if .env file exists
if not exist "%ENV_FILE%" (
    echo [ERROR] Environment configuration file not found:
    echo "%ENV_FILE%"
    echo.
    echo Please copy .env.example to .env and configure your credentials.
    echo.
    pause
    exit /b 1
)

rem 2. Verify Maven executable
if not exist "%MVN_PATH%" (
    where mvn >nul 2>nul
    if %errorlevel% equ 0 (
        set "MVN_PATH=mvn"
    ) else (
        echo [ERROR] Maven not found at "%MVN_PATH%" and not found in system PATH.
        pause
        exit /b 1
    )
)

rem 3. Free Port 8080 and Port 5173 if currently occupied by stale processes
echo [1/4] Checking and freeing ports 8080 and 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p8080) { Write-Host '  [Port 8080] Stopping previous process (PID '$p8080') to prevent conflict...' -ForegroundColor Yellow; Stop-Process -Id $p8080 -Force -ErrorAction SilentlyContinue; } $p5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p5173) { Write-Host '  [Port 5173] Stopping previous process (PID '$p5173') to prevent conflict...' -ForegroundColor Yellow; Stop-Process -Id $p5173 -Force -ErrorAction SilentlyContinue; }"

rem 4. Load .env into the process environment
echo [2/4] Loading environment variables from .env...
for /f "usebackq eol=# tokens=1* delims==" %%A in ("%ENV_FILE%") do (
    set "ENV_KEY=%%A"
    set "ENV_VAL=%%B"
    if defined ENV_KEY if defined ENV_VAL (
        rem Trim leading/trailing whitespace
        for /f "tokens=* delims= " %%k in ("!ENV_KEY!") do set "ENV_KEY=%%k"
        set "!ENV_KEY!=!ENV_VAL!"
    )
)

rem 5. Launch Spring Boot Backend
echo [3/4] Launching Spring Boot Backend on http://localhost:8080...
start "TechCare Backend (Spring Boot)" cmd /k "title TechCare Backend (Spring Boot) && cd /d "%BACKEND_DIR%" && echo Starting TechCare Spring Boot API... && "%MVN_PATH%" spring-boot:run"

rem 6. Launch React Frontend
echo [4/4] Launching React Frontend on http://localhost:5173...
start "TechCare Frontend (React + Vite)" cmd /k "title TechCare Frontend (React + Vite) && cd /d "%FRONTEND_DIR%" && echo Starting TechCare React UI... && npm run dev"

echo.
echo ===================================================
echo All services have been launched!
echo.
echo  - Frontend Web App:  http://localhost:5173
echo  - Backend REST API:  http://localhost:8080/api
echo ===================================================
echo.
echo You can keep this window open or press any key to close it.
echo (The backend and frontend windows will remain running)
pause >nul
