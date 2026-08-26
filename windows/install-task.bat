@echo off
REM Installs the hourly schedule on your Windows computer (run this once).
REM Usage: double-click this file, or from Command Prompt after cd-ing into
REM the project folder: windows\install-task.bat

setlocal

set "TASK_NAME=104-job-tracker"
set "SCRIPT_PATH=%~dp0..\scripts\run.bat"

schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc hourly /mo 1 /st 00:05 /f

if errorlevel 1 (
  echo.
  echo Install failed - please check the error message above.
  pause
  exit /b 1
)

REM Run it once immediately so you can confirm right away that it works.
schtasks /run /tn "%TASK_NAME%"

echo.
echo Schedule installed! From now on it will run automatically every hour
echo at minute 5 (it is also running once right now as a test).
echo.
echo To check on it:
echo   Open "Task Scheduler", look under "Task Scheduler Library" for %TASK_NAME%
echo   Or in Command Prompt: schtasks /query /tn "%TASK_NAME%"
echo   To see the actual results (how many jobs found, any errors):
echo   open logs\check.log with Notepad
echo.
echo To remove the schedule later:
echo   Double-click windows\uninstall-task.bat
echo   Or in Command Prompt: schtasks /delete /tn "%TASK_NAME%" /f
echo.
pause

endlocal
