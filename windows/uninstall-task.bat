@echo off
REM Removes the previously installed Windows schedule.
REM Usage: double-click this file.

setlocal

set "TASK_NAME=104-job-tracker"

schtasks /delete /tn "%TASK_NAME%" /f

echo.
echo Schedule removed.
pause

endlocal
