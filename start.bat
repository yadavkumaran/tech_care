@echo off
title TechCare Launcher
color 0b

echo ===================================================
echo        Starting TechCare Application Suite
echo ===================================================
echo.

set "MVN_PATH=C:\Program Files\Apache NetBeans\java\maven\bin\mvn.cmd"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

echo [1/2] Launching Spring Boot Backend on http://localhost:8080...
start "TechCare Backend (Spring Boot)" cmd /k "cd /d "%BACKEND_DIR%" && "%MVN_PATH%" spring-boot:run"

echo [2/2] Launching React Frontend on http://localhost:5173...
start "TechCare Frontend (React + Vite)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ===================================================
echo All services have been launched!
echo.
echo  - Frontend Web App:  http://localhost:5173
echo  - Backend REST API:  http://localhost:8080/api
echo.
echo  - Default Logins: (Password: password123)
echo      * Admin:        admin
echo      * Receptionist: receptionist
echo      * Technician:   tech_arun
echo ===================================================
echo.
pause

