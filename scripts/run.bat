@echo off
REM Wrapper script called by Windows Task Scheduler (or by double-clicking).
REM Always changes to the project root folder first, runs the check, and
REM appends the output to logs\check.log so you can look back later and see
REM whether the last run actually succeeded and how many jobs it found.

setlocal

cd /d "%~dp0.."

if not exist logs mkdir logs

echo ===== %date% %time% START ===== >> logs\check.log
call npm run check >> logs\check.log 2>&1
echo ===== %date% %time% DONE ===== >> logs\check.log

endlocal
