#!/bin/bash
# 給 launchd（或你自己手動）呼叫的執行包裝腳本。
# 不管從哪裡呼叫，都會先切換到專案根目錄，執行檢查，並把輸出寫進 logs/check.log
# 方便之後回頭查「上次到底有沒有跑成功、抓到幾筆」。

set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p logs
{
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') 開始執行 ====="
  npm run check
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') 執行完成 ====="
} >> logs/check.log 2>&1
