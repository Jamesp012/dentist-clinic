@echo off
echo Starting Dental Clinic Backend Server...
cd /d "%~dp0backend"
echo Current directory: %cd%
echo.
echo Starting Node.js server on port 5000...
node server.js
pause
