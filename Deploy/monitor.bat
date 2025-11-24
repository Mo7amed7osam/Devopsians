@echo off
REM ===============================================
REM Service Monitor Script for Windows
REM ===============================================

cls

echo ==========================================
echo   Devopsians Service Monitor
echo ==========================================
echo.

REM Check if services are running
docker compose ps 2>nul | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] No services running
    echo.
    echo Start services with: deploy.bat
    exit /b 1
)

REM Load environment
set FRONTEND_PORT=80
set BACKEND_PORT=3030
set MONGO_PORT=27017
set DEPLOY_ENV=unknown

if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="FRONTEND_PORT" set FRONTEND_PORT=%%b
        if "%%a"=="BACKEND_PORT" set BACKEND_PORT=%%b
        if "%%a"=="MONGO_PORT" set MONGO_PORT=%%b
        if "%%a"=="DEPLOY_ENV" set DEPLOY_ENV=%%b
    )
)

echo Environment: %DEPLOY_ENV%
echo.

REM Service Status
echo ==========================================
echo   Service Status
echo ==========================================
docker compose ps
echo.

REM Health Checks
echo ==========================================
echo   Health Status
echo ==========================================

REM Backend Health
echo Backend API:      
curl -s -o nul -w "%%{http_code}" http://localhost:%BACKEND_PORT%/health 2>nul | findstr "200" >nul
if errorlevel 1 (
    echo [UNHEALTHY]
) else (
    echo [HEALTHY]
)

REM Frontend Health
echo Frontend:         
curl -s -o nul -w "%%{http_code}" http://localhost:%FRONTEND_PORT%/ 2>nul | findstr "200" >nul
if errorlevel 1 (
    echo [UNHEALTHY]
) else (
    echo [HEALTHY]
)

echo.

REM URLs
echo ==========================================
echo   Access URLs
echo ==========================================
echo Frontend:  http://localhost:%FRONTEND_PORT%
echo Backend:   http://localhost:%BACKEND_PORT%
echo Health:    http://localhost:%BACKEND_PORT%/health
echo MongoDB:   mongodb://localhost:%MONGO_PORT%
echo.

REM Resource Usage
echo ==========================================
echo   Resource Usage
echo ==========================================
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>nul | findstr devopsians
echo.

REM Recent Logs
echo ==========================================
echo   Recent Activity
echo ==========================================
echo.
echo [Backend]
docker compose logs --tail=3 backend 2>nul
echo.
echo [Frontend]
docker compose logs --tail=3 frontend 2>nul
echo.

REM Commands
echo ==========================================
echo   Quick Commands
echo ==========================================
echo   View logs:      docker compose logs -f
echo   Restart:        docker compose restart
echo   Stop:           docker compose down
echo   Redeploy:       deploy.bat
echo ==========================================

pause
