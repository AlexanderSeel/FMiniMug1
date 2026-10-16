@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-FMiniMug1-Beta.ps1"
if errorlevel 1 (
  echo.
  echo FMiniMug1 Beta installation failed.
  pause
  exit /b 1
)
endlocal
