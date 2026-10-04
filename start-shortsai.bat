@echo off
cd /d C:\Users\CAN804\ShortsAI_CLEAN

set RETRY=0
set MAX_RETRY=5

:START
echo.
echo ========================================
echo SHORTSAI START
echo ========================================

call npm start
set EXITCODE=%ERRORLEVEL%

echo.
echo SHORTSAI EXIT CODE: %EXITCODE%

if "%EXITCODE%"=="0" goto STOP
if "%EXITCODE%"=="3221225786" goto STOP
if "%EXITCODE%"=="-1073741510" goto STOP

set /a RETRY+=1
if %RETRY% GTR %MAX_RETRY% goto GIVEUP

echo SHORTSAI ERROR - RESTART %RETRY%/%MAX_RETRY%
echo WAIT 60 SECONDS
timeout /t 60 /nobreak >nul
goto START

:STOP
echo SHORTSAI STOPPED - NO RESTART
exit /b 0

:GIVEUP
echo SHORTSAI AUTO RECOVERY FAILED
exit /b 1
