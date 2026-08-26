@echo off
chcp 65001 >nul
REM 把排程安裝到你的 Windows 電腦（只需要執行一次）。
REM 用法：滑鼠雙擊這個檔案就可以了，或是在命令提示字元裡 cd 到專案資料夾後執行：
REM   windows\install-task.bat

setlocal

set "TASK_NAME=104-job-tracker"
set "SCRIPT_PATH=%~dp0..\scripts\run.bat"

schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc hourly /mo 1 /st 00:05 /f

if errorlevel 1 (
  echo.
  echo 安裝失敗，請看看上面的錯誤訊息。
  pause
  exit /b 1
)

REM 剛裝好先手動跑一次，方便馬上確認有沒有正常運作
schtasks /run /tn "%TASK_NAME%"

echo.
echo 已安裝排程！之後每小時的第5分會自動執行一次（現在也會馬上先跑一次測試）。
echo 確認方式：
echo   打開「工作排程器」(Task Scheduler)，左側「工作排程器程式庫」找 %TASK_NAME%
echo   或在命令提示字元打：schtasks /query /tn "%TASK_NAME%"
echo   看實際執行結果（抓到幾筆、有沒有報錯）：用記事本打開 logs\check.log
echo.
echo 如果之後想移除排程：
echo   雙擊 windows\uninstall-task.bat
echo   或在命令提示字元打：schtasks /delete /tn "%TASK_NAME%" /f
echo.
pause

endlocal
