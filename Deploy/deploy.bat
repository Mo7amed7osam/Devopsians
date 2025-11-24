@echo off
REM ===============================================
REM Devopsians Deployment Script for Windows
REM ===============================================

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo   Devopsians Deployment Script
echo ==========================================
echo.

REM Colors simulation
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Detect environment
:detect_environment
echo %INFO% Detecting deployment environment...

if not exist .env (
    echo %WARNING% .env file not found!
    
    REM Detect based on hostname
    for /f "tokens=*" %%a in ('hostname') do set HOSTNAME=%%a
    
    echo !HOSTNAME! | findstr /i "prod production" >nul
    if !errorlevel! equ 0 (
        set DETECTED_ENV=production
    ) else (
        echo !HOSTNAME! | findstr /i "staging stg" >nul
        if !errorlevel! equ 0 (
            set DETECTED_ENV=staging
        ) else (
            set DETECTED_ENV=development
        )
    )
    
    echo %INFO% Detected environment: !DETECTED_ENV!
    
    set /p confirm="Use !DETECTED_ENV! environment? (y/n) [default: y]: "
    if "!confirm!"=="" set confirm=y
    
    if /i "!confirm!"=="y" (
        set ENV_FILE=.env.!DETECTED_ENV!
    ) else (
        set /p user_env="Enter environment (development/staging/production): "
        set ENV_FILE=.env.!user_env!
    )
    
    if exist !ENV_FILE! (
        echo %INFO% Copying !ENV_FILE! to .env
        copy !ENV_FILE! .env >nul
    ) else (
        echo %ERROR% Environment file !ENV_FILE! not found!
        echo %INFO% Please create .env file manually or copy from .env.example
        exit /b 1
    )
) else (
    echo %SUCCESS% Found existing .env file
)

REM Check prerequisites
:check_prerequisites
echo %INFO% Checking prerequisites...

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Docker is not installed!
    exit /b 1
)

docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    docker-compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo %ERROR% Docker Compose is not installed!
        exit /b 1
    )
)

echo %SUCCESS% Prerequisites check passed

REM Pull images
echo %INFO% Pulling latest Docker images...
docker compose pull 2>nul || docker-compose pull
echo %SUCCESS% Images pulled successfully

REM Stop containers
echo %INFO% Stopping existing containers...
docker compose down 2>nul || docker-compose down
echo %SUCCESS% Containers stopped

REM Start containers
echo %INFO% Starting containers...
docker compose up -d 2>nul || docker-compose up -d
echo %SUCCESS% Containers started successfully

REM Show status
echo %INFO% Container Status:
docker compose ps 2>nul || docker-compose ps

echo.
echo %INFO% Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

docker compose ps 2>nul || docker-compose ps

echo.
echo %SUCCESS% Deployment completed!
echo.
echo %INFO% Access your application:

REM Read .env to show URLs
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="FRONTEND_PORT" set FRONTEND_PORT=%%b
    if "%%a"=="BACKEND_PORT" set BACKEND_PORT=%%b
    if "%%a"=="MONGO_PORT" set MONGO_PORT=%%b
)

if not defined FRONTEND_PORT set FRONTEND_PORT=80
if not defined BACKEND_PORT set BACKEND_PORT=3030
if not defined MONGO_PORT set MONGO_PORT=27017

echo   Frontend: http://localhost:%FRONTEND_PORT%
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   MongoDB:  mongodb://localhost:%MONGO_PORT%
echo.

REM Check if logs should be shown
if "%1"=="--logs" (
    echo %INFO% Showing logs (Ctrl+C to exit)...
    docker compose logs -f 2>nul || docker-compose logs -f
)

endlocal
