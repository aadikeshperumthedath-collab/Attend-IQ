@echo off
title AttendIQ — Smart Student Attendance Command Center
echo ========================================================
echo   Launching AttendIQ Command Center...
echo ========================================================

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python serve.py
    goto end
)

if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" serve.py
    goto end
)

echo Python not found in PATH. Opening index.html directly in browser...
start index.html

:end
pause
