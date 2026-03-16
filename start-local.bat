@echo off
setlocal

cd /d "%~dp0"

echo Installing dependencies...
set "PATH=%PATH%;C:\Program Files\nodejs"
call npm install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)

echo Starting Expo web...
call npm run web
if errorlevel 1 (
  echo npm run web failed.
  exit /b 1
)

endlocal
