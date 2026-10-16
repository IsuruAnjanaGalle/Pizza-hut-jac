@echo off
echo ===================================================
echo Starting Pizza Hut Jac Backend Server on port 8000
echo ===================================================
cd /d "%~dp0backend"
jac run --serve --no-client --port 8000 main.jac
pause
