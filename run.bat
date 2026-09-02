@echo off
title ReviveAI — Autonomous Revenue Recovery Platform
echo ============================================================
echo   ⚡ Starting ReviveAI Platform (Backend + Frontend)...
echo ============================================================

cd /d "%~dp0"

:: Start FastAPI backend in background
start "ReviveAI Backend (FastAPI :8000)" cmd /c ".\venv\Scripts\python.exe -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000"

:: Start Frontend Server in background
start "ReviveAI Frontend (:3000)" cmd /c "python -m http.server 3000"

:: Open browser after 2 seconds
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo   ✓ ReviveAI is live!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ============================================================
