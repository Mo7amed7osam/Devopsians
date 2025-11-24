@echo off
REM ===============================================
REM Quick Environment Switcher for Windows
REM ===============================================

echo.
echo ==========================================
echo   Environment Switcher
echo ==========================================
echo.
echo Select environment:
echo   1^) Development
echo   2^) Staging
echo   3^) Production
echo.

set /p choice="Enter choice (1-3): "

if "%choice%"=="1" set ENV=development
if "%choice%"=="2" set ENV=staging
if "%choice%"=="3" set ENV=production

if not defined ENV (
    echo Invalid choice
    exit /b 1
)

if exist .env.%ENV% (
    copy .env.%ENV% .env >nul
    echo [SUCCESS] Switched to %ENV% environment
    echo.
    echo Current configuration:
    findstr /B "DEPLOY_ENV NODE_ENV FRONTEND_PORT BACKEND_PORT" .env
    echo.
    echo Run deployment:
    echo   deploy.bat
) else (
    echo [ERROR] Environment file .env.%ENV% not found!
    exit /b 1
)
