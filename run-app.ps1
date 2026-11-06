# ==============================================================================
# TechCare - Full-Stack Application Launcher (Spring Boot + React)
# ==============================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "       Starting TechCare Application Suite       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$MVN_PATH = "C:\Program Files\Apache NetBeans\java\maven\bin\mvn.cmd"
$BACKEND_DIR = "$PSScriptRoot\backend"
$FRONTEND_DIR = "$PSScriptRoot\frontend"

# 1. Start Spring Boot Backend in a separate window
Write-Host "`n[1/2] Launching Spring Boot Backend on http://localhost:8080..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BACKEND_DIR'; Write-Host 'Starting TechCare Spring Boot API...' -ForegroundColor Green; & '$MVN_PATH' spring-boot:run"

# 2. Start React + TypeScript Frontend in a separate window
Write-Host "[2/2] Launching React Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FRONTEND_DIR'; Write-Host 'Starting TechCare Frontend...' -ForegroundColor Cyan; npm run dev"

Write-Host "`nAll services initiated!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://localhost:8080/api" -ForegroundColor White
Write-Host "Default Logins: admin / receptionist / tech_arun (Password: password123)`n" -ForegroundColor White

