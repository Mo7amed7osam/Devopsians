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

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Docker Desktop is not running! Please start Docker Desktop.
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

REM Determine compose file
for /f "usebackq tokens=1,2 delims==" %%a in (`.env`) do (
    if "%%a"=="DEPLOY_ENV" set DEPLOY_ENV=%%b
)

if "%DEPLOY_ENV%"=="development" (
    set COMPOSE_FILE=docker-compose.local.yml
    echo %INFO% Using LOCAL compose file for development
) else if "%DEPLOY_ENV%"=="production" (
    set COMPOSE_FILE=docker-compose.production.yml
    echo %INFO% Using PRODUCTION compose file
) else (
    set COMPOSE_FILE=docker-compose.yml
    echo %INFO% Using default compose file
)
REM Show status
echo %INFO% Container Status:
docker compose -f %COMPOSE_FILE% ps 2>nul || docker-compose -f %COMPOSE_FILE% ps

echo.
echo %INFO% Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

docker compose -f %COMPOSE_FILE% ps 2>nul || docker-compose -f %COMPOSE_FILE% ps
echo %SUCCESS% Images ready

REM Stop containers
echo %INFO% Stopping existing containers...
docker compose -f %COMPOSE_FILE% down 2>nul || docker-compose -f %COMPOSE_FILE% down
echo %SUCCESS% Containers stopped

REM Start containers
echo %INFO% Starting containers...
docker compose -f %COMPOSE_FILE% up -d 2>nul || docker-compose -f %COMPOSE_FILE% up -d
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
for /f "usebackq tokens=1,2 delims==" %%a in (`.env`) do (
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
    docker compose -f %COMPOSE_FILE% logs -f 2>nul || docker-compose -f %COMPOSE_FILE% logs -f
)

endlocal
