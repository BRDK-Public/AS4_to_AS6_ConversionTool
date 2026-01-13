@echo off
REM Start the AS4 to AS6 Converter Web Server
REM This batch file starts a Python HTTP server on port 8000

cd /d "%~dp0"

echo Starting AS4 to AS6 Converter Web Server...
echo Server will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server.
echo.

python -m http.server 8000 --directory .

pause
