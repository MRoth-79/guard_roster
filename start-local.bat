@echo off
cd /d "%~dp0"
echo.
echo ========================================
echo   Guard Roster - local server
echo   Open: http://localhost:8765
echo   (Do NOT use origin.cursor.com for testing)
echo ========================================
echo.
start "" "http://localhost:8765/"
where py >nul 2>&1 && (py -m http.server 8765 & goto :done)
where python >nul 2>&1 && (python -m http.server 8765 & goto :done)
echo ERROR: Python not found. Install Python or open index.html via a local server.
pause
:done
