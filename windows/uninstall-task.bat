@echo off
chcp 65001 >nul
REM 移除之前安裝的 Windows 排程。
REM 用法：滑鼠雙擊這個檔案就可以了。

setlocal

set "TASK_NAME=104-job-tracker"

schtasks /delete /tn "%TASK_NAME%" /f

echo.
echo 已移除排程。
pause

endlocal
