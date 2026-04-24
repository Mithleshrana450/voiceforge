@echo off
setlocal enabledelayedexpansion

:: Always run from this script directory (supports UNC paths via temporary drive mapping)
pushd "%~dp0"
set "ROOT=%CD%"

:: ============================================================
::  VoiceForge — One-command setup & launcher (Windows)
:: ============================================================

title VoiceForge Setup

echo.
echo ============================================
echo    VoiceForge -- Setup ^& Launcher
echo ============================================
echo.

:: ── Check Node.js ───────────────────────────────────────────
echo [1/7] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed.
    echo.
    echo   Please download and install Node.js v18+ from:
    echo   https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% found

:: ── Check project structure ──────────────────────────────────
echo [2/7] Checking project structure...
if not exist "backend\server.js" (
    echo [ERROR] backend\server.js not found.
    echo   Run this script from the voiceforge root folder.
    pause
    exit /b 1
)
if not exist "frontend\src\App.jsx" (
    echo [ERROR] frontend\src\App.jsx not found.
    echo   Run this script from the voiceforge root folder.
    pause
    exit /b 1
)
echo [OK] Project structure OK

:: ── Setup backend .env ───────────────────────────────────────
echo [3/7] Checking environment config...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
    ) else (
        (
            echo ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
            echo PORT=3001
            echo NODE_ENV=development
            echo FRONTEND_URL=http://localhost:5173
            echo UPLOAD_DIR=./uploads
            echo GENERATED_DIR=./generated
            echo MAX_FILE_SIZE_MB=25
            echo AUTH_USERNAME=
            echo AUTH_PASSWORD=
        ) > "backend\.env"
    )
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo  You need an ElevenLabs API key.
    echo  Get yours FREE at: https://elevenlabs.io
    echo  Sign up -^> Profile -^> API Keys -^> Generate
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    set /p API_KEY="  Enter your ElevenLabs API key (or Enter to skip): "

    if not "!API_KEY!"=="" (
        powershell -Command "(Get-Content 'backend\.env') -replace 'your_elevenlabs_api_key_here', '!API_KEY!' | Set-Content 'backend\.env'"
        echo [OK] API key saved to backend\.env
    ) else (
        echo [WARN] No key entered. Running in demo mode.
    )
) else (
    :: Check if placeholder still in .env
    findstr /c:"your_elevenlabs_api_key_here" "backend\.env" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [WARN] API key is still placeholder.
        set /p API_KEY="  Enter your ElevenLabs API key (or Enter to skip): "
        if not "!API_KEY!"=="" (
            powershell -Command "(Get-Content 'backend\.env') -replace 'your_elevenlabs_api_key_here', '!API_KEY!' | Set-Content 'backend\.env'"
            echo [OK] API key updated
        )
    ) else (
        echo [OK] backend\.env already configured
    )
)

:: ── Setup frontend .env ──────────────────────────────────────
if not exist "frontend\.env" (
    echo VITE_API_URL=http://localhost:3001/api> "frontend\.env"
    echo [OK] frontend\.env created
) else (
    echo [OK] frontend\.env exists
)

:: ── Create storage directories ───────────────────────────────
if not exist "backend\uploads" mkdir "backend\uploads"
if not exist "backend\generated" mkdir "backend\generated"
echo [OK] Storage directories ready

:: ── Install backend dependencies ─────────────────────────────
echo [4/7] Installing backend packages...
cd backend
if not exist "node_modules" (
    call npm install --silent
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed in backend
        pause
        exit /b 1
    )
) else (
    echo [OK] Already installed, skipping
)
cd ..

:: ── Install frontend dependencies ────────────────────────────
echo [5/7] Installing frontend packages...
cd frontend
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed in frontend
    pause
    exit /b 1
)
cd ..

:: ── Launch servers ───────────────────────────────────────────
echo [6/7] Starting backend server...
start "VoiceForge Backend" cmd /k "cd /d !ROOT!\backend && echo Backend starting on http://localhost:3001 && node server.js"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo [7/7] Starting frontend...
start "VoiceForge Frontend" cmd /k "cd /d !ROOT!\frontend && echo Frontend starting on http://localhost:5173 && npm run dev:compat"

echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul

:: ── Open browser ─────────────────────────────────────────────
echo.
echo ============================================
echo  VoiceForge is ready!
echo  Opening http://localhost:5173 ...
echo ============================================
echo.
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:5173
echo.
echo  Two terminal windows are now open.
echo  Close them to stop the servers.
echo.

start http://localhost:5173

pause
popd
