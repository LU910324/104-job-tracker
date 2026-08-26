@echo off
REM 給 Windows 工作排程器（或你自己手動雙擊）呼叫的執行包裝批次檔。
REM 不管從哪裡呼叫，都會先切換到專案根目錄，執行檢查，並把輸出寫進 logs\check.log
REM 方便之後回頭查「上次到底有沒有跑成功、抓到幾筆」。

setlocal

cd /d "%~dp0.."

if not exist logs mkdir logs

echo ===== %date% %time% 開始執行 ===== >> logs\check.log
call npm run check >> logs\check.log 2>&1
echo ===== %date% %time% 執行完成 ===== >> logs\check.log

endlocal
