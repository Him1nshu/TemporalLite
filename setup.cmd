@echo off
setlocal

cd /d "%~dp0"

echo [1/3] Checking required tools...
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found. Install Node.js 20 or newer and try again.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm was not found. Reinstall Node.js with npm enabled and try again.
  exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker was not found. Install Docker Desktop and try again.
  exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker Compose is not available. Enable Docker Compose in Docker Desktop.
  exit /b 1
)

echo [2/3] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  exit /b 1
)

if not exist ".env" (
  echo Creating .env from .env.example...
  copy /y ".env.example" ".env" >nul
  if errorlevel 1 (
    echo ERROR: Could not create .env.
    exit /b 1
  )
) else (
  echo Keeping existing .env.
)

echo [3/3] Starting PostgreSQL...
docker compose up -d postgres
if errorlevel 1 (
  echo ERROR: PostgreSQL could not be started.
  exit /b 1
)

echo.
echo Setup complete.
echo Start the API with: npm run dev
echo API URL: http://localhost:3000
echo PostgreSQL: localhost:55432
exit /b 0
