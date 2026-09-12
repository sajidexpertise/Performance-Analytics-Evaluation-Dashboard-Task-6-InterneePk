@echo off
setlocal
cd /d "%~dp0"
title Task 6 - Intern Performance Analytics

if /I "%~1"=="server" goto SERVER

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%CD%\index.html"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%CD%\index.html"
  exit /b 0
)
start "" "%CD%\index.html"
exit /b 0

:SERVER
set "PYTHON_CMD="
if exist "C:\Python314\python.exe" set "PYTHON_CMD=C:\Python314\python.exe"
if not defined PYTHON_CMD where python >nul 2>&1 && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where py >nul 2>&1 && set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
  echo.
  echo Python was not found.
  echo The dashboard itself does NOT require Python. Double-click index.html instead.
  echo For server mode, install Python or make sure C:\Python314\python.exe exists.
  echo.
  pause
  exit /b 1
)

echo Starting local dashboard server at http://localhost:8765/
start "Task 6 Dashboard Server" cmd /k "%PYTHON_CMD% -m http.server 8765"
timeout /t 2 /nobreak >nul
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "http://localhost:8765/"
) else (
  start "" "http://localhost:8765/"
)
exit /b 0
