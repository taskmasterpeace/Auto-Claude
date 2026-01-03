@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: AUTO-CLAUDE ONE-CLICK LAUNCHER (Development Mode)
:: Double-click this file to set up and run Auto-Claude UI
:: ============================================================

title Auto-Claude Development Launcher
cd /d "%~dp0"

echo.
echo ============================================================
echo   AUTO-CLAUDE DEVELOPMENT LAUNCHER
echo ============================================================
echo.

:: ============================================================
:: CHECK PREREQUISITES
:: ============================================================

:: Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo.
    echo Please install Python 3.10+ from:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

:: Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo [OK] Python found: %PYVER%

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js 18+ from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check Node version
for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODEVER=%%i
echo [OK] Node.js found: %NODEVER%

:: ============================================================
:: PYTHON BACKEND SETUP
:: ============================================================

set VENV_DIR=auto-claude\.venv
set REQUIREMENTS=auto-claude\requirements.txt

if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo.
    echo [SETUP] Creating Python virtual environment...
    python -m venv "%VENV_DIR%"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)

:: Check if requirements are installed (check for a key package)
"%VENV_DIR%\Scripts\python.exe" -c "import claude_agent_sdk" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [SETUP] Installing Python dependencies...
    echo         This may take a few minutes on first run...
    "%VENV_DIR%\Scripts\pip.exe" install -r "%REQUIREMENTS%"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo [OK] Python dependencies installed
) else (
    echo [OK] Python dependencies already installed
)

:: ============================================================
:: CHECK OAUTH TOKEN
:: ============================================================

set ENV_FILE=auto-claude\.env

if not exist "%ENV_FILE%" (
    echo.
    echo ============================================================
    echo   OAUTH TOKEN SETUP REQUIRED
    echo ============================================================
    echo.
    echo You need to set up your Claude OAuth token.
    echo.
    echo 1. Run this command in a terminal:
    echo    claude setup-token
    echo.
    echo 2. This will open a browser to authenticate
    echo.
    echo 3. After authentication, create the file:
    echo    %~dp0auto-claude\.env
    echo.
    echo 4. Add this line to the file:
    echo    CLAUDE_CODE_OAUTH_TOKEN=your-token-here
    echo.
    echo Press any key to open notepad and create the .env file...
    pause >nul

    :: Create template .env file
    echo # Auto Claude Environment Variables> "%ENV_FILE%"
    echo # Get your token by running: claude setup-token>> "%ENV_FILE%"
    echo CLAUDE_CODE_OAUTH_TOKEN=>> "%ENV_FILE%"

    notepad "%ENV_FILE%"

    echo.
    echo After saving the .env file, run this launcher again.
    pause
    exit /b 0
)

:: Check if token is actually set (not empty)
findstr /C:"CLAUDE_CODE_OAUTH_TOKEN=" "%ENV_FILE%" | findstr /V /C:"CLAUDE_CODE_OAUTH_TOKEN=$" | findstr /V /C:"CLAUDE_CODE_OAUTH_TOKEN= " >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] CLAUDE_CODE_OAUTH_TOKEN appears to be empty in .env
    echo Please edit %ENV_FILE% and add your token
    echo.
    echo Press any key to open the .env file...
    pause >nul
    notepad "%ENV_FILE%"
    echo.
    echo After saving, run this launcher again.
    pause
    exit /b 0
)

echo [OK] OAuth token configured

:: ============================================================
:: ELECTRON APP SETUP
:: ============================================================

set UI_DIR=auto-claude-ui

if not exist "%UI_DIR%\node_modules" (
    echo.
    echo [SETUP] Installing Node.js dependencies...
    echo         This may take several minutes on first run...
    cd "%UI_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] npm install failed
        echo.
        echo If you see errors about node-pty or native modules,
        echo you may need Visual Studio Build Tools:
        echo   https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo.
        echo Select "Desktop development with C++" during installation.
        echo.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Node.js dependencies installed
) else (
    echo [OK] Node.js dependencies already installed
)

:: ============================================================
:: VERIFY AUTO-CLAUDE SOURCE PATH
:: ============================================================

set AUTO_CLAUDE_SOURCE=%~dp0auto-claude

if not exist "%AUTO_CLAUDE_SOURCE%\requirements.txt" (
    echo.
    echo [WARNING] requirements.txt not found at:
    echo           %AUTO_CLAUDE_SOURCE%
    echo.
    echo This may cause "Python environment not ready" errors.
    echo.
    pause
)

:: ============================================================
:: START GRAPHITI CONTAINERS (if Docker is running)
:: ============================================================

where docker >nul 2>&1
if %errorlevel% equ 0 (
    :: Check if Docker daemon is running
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo.
        echo [DOCKER] Checking Graphiti containers...

        :: Start FalkorDB if not running
        docker ps --format "{{.Names}}" | findstr /C:"falkordb" >nul 2>&1
        if %errorlevel% neq 0 (
            :: Check if container exists but stopped
            docker ps -a --format "{{.Names}}" | findstr /C:"falkordb" >nul 2>&1
            if %errorlevel% equ 0 (
                echo [DOCKER] Starting FalkorDB...
                docker start falkordb >nul 2>&1
            ) else (
                echo [DOCKER] Creating FalkorDB container...
                docker run -d -p 6381:6379 --name falkordb falkordb/falkordb:latest >nul 2>&1
            )
            timeout /t 2 >nul
        )

        :: Verify FalkorDB is running
        docker ps --format "{{.Names}}" | findstr /C:"falkordb" >nul 2>&1
        if %errorlevel% equ 0 (
            echo [OK] FalkorDB running on port 6381
        ) else (
            echo [INFO] FalkorDB not running - Graphiti memory disabled
        )
    ) else (
        echo [INFO] Docker not running - Graphiti memory disabled
        echo        Start Docker Desktop to enable cross-session memory
    )
) else (
    echo [INFO] Docker not installed - Graphiti memory disabled
)

:: ============================================================
:: LAUNCH THE DEVELOPMENT SERVER
:: ============================================================

echo.
echo ============================================================
echo   LAUNCHING AUTO-CLAUDE UI (Development Server)
echo ============================================================
echo.
echo The application will open in a new window.
echo This window will show the development server logs.
echo.
echo To add a project:
echo   1. Click "Add Project" in the app
echo   2. Browse to your project folder
echo   3. Create tasks from the Kanban board
echo.
echo IMPORTANT: Do not close this window while using the app!
echo.
echo Press Ctrl+C to stop the development server when done.
echo.
echo ============================================================
echo.

cd "%UI_DIR%"
call npm run dev

:: Return to root directory on exit
cd ..
